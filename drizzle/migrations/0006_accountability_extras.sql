-- Duplicate status
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('Submitted','Received','In Progress','Fixed','Rejected','Duplicate'));

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS citizen_comment text CHECK (char_length(citizen_comment) <= 1000),
  ADD COLUMN IF NOT EXISTS confirmed_fixed boolean,
  ADD COLUMN IF NOT EXISTS repair_image_url text,
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS good_threshold integer NOT NULL DEFAULT 85 CHECK (good_threshold BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS poor_threshold integer NOT NULL DEFAULT 60 CHECK (poor_threshold BETWEEN 0 AND 100);

-- Deadline rules per area and/or severity
CREATE TABLE public.deadline_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid REFERENCES public.areas(id) ON DELETE CASCADE,
  severity text CHECK (severity IN ('Low','Medium','High','Critical')),
  days integer NOT NULL CHECK (days BETWEEN 1 AND 365),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (area_id IS NOT NULL OR severity IS NOT NULL),
  UNIQUE NULLS NOT DISTINCT (area_id, severity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadline_rules TO authenticated;
GRANT ALL ON public.deadline_rules TO service_role;
ALTER TABLE public.deadline_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in reads deadline rules" ON public.deadline_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage deadline rules" ON public.deadline_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  link text,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON public.audit_log (created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d jsonb;
BEGIN
  IF TG_TABLE_NAME = 'reports' THEN
    IF NEW.assigned_admin_id IS NOT DISTINCT FROM OLD.assigned_admin_id
       AND NEW.area_id IS NOT DISTINCT FROM OLD.area_id
       AND NEW.deadline_at IS NOT DISTINCT FROM OLD.deadline_at THEN
      RETURN NEW;
    END IF;
    d = jsonb_build_object('report', NEW.report_number,
      'from_admin', OLD.assigned_admin_id, 'to_admin', NEW.assigned_admin_id,
      'from_area', OLD.area_id, 'to_area', NEW.area_id,
      'from_deadline', OLD.deadline_at, 'to_deadline', NEW.deadline_at);
    INSERT INTO public.audit_log (actor_id, action, details) VALUES (auth.uid(), 'Complaint reassigned / deadline changed', d);
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.account_status IS NOT DISTINCT FROM OLD.account_status THEN RETURN NEW; END IF;
    INSERT INTO public.audit_log (actor_id, action, details)
    VALUES (auth.uid(), 'Account status changed', jsonb_build_object('user', NEW.email, 'from', OLD.account_status, 'to', NEW.account_status));
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_log (actor_id, action, details)
  VALUES (auth.uid(), TG_TABLE_NAME || ' ' || lower(TG_OP),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_area_admins AFTER INSERT OR UPDATE OR DELETE ON public.area_admins FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_area_admin_areas AFTER INSERT OR DELETE ON public.area_admin_areas FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_app_settings AFTER UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_deadline_rules AFTER INSERT OR UPDATE OR DELETE ON public.deadline_rules FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_admin_warnings AFTER INSERT ON public.admin_warnings FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_reports_assign AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_profiles_status AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Deadline lookup: area+severity, area, severity, default
CREATE OR REPLACE FUNCTION public.deadline_days_for(_area uuid, _severity text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT days FROM public.deadline_rules WHERE area_id = _area AND severity = _severity),
    (SELECT days FROM public.deadline_rules WHERE area_id = _area AND severity IS NULL),
    (SELECT days FROM public.deadline_rules WHERE area_id IS NULL AND severity = _severity),
    (SELECT default_deadline_days FROM public.app_settings WHERE id = 1),
    7)
$$;

CREATE OR REPLACE FUNCTION public.route_new_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status = 'Submitted';
  NEW.citizen_rating = NULL; NEW.rated_at = NULL;
  NEW.citizen_comment = NULL; NEW.confirmed_fixed = NULL; NEW.repair_image_url = NULL; NEW.overdue_notified_at = NULL;
  NEW.deadline_at = now() + make_interval(days => public.deadline_days_for(NEW.area_id, NEW.severity));
  NEW.assigned_admin_id = NULL;
  IF NEW.area_id IS NOT NULL THEN
    SELECT aaa.admin_id INTO NEW.assigned_admin_id
    FROM public.area_admin_areas aaa
    WHERE aaa.area_id = NEW.area_id AND public.is_area_admin(aaa.admin_id)
    ORDER BY (SELECT count(*) FROM public.reports r
              WHERE r.assigned_admin_id = aaa.admin_id AND r.status NOT IN ('Fixed','Rejected','Duplicate')) ASC,
             aaa.admin_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_report_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR auth.uid() = OLD.user_id THEN
    RETURN NEW;
  END IF;
  NEW.user_id = OLD.user_id; NEW.area_id = OLD.area_id; NEW.assigned_admin_id = OLD.assigned_admin_id;
  NEW.deadline_at = OLD.deadline_at; NEW.citizen_rating = OLD.citizen_rating; NEW.rated_at = OLD.rated_at;
  NEW.citizen_comment = OLD.citizen_comment; NEW.confirmed_fixed = OLD.confirmed_fixed;
  NEW.overdue_notified_at = OLD.overdue_notified_at;
  NEW.severity = OLD.severity; NEW.pothole_count = OLD.pothole_count; NEW.created_at = OLD.created_at;
  NEW.original_image_url = OLD.original_image_url; NEW.annotated_image_url = OLD.annotated_image_url;
  NEW.submitter_name = OLD.submitter_name; NEW.submitter_email = OLD.submitter_email;
  RETURN NEW;
END;
$$;

-- Notifications on new complaint / status change / reassignment
CREATE OR REPLACE FUNCTION public.notify_report_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, report_id, link)
      VALUES (NEW.assigned_admin_id, 'New complaint ' || NEW.report_number,
        NEW.severity || ' severity at ' || COALESCE(NULLIF(NEW.address, ''), 'an unknown address'),
        NEW.id, '/admin/reports/' || NEW.id);
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, report_id, link)
    VALUES (NEW.user_id,
      CASE WHEN NEW.status = 'Fixed' THEN NEW.report_number || ' is fixed — please rate it'
           ELSE NEW.report_number || ' is now ' || NEW.status END,
      CASE WHEN NEW.status = 'Fixed' THEN 'Confirm the repair and rate how well and how fast it was done.'
           ELSE COALESCE(NEW.admin_notes, '') END,
      NEW.id, '/reports/' || NEW.id);
  END IF;
  IF NEW.assigned_admin_id IS DISTINCT FROM OLD.assigned_admin_id AND NEW.assigned_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, report_id, link)
    VALUES (NEW.assigned_admin_id, 'Complaint ' || NEW.report_number || ' assigned to you',
      NEW.severity || ' severity', NEW.id, '/admin/reports/' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_notify AFTER INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_report_events();

-- Performance (closed = Fixed/Rejected/Duplicate)
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
      count(*) FILTER (WHERE status NOT IN ('Fixed','Rejected','Duplicate') AND deadline_at < now())::int AS overdue,
      count(*) FILTER (WHERE status = 'Fixed' OR (status NOT IN ('Rejected','Duplicate') AND deadline_at < now()))::int AS due,
      avg(citizen_rating)::numeric AS avg_rating,
      count(citizen_rating)::int AS rating_count
    FROM r)
  SELECT s.total, s.fixed, s.on_time, s.overdue,
    CASE WHEN s.due = 0 THEN NULL ELSE round(s.on_time * 100.0 / s.due, 1) END,
    round(s.avg_rating, 2), s.rating_count
  FROM s;
