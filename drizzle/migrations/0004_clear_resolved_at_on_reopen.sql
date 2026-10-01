CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_TABLE_NAME = 'reports' THEN
    IF NEW.status = 'Resolved' AND (OLD.status IS DISTINCT FROM 'Resolved') THEN
      NEW.resolved_at = now();
    ELSIF NEW.status <> 'Resolved' THEN
      NEW.resolved_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
UPDATE public.reports SET resolved_at = NULL WHERE status <> 'Resolved' AND resolved_at IS NOT NULL;