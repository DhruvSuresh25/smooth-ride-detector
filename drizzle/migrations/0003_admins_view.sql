CREATE OR REPLACE VIEW public.admins WITH (security_invoker = true) AS
SELECT r.user_id, p.full_name, p.email, r.created_at AS admin_since
FROM public.user_roles r
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE r.role = 'admin';
REVOKE ALL ON public.admins FROM anon;
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;