END;
$$;

-- Overdue sweep: notifies assigned admin + super admins once per complaint, alerts on poor band
CREATE OR REPLACE FUNCTION public.sync_overdue()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec record; n integer := 0; poor integer; rate numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(), 'admin') OR public.is_area_admin(auth.uid())) THEN
    RETURN 0;
  END IF;
  SELECT poor_threshold INTO poor FROM public.app_settings WHERE id = 1;
  FOR rec IN SELECT * FROM public.reports
    WHERE status NOT IN ('Fixed','Rejected','Duplicate') AND deadline_at < now() AND overdue_notified_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.reports SET overdue_notified_at = now() WHERE id = rec.id;
    IF rec.assigned_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, report_id, link)
      VALUES (rec.assigned_admin_id, rec.report_number || ' is overdue', 'The fix deadline has passed. This lowers your on-time rate.', rec.id, '/admin/reports/' || rec.id);
    END IF;
    INSERT INTO public.notifications (user_id, title, body, report_id, link)
    SELECT ur.user_id, rec.report_number || ' is overdue', 'Deadline passed without a fix.', rec.id, '/admin/reports/' || rec.id
    FROM public.user_roles ur WHERE ur.role = 'admin';
    IF rec.assigned_admin_id IS NOT NULL THEN
      WITH r AS (SELECT * FROM public.reports WHERE assigned_admin_id = rec.assigned_admin_id)
      SELECT CASE WHEN count(*) FILTER (WHERE status = 'Fixed' OR (status NOT IN ('Rejected','Duplicate') AND deadline_at < now())) = 0 THEN NULL
        ELSE count(*) FILTER (WHERE status = 'Fixed' AND resolved_at <= deadline_at) * 100.0
           / count(*) FILTER (WHERE status = 'Fixed' OR (status NOT IN ('Rejected','Duplicate') AND deadline_at < now())) END
      INTO rate FROM r;
      IF rate IS NOT NULL AND rate < COALESCE(poor, 60) THEN
        INSERT INTO public.notifications (user_id, title, body, link, dedupe_key)
        SELECT ur.user_id, 'Area admin below the poor threshold',
          COALESCE((SELECT NULLIF(full_name, '') FROM public.profiles WHERE id = rec.assigned_admin_id), 'An area admin')
            || ' is at ' || round(rate, 1) || '% on time.', '/admin/area-admins',
          'poor-' || rec.assigned_admin_id || '-' || ur.user_id || '-' || to_char(now(), 'YYYY-MM-DD')
        FROM public.user_roles ur WHERE ur.role = 'admin'
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_overdue() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_overdue() TO authenticated;

