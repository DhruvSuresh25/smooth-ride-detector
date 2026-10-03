-- Areas
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Area admins (membership marks a staff account as an area admin)
CREATE TABLE public.area_admins (
  user_id uuid PRIMARY KEY,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.area_admins TO authenticated;
GRANT ALL ON public.area_admins TO service_role;
ALTER TABLE public.area_admins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.area_admin_areas (
  admin_id uuid NOT NULL REFERENCES public.area_admins(user_id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_id, area_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.area_admin_areas TO authenticated;
GRANT ALL ON public.area_admin_areas TO service_role;
ALTER TABLE public.area_admin_areas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_deadline_days integer NOT NULL DEFAULT 7 CHECK (default_deadline_days BETWEEN 1 AND 365),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.admin_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.area_admins(user_id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_warnings TO authenticated;
GRANT ALL ON public.admin_warnings TO service_role;
ALTER TABLE public.admin_warnings ENABLE ROW LEVEL SECURITY;

-- Report columns
ALTER TABLE public.reports
  ADD COLUMN area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  ADD COLUMN assigned_admin_id uuid,
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN citizen_rating smallint CHECK (citizen_rating BETWEEN 1 AND 5),
  ADD COLUMN rated_at timestamptz;
CREATE INDEX reports_area_id_idx ON public.reports (area_id);
CREATE INDEX reports_assigned_admin_idx ON public.reports (assigned_admin_id);

-- New status vocabulary (legacy values mapped, nothing deleted)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
UPDATE public.reports SET status = CASE status
  WHEN 'Pending' THEN 'Submitted' WHEN 'Under Review' THEN 'Received'
  WHEN 'Action Taken' THEN 'In Progress' WHEN 'Resolved' THEN 'Fixed' ELSE status END;
UPDATE public.report_status_history SET status = CASE status
  WHEN 'Pending' THEN 'Submitted' WHEN 'Under Review' THEN 'Received'
  WHEN 'Action Taken' THEN 'In Progress' WHEN 'Resolved' THEN 'Fixed' ELSE status END;
UPDATE public.reports SET deadline_at = created_at + interval '7 days' WHERE deadline_at IS NULL;
ALTER TABLE public.reports ALTER COLUMN status SET DEFAULT 'Submitted';
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('Submitted','Received','In Progress','Fixed','Rejected'));

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_area_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.area_admins a JOIN public.profiles p ON p.id = a.user_id
    WHERE a.user_id = _user_id AND p.account_status = 'Active'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_report(_user_id uuid, _area_id uuid, _assigned uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_area_admin(_user_id) AND (
    _assigned = _user_id OR EXISTS (
      SELECT 1 FROM public.area_admin_areas WHERE admin_id = _user_id AND area_id = _area_id
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.normalize_report_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.status = CASE NEW.status
    WHEN 'Pending' THEN 'Submitted' WHEN 'Under Review' THEN 'Received'
    WHEN 'Action Taken' THEN 'In Progress' WHEN 'Resolved' THEN 'Fixed' ELSE NEW.status END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_normalize_status BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.normalize_report_status();

CREATE OR REPLACE FUNCTION public.normalize_history_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.status = CASE NEW.status
    WHEN 'Pending' THEN 'Submitted' WHEN 'Under Review' THEN 'Received'
    WHEN 'Action Taken' THEN 'In Progress' WHEN 'Resolved' THEN 'Fixed' ELSE NEW.status END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER history_normalize_status BEFORE INSERT ON public.report_status_history
  FOR EACH ROW EXECUTE FUNCTION public.normalize_history_status();

-- Routing + deadline on new reports
CREATE OR REPLACE FUNCTION public.route_new_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days integer;
BEGIN
  NEW.status = 'Submitted';
  NEW.citizen_rating = NULL; NEW.rated_at = NULL;
  SELECT default_deadline_days INTO days FROM public.app_settings WHERE id = 1;
  NEW.deadline_at = now() + make_interval(days => COALESCE(days, 7));
  NEW.assigned_admin_id = NULL;
  IF NEW.area_id IS NOT NULL THEN
    SELECT aaa.admin_id INTO NEW.assigned_admin_id
    FROM public.area_admin_areas aaa
    WHERE aaa.area_id = NEW.area_id AND public.is_area_admin(aaa.admin_id)
    ORDER BY (SELECT count(*) FROM public.reports r
              WHERE r.assigned_admin_id = aaa.admin_id AND r.status NOT IN ('Fixed','Rejected')) ASC,
             aaa.admin_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_route BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.route_new_report();

-- Area admins may only change status and notes
CREATE OR REPLACE FUNCTION public.guard_report_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR auth.uid() = OLD.user_id THEN
    RETURN NEW;
  END IF;
  NEW.user_id = OLD.user_id; NEW.area_id = OLD.area_id; NEW.assigned_admin_id = OLD.assigned_admin_id;
  NEW.deadline_at = OLD.deadline_at; NEW.citizen_rating = OLD.citizen_rating; NEW.rated_at = OLD.rated_at;
  NEW.severity = OLD.severity; NEW.pothole_count = OLD.pothole_count; NEW.created_at = OLD.created_at;
  NEW.original_image_url = OLD.original_image_url; NEW.annotated_image_url = OLD.annotated_image_url;
  NEW.submitter_name = OLD.submitter_name; NEW.submitter_email = OLD.submitter_email;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_guard BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_update();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_TABLE_NAME = 'reports' THEN
    IF NEW.status = 'Fixed' AND (OLD.status IS DISTINCT FROM 'Fixed') THEN
      NEW.resolved_at = now();
    ELSIF NEW.status <> 'Fixed' THEN
      NEW.resolved_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_report_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.report_status_history (report_id, status, note, changed_by)
  VALUES (NEW.id, 'Submitted', 'Report submitted by citizen', NEW.user_id);
  RETURN NEW;
END;
$$;

-- Citizen rating
CREATE OR REPLACE FUNCTION public.rate_report(_report_id uuid, _rating integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  UPDATE public.reports SET citizen_rating = _rating, rated_at = now()
  WHERE id = _report_id AND user_id = auth.uid() AND status = 'Fixed';
  IF NOT FOUND THEN RAISE EXCEPTION 'You can only rate your own fixed complaints'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_report(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rate_report(uuid, integer) TO authenticated;

-- Performance (aggregate only, no personal data)
CREATE OR REPLACE FUNCTION public.admin_performance(_admin_id uuid)
RETURNS TABLE (total integer, fixed integer, fixed_on_time integer, overdue integer, on_time_rate numeric, avg_rating numeric, rating_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = _admin_id OR EXISTS (
    SELECT 1 FROM public.reports WHERE user_id = auth.uid() AND assigned_admin_id = _admin_id)) THEN
    RETURN;
  END IF;
  RETURN QUERY
  WITH r AS (SELECT * FROM public.reports WHERE assigned_admin_id = _admin_id),
  s AS (
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status = 'Fixed')::int AS fixed,
      count(*) FILTER (WHERE status = 'Fixed' AND resolved_at <= deadline_at)::int AS on_time,
      count(*) FILTER (WHERE status NOT IN ('Fixed','Rejected') AND deadline_at < now())::int AS overdue,
      count(*) FILTER (WHERE status = 'Fixed' OR (status <> 'Rejected' AND deadline_at < now()))::int AS due,
      avg(citizen_rating)::numeric AS avg_rating,
      count(citizen_rating)::int AS rating_count
    FROM r)
  SELECT s.total, s.fixed, s.on_time, s.overdue,
    CASE WHEN s.due = 0 THEN NULL ELSE round(s.on_time * 100.0 / s.due, 1) END,
    round(s.avg_rating, 2), s.rating_count
  FROM s;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_performance(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_performance(uuid) TO authenticated;

-- Policies
CREATE POLICY "Anyone signed in reads areas" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage areas" ON public.areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admin or self reads area admin" ON public.area_admins FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "Super admins manage area admins" ON public.area_admins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admin or self reads assignments" ON public.area_admin_areas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR admin_id = auth.uid());
CREATE POLICY "Super admins manage assignments" ON public.area_admin_areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Signed in reads settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admin or warned admin reads warnings" ON public.admin_warnings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR admin_id = auth.uid());
CREATE POLICY "Super admins create warnings" ON public.admin_warnings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Area admins read area reports" ON public.reports FOR SELECT TO authenticated
  USING (public.can_manage_report(auth.uid(), area_id, assigned_admin_id));
CREATE POLICY "Area admins update area reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.can_manage_report(auth.uid(), area_id, assigned_admin_id))
  WITH CHECK (public.can_manage_report(auth.uid(), area_id, assigned_admin_id));

CREATE POLICY "Area admins read area history" ON public.report_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
    AND public.can_manage_report(auth.uid(), r.area_id, r.assigned_admin_id)));
CREATE POLICY "Area admins insert area history" ON public.report_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
    AND public.can_manage_report(auth.uid(), r.area_id, r.assigned_admin_id)));

CREATE POLICY "Area admins read area report originals" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-original-images' AND EXISTS (SELECT 1 FROM public.reports r
    WHERE r.original_image_url = 'report-original-images/' || name
    AND public.can_manage_report(auth.uid(), r.area_id, r.assigned_admin_id)));
CREATE POLICY "Area admins read area report annotated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-annotated-images' AND EXISTS (SELECT 1 FROM public.reports r
    WHERE r.annotated_image_url = 'report-annotated-images/' || name
    AND public.can_manage_report(auth.uid(), r.area_id, r.assigned_admin_id)));