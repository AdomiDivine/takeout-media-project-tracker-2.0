-- ============================================================
-- Fix circular RLS on task_members + add admin SELECT policy
--
-- The "view as collaborator" policy referenced task_members
-- from within a task_members policy, causing infinite recursion
-- when evaluated with a client JWT. Fixed by using a
-- SECURITY DEFINER function that bypasses RLS on the subquery.
-- ============================================================

-- Helper: returns the task_ids the current user belongs to
-- SECURITY DEFINER so the inner query bypasses RLS (no recursion)
CREATE OR REPLACE FUNCTION public.my_task_member_task_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT task_id FROM public.task_members WHERE user_id = auth.uid();
$$;

-- Replace the circular policy with a safe version
DROP POLICY IF EXISTS "task_members: view as collaborator" ON public.task_members;
CREATE POLICY "task_members: view as collaborator" ON public.task_members
  FOR SELECT USING (
    task_id IN (SELECT public.my_task_member_task_ids())
  );

-- Add missing admin SELECT policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'task_members'
      AND policyname = 'task_members: admin sees all'
  ) THEN
    CREATE POLICY "task_members: admin sees all" ON public.task_members
      FOR SELECT USING (public.current_user_role() IN ('super_admin', 'admin'));
  END IF;
END $$;
