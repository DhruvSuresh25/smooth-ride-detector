-- Areas get a centre point and radius so GPS can route complaints automatically.
ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS center_lat double precision,
  ADD COLUMN IF NOT EXISTS center_lng double precision,
  ADD COLUMN IF NOT EXISTS radius_km double precision NOT NULL DEFAULT 5;

UPDATE public.areas
SET name = 'KR Puram', center_lat = 13.0050, center_lng = 77.7150, radius_km = 6
WHERE lower(name) = 'kr puram';

-- Nearest area whose radius covers a GPS point.
CREATE OR REPLACE FUNCTION public.area_for_point(_lat double precision, _lng double precision)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT a.id
  FROM public.areas a
  WHERE a.center_lat IS NOT NULL AND a.center_lng IS NOT NULL
  ORDER BY (6371 * 2 * asin(sqrt(
      power(sin(radians(a.center_lat - _lat) / 2), 2) +
      cos(radians(_lat)) * cos(radians(a.center_lat)) *
      power(sin(radians(a.center_lng - _lng) / 2), 2)
    ))) ASC
  LIMIT 1
$fn$;

-- Only route when the point falls inside the area's radius.
CREATE OR REPLACE FUNCTION public.area_for_point_within(_lat double precision, _lng double precision)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT a.id
  FROM public.areas a
  WHERE a.center_lat IS NOT NULL AND a.center_lng IS NOT NULL
    AND (6371 * 2 * asin(sqrt(
      power(sin(radians(a.center_lat - _lat) / 2), 2) +
      cos(radians(_lat)) * cos(radians(a.center_lat)) *
      power(sin(radians(a.center_lng - _lng) / 2), 2)
    ))) <= a.radius_km
  ORDER BY (6371 * 2 * asin(sqrt(
      power(sin(radians(a.center_lat - _lat) / 2), 2) +
      cos(radians(_lat)) * cos(radians(a.center_lat)) *
      power(sin(radians(a.center_lng - _lng) / 2), 2)
    ))) ASC
  LIMIT 1
$fn$;

-- New reports: auto-detect the area from GPS before routing and deadlines.
CREATE OR REPLACE FUNCTION public.route_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  NEW.status = 'Submitted';
  NEW.citizen_rating = NULL; NEW.rated_at = NULL;
  NEW.citizen_comment = NULL; NEW.confirmed_fixed = NULL; NEW.repair_image_url = NULL; NEW.overdue_notified_at = NULL;
  IF NEW.area_id IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.area_id := public.area_for_point_within(NEW.latitude, NEW.longitude);
  END IF;
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
$fn$;

-- Alert super admins when a complaint arrives with no matching area.
CREATE OR REPLACE FUNCTION public.notify_report_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, report_id, link)
      VALUES (NEW.assigned_admin_id, 'New complaint ' || NEW.report_number,
        NEW.severity || ' severity at ' || COALESCE(NULLIF(NEW.address, ''), 'an unknown address'),
        NEW.id, '/admin/reports/' || NEW.id);
    END IF;
    IF NEW.area_id IS NULL THEN
      INSERT INTO public.notifications (user_id, title, body, report_id, link)
      SELECT ur.user_id, 'Complaint ' || NEW.report_number || ' needs an area',
        'No area matches its location. Assign one so an area admin can pick it up.',
        NEW.id, '/admin/reports/' || NEW.id
      FROM public.user_roles ur WHERE ur.role = 'admin';
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
$fn$;

-- Audit log: one readable entry per actual change, with old and new values.
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'reports' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log (actor_id, action, details) VALUES (auth.uid(), 'Status changed',
        jsonb_build_object('report', NEW.report_number, 'from', OLD.status, 'to', NEW.status));
    END IF;
    IF NEW.area_id IS DISTINCT FROM OLD.area_id THEN
      INSERT INTO public.audit_log (actor_id, action, details) VALUES (auth.uid(), 'Area changed',
        jsonb_build_object('report', NEW.report_number,
          'from', (SELECT name FROM public.areas WHERE id = OLD.area_id),
          'to', (SELECT name FROM public.areas WHERE id = NEW.area_id)));
    END IF;
    IF NEW.assigned_admin_id IS DISTINCT FROM OLD.assigned_admin_id THEN
      INSERT INTO public.audit_log (actor_id, action, details) VALUES (auth.uid(), 'Admin reassigned',
        jsonb_build_object('report', NEW.report_number,
          'from', (SELECT COALESCE(NULLIF(full_name,''), email) FROM public.profiles WHERE id = OLD.assigned_admin_id),
          'to', (SELECT COALESCE(NULLIF(full_name,''), email) FROM public.profiles WHERE id = NEW.assigned_admin_id)));
    END IF;
    IF NEW.deadline_at IS DISTINCT FROM OLD.deadline_at THEN
      INSERT INTO public.audit_log (actor_id, action, details) VALUES (auth.uid(), 'Deadline changed',
        jsonb_build_object('report', NEW.report_number, 'from', OLD.deadline_at, 'to', NEW.deadline_at));
    END IF;
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
$fn$;

-- Server functions (which run without a user JWT) record the real actor through this.
CREATE OR REPLACE FUNCTION public.log_audit(_actor uuid, _action text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, details) VALUES (_actor, _action, _details);
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.log_audit(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Backfill: give existing GPS reports their area, and route open ones to that area's admin.
UPDATE public.reports r
SET area_id = public.area_for_point_within(r.latitude, r.longitude)
WHERE r.area_id IS NULL AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
  AND public.area_for_point_within(r.latitude, r.longitude) IS NOT NULL;

UPDATE public.reports r
SET assigned_admin_id = (
  SELECT aaa.admin_id FROM public.area_admin_areas aaa
  WHERE aaa.area_id = r.area_id AND public.is_area_admin(aaa.admin_id)
  ORDER BY aaa.admin_id LIMIT 1)
WHERE r.assigned_admin_id IS NULL AND r.area_id IS NOT NULL
  AND r.status NOT IN ('Fixed','Rejected','Duplicate');