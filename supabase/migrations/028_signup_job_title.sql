-- ============================================================
-- Migration 028: save the role (job title) entered at sign-up
-- Sign-up now asks for a role; it's passed as user metadata and copied
-- onto the profile when the account is created. Safe to run more than once.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, name, email, job_title)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'job_title'), '')
  );
  RETURN NEW;
END;
$$;
