CREATE TABLE public.super_admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  declined_at timestamptz
);
CREATE UNIQUE INDEX super_admin_invites_open_email ON public.super_admin_invites (lower(email)) WHERE accepted_at IS NULL AND declined_at IS NULL;
GRANT SELECT, INSERT, DELETE ON public.super_admin_invites TO authenticated;
GRANT ALL ON public.super_admin_invites TO service_role;
ALTER TABLE public.super_admin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read invites" ON public.super_admin_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR lower(email) = lower(auth.jwt()->>'email'));
CREATE POLICY "Super admins create invites" ON public.super_admin_invites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND invited_by = auth.uid());
CREATE POLICY "Super admins delete invites" ON public.super_admin_invites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.respond_super_admin_invite(_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; u record;
BEGIN
  SELECT id, email, email_confirmed_at INTO u FROM auth.users WHERE id = auth.uid();
  IF u.id IS NULL OR u.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Confirm your email first'; END IF;
  SELECT * INTO inv FROM public.super_admin_invites
   WHERE id = _id AND lower(email) = lower(u.email) AND accepted_at IS NULL AND declined_at IS NULL;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF _accept THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (u.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.super_admin_invites SET accepted_at = now() WHERE id = _id;
  ELSE
    UPDATE public.super_admin_invites SET declined_at = now() WHERE id = _id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.respond_super_admin_invite(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_super_admin_invite(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_super_admin_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT p.id, 'You are invited to be a super admin', 'Open the app to accept or decline.', '/dashboard'
  FROM public.profiles p WHERE lower(p.email) = lower(NEW.email);
  RETURN NEW;
END $$;
CREATE TRIGGER super_admin_invite_notify AFTER INSERT ON public.super_admin_invites
  FOR EACH ROW EXECUTE FUNCTION public.notify_super_admin_invite();
CREATE TRIGGER audit_super_admin_invites AFTER INSERT OR UPDATE OR DELETE ON public.super_admin_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();