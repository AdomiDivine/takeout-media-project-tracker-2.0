-- Allow any authenticated user to create a project they own
DROP POLICY IF EXISTS "projects: admin can create" ON public.projects;

CREATE POLICY "projects: authenticated can create" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Allow project creator to update and delete their own project
DROP POLICY IF EXISTS "projects: creator can update own" ON public.projects;
CREATE POLICY "projects: creator can update own" ON public.projects
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "projects: creator can delete own" ON public.projects;
CREATE POLICY "projects: creator can delete own" ON public.projects
  FOR DELETE USING (created_by = auth.uid());
