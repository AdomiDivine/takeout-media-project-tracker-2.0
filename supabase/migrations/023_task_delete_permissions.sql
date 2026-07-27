-- ============================================================
-- Migration 023: Task deletion restricted to creator or admin
--
-- Soft-deletes (setting deleted_at) must only be done by:
--   - The task creator  (created_by = auth.uid())
--   - An admin / super_admin
--
-- Assigned members who did NOT create the task must NOT be
-- able to soft-delete it, even though the existing permissive
-- UPDATE policy allows them to update status/progress.
--
-- We use a RESTRICTIVE policy so it applies ON TOP OF the
-- existing permissive policies (all must agree).
-- ============================================================

DROP POLICY IF EXISTS "tasks: soft-delete restricted to creator or admin" ON public.tasks;

CREATE POLICY "tasks: soft-delete restricted to creator or admin"
ON public.tasks
AS RESTRICTIVE
FOR UPDATE
WITH CHECK (
  -- Normal update (not a soft-delete) — pass through to permissive policies
  deleted_at IS NULL
  -- Soft-delete is allowed only for the task creator
  OR created_by = auth.uid()
  -- Or for admins / super_admins
  OR public.current_user_role() IN ('super_admin', 'admin')
);
