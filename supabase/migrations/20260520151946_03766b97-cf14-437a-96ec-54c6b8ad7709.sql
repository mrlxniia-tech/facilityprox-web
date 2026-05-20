
-- Add options array to apartments for filterable amenities
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS options text[] NOT NULL DEFAULT '{}';

-- Auto-promote bootstrap admin email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  IF lower(NEW.email) = 'mrlxniia@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- If the bootstrap admin already signed up, promote them now
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'mrlxniia@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
