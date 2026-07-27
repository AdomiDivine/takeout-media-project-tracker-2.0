-- ============================================================
-- Fix 1: job_title column (safe to run even if 018 was applied)
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;

-- ============================================================
-- Fix 2: All authenticated users can read other users
--
-- Required so that:
--   - Team member dropdowns (assign task, set team lead) show everyone
--   - Members page works for admins
--   - Admin dashboard workload section works
-- ============================================================
DROP POLICY IF EXISTS "users: all authenticated can read" ON public.users;

CREATE POLICY "users: all authenticated can read" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Fix 3: Team leads can create projects
-- ============================================================
DROP POLICY IF EXISTS "projects: team_lead can create" ON public.projects;

CREATE POLICY "projects: team_lead can create" ON public.projects
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'team_lead'
    AND created_by = auth.uid()
  );

-- ============================================================
-- Fix 4: Team leads can update/manage projects they created or lead
-- ============================================================
DROP POLICY IF EXISTS "projects: team_lead can manage own" ON public.projects;

CREATE POLICY "projects: team_lead can manage own" ON public.projects
  FOR UPDATE USING (
    public.current_user_role() = 'team_lead'
    AND (created_by = auth.uid() OR team_lead_id = auth.uid())
  );

-- ============================================================
-- Fix 5: Team leads can delete projects they created
-- ============================================================
DROP POLICY IF EXISTS "projects: team_lead can delete own" ON public.projects;

CREATE POLICY "projects: team_lead can delete own" ON public.projects
  FOR DELETE USING (
    public.current_user_role() = 'team_lead'
    AND created_by = auth.uid()
  );
