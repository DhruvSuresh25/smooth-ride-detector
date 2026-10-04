DELETE FROM public.notifications WHERE user_id IN (SELECT p.id FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL);
DELETE FROM public.reports WHERE user_id IN (SELECT p.id FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL);
DELETE FROM public.area_admins WHERE user_id IN (SELECT p.id FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL);
DELETE FROM public.user_roles WHERE user_id IN (SELECT p.id FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL);
DELETE FROM public.profiles WHERE id IN (SELECT p.id FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL);