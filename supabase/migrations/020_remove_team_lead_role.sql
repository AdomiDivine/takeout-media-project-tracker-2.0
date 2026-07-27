-- ============================================================
-- Migration 020: Remove team_lead role
--
-- Roles are now: super_admin | admin | member
-- Existing team_lead users are converted to member.
-- ============================================================

-- Convert any existing team_lead users to member
UPDATE public.users SET role = 'member' WHERE role = 'team_lead';

-- ============================================================
-- Drop stale team_lead-specific policies
-- ============================================================
DROP POLICY IF EXISTS "tasks: team_lead sees project tasks" ON public.tasks;
DROP POLICY IF EXISTS "projects: team_lead can create"     ON public.projects;
DROP POLICY IF EXISTS "projects: team_lead can manage own" ON public.projects;
DROP POLICY IF EXISTS "projects: team_lead can delete own" ON public.projects;

-- ============================================================
-- Update tasks: admin can update all (remove team_lead)
-- ============================================================
DROP POLICY IF EXISTS "tasks: admin can update all" ON public.tasks;

CREATE POLICY "tasks: admin can update all" ON public.tasks
  FOR UPDATE USING (
    public.current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================================
-- task_members: any user can assign members to tasks they created;
-- admins can assign to any task
-- ============================================================
DROP POLICY IF EXISTS "task_members: insert by task creator or lead" ON public.task_members;

CREATE POLICY "task_members: insert by task creator or admin" ON public.task_members
  FOR INSERT WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
    OR public.current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================================
-- task_members: allow task creator or admin to remove assignments
-- ============================================================
DROP POLICY IF EXISTS "task_members: delete by task creator or admin" ON public.task_members;

CREATE POLICY "task_members: delete by task creator or admin" ON public.task_members
  FOR DELETE USING (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
    OR public.current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================================
-- Projects: only admins/super_admins can create projects
-- ============================================================
DROP POLICY IF EXISTS "projects: admin can create" ON public.projects;

CREATE POLICY "projects: admin can create" ON public.projects
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin')
    AND created_by = auth.uid()
  );
