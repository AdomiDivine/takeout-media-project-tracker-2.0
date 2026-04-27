-- Allow task creators, team leads, admins, and super_admins to remove members from tasks
CREATE POLICY "task_members: delete by task creator or lead" ON public.task_members
  FOR DELETE USING (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
    OR public.current_user_role() IN ('super_admin', 'admin', 'team_lead')
  );
