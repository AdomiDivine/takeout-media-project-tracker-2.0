-- ============================================================
-- Fix overly broad project visibility for members
--
-- Old policy let ANY authenticated user see ALL active projects.
-- New policy restricts members to only projects they have a
-- task assigned to them in.
-- ============================================================

DROP POLICY IF EXISTS "projects: members view active" ON public.projects;

-- Members only see projects where they are assigned to at least one task
CREATE POLICY "projects: members view assigned" ON public.projects
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT t.project_id
      FROM public.tasks t
      INNER JOIN public.task_members tm ON tm.task_id = t.id
      WHERE tm.user_id = auth.uid()
        AND t.deleted_at IS NULL
    )
  );
