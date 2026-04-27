-- Members need to see all active projects so they can select one when
-- creating a task. Visibility of individual tasks within projects is
-- already restricted by the tasks RLS ("tasks: member sees own").

DROP POLICY IF EXISTS "projects: members view assigned" ON public.projects;

CREATE POLICY IF NOT EXISTS "projects: members view active" ON public.projects
  FOR SELECT USING (status = 'active');
