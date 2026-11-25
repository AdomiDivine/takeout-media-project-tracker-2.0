-- ============================================================
-- Migration 027: Settings — preferred name, notification preferences,
-- signed-in devices, and locking down role changes.
-- Safe to run more than once.
-- ============================================================

-- ─── 1. New profile fields ─────────────────────────────────
-- Short name used in greetings and emails ("Good morning, Tobi")
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_name text;

-- Notification preferences, e.g. {"email": {"completed": false}, "app": {"blocker": false}}
-- Anything not listed counts as ON.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;


-- ─── 2. Notification preference helpers ────────────────────
-- Groups notification types into the categories shown in Settings
CREATE OR REPLACE FUNCTION public.notification_category(t public.notification_type)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE t::text
    WHEN 'assignment'    THEN 'assigned'
    WHEN 'collaboration' THEN 'assigned'
    WHEN 'overdue'       THEN 'overdue'
    WHEN 'deadline'      THEN 'overdue'
    WHEN 'completion'    THEN 'completed'
    WHEN 'blocker'       THEN 'blocker'
    ELSE 'other'
  END;
$$;

-- Is this channel ('email' or 'app') + category switched on for the user? Defaults to ON.
CREATE OR REPLACE FUNCTION public.notification_enabled(p_user uuid, p_channel text, p_category text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT (notification_prefs -> p_channel ->> p_category)::boolean FROM public.users WHERE id = p_user),
    true
  );
$$;

-- In-app notifications someone switched off are still saved (so emails can
-- still go out) but marked hidden, and the bell doesn't show them.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apply_notification_prefs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.notification_enabled(NEW.user_id, 'app', public.notification_category(NEW.type)) THEN
    NEW.hidden := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_notification_prefs ON public.notifications;
CREATE TRIGGER apply_notification_prefs
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.apply_notification_prefs();


-- ─── 3. "Where you're logged in" ───────────────────────────
-- Lets a user see their own active logins (from Supabase's built-in auth.sessions)
CREATE OR REPLACE FUNCTION public.my_sessions()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  last_active timestamptz,
  user_agent text,
  ip text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT
    s.id,
    s.created_at,
    GREATEST(s.created_at, s.updated_at, s.refreshed_at AT TIME ZONE 'UTC') AS last_active,
    s.user_agent,
    host(s.ip) AS ip
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
    AND (s.not_after IS NULL OR s.not_after > now())
  ORDER BY 3 DESC;
$$;

-- Lets a user sign out one of their own logins
CREATE OR REPLACE FUNCTION public.revoke_my_session(p_session_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_my_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated;


-- ─── 4. Security fix: only super admins can change roles ───
-- "users: update own" lets people edit their own row, which also let any
-- member change their own role. This blocks role changes unless the person
-- making them is a super admin. Server-side code (service role, no logged-in
-- user) such as the invite flow is still allowed.
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND public.current_user_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_role ON public.users;
CREATE TRIGGER protect_user_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_role();
