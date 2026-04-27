-- Fix tasks RLS to use the SECURITY DEFINER helper (no recursion risk)
-- The previous policy queried task_members WITH RLS from inside a tasks policy,
-- which could cause silent empty results due to recursive RLS evaluation.

DROP POLICY IF EXISTS "tasks: member sees own" ON public.tasks;
CREATE POLICY "tasks: member sees own" ON public.tasks
  FOR SELECT USING (
    deleted_at IS NULL AND (
      created_by = auth.uid()
      OR id IN (SELECT public.my_task_member_task_ids())
    )
  );

-- Same fix for the UPDATE policy
DROP POLICY IF EXISTS "tasks: member can update own" ON public.tasks;
CREATE POLICY "tasks: member can update own" ON public.tasks
  FOR UPDATE USING (
    created_by = auth.uid()
    OR id IN (SELECT public.my_task_member_task_ids())
  );

-- Also run outstanding migrations if not already applied
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS overdue_email_sent boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "projects: members view assigned" ON public.projects;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects: members view active'
  ) THEN
    CREATE POLICY "projects: members view active" ON public.projects
      FOR SELECT USING (status = 'active');
  END IF;
END $$;
