DROP POLICY IF EXISTS "Signed in reads deadline rules" ON public.deadline_rules;
CREATE POLICY "Staff read deadline rules" ON public.deadline_rules FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_area_admin(auth.uid()));

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='app_settings' AND cmd='SELECT' AND qual='true' LOOP
    EXECUTE format('DROP POLICY %I ON public.app_settings', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Staff read app settings" ON public.app_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_area_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone signed in reads areas" ON public.areas;
CREATE POLICY "Active accounts read areas" ON public.areas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status = 'Active'));