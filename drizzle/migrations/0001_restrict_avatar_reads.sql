DROP POLICY IF EXISTS "Authenticated read avatars" ON storage.objects;
CREATE POLICY "Owners and admins read avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.has_role(auth.uid(), 'admin'::public.app_role)));