-- Rating with comment and confirmation
CREATE OR REPLACE FUNCTION public.submit_feedback(_report_id uuid, _rating integer, _confirmed boolean, _comment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  IF char_length(COALESCE(_comment, '')) > 1000 THEN RAISE EXCEPTION 'Comment is too long'; END IF;
  UPDATE public.reports SET citizen_rating = _rating, rated_at = now(),
    confirmed_fixed = _confirmed, citizen_comment = NULLIF(trim(COALESCE(_comment, '')), '')
  WHERE id = _report_id AND user_id = auth.uid() AND status = 'Fixed' AND citizen_rating IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'You can only rate your own fixed complaints once'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_feedback(uuid, integer, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback(uuid, integer, boolean, text) TO authenticated;

-- Public per-area aggregates (no personal data)
CREATE OR REPLACE FUNCTION public.public_area_stats()
RETURNS TABLE (area_name text, filed integer, fixed integer, avg_fix_days numeric, on_time_rate numeric, avg_rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.name,
    count(r.id)::int,
    count(r.id) FILTER (WHERE r.status = 'Fixed')::int,
    round(avg(extract(epoch FROM (r.resolved_at - r.created_at)) / 86400) FILTER (WHERE r.status = 'Fixed'), 1),
    CASE WHEN count(r.id) FILTER (WHERE r.status = 'Fixed' OR (r.status NOT IN ('Rejected','Duplicate') AND r.deadline_at < now())) = 0 THEN NULL
      ELSE round(count(r.id) FILTER (WHERE r.status = 'Fixed' AND r.resolved_at <= r.deadline_at) * 100.0
        / count(r.id) FILTER (WHERE r.status = 'Fixed' OR (r.status NOT IN ('Rejected','Duplicate') AND r.deadline_at < now())), 1) END,
    round(avg(r.citizen_rating), 2)
  FROM public.areas a LEFT JOIN public.reports r ON r.area_id = a.id
  GROUP BY a.name ORDER BY a.name
$$;
GRANT EXECUTE ON FUNCTION public.public_area_stats() TO anon, authenticated;

-- Repair photos: stored in report-annotated-images under repair/
CREATE POLICY "Admins upload repair photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-annotated-images' AND (storage.foldername(name))[1] = 'repair'
    AND (public.has_role(auth.uid(), 'admin') OR public.is_area_admin(auth.uid())));
CREATE POLICY "Read repair photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-annotated-images' AND (storage.foldername(name))[1] = 'repair'
    AND EXISTS (SELECT 1 FROM public.reports r WHERE r.repair_image_url = 'report-annotated-images/' || name
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
           OR public.can_manage_report(auth.uid(), r.area_id, r.assigned_admin_id))));
