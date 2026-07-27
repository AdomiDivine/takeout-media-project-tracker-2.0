-- ============================================================
-- Migration 025: Fix overdue logic + drop RESTRICTIVE delete policy
-- ============================================================

-- 1. Fix the cron job: a task is overdue only when deadline < CURRENT_DATE
--    (strictly before today). Tasks due TODAY are NOT overdue — they still
--    have the rest of the day.
SELECT cron.unschedule('mark-overdue-tasks');

SELECT cron.schedule(
  'mark-overdue-tasks',
  '1 17 * * *',
  $$
    UPDATE public.tasks
    SET status = 'overdue'
    WHERE status IN ('pending', 'in_progress')
      AND deleted_at IS NULL
      AND deadline < CURRENT_DATE;
  $$
);

-- 2. Recover tasks that were incorrectly marked overdue today
--    (deadline = today → they should still be pending/in_progress)
UPDATE public.tasks
SET status = CASE
  WHEN progress > 0 THEN 'in_progress'
  ELSE 'pending'
END
WHERE status = 'overdue'
  AND deadline = CURRENT_DATE
  AND deleted_at IS NULL;

-- 3. Drop the RESTRICTIVE soft-delete policy — it conflicts with the
--    client-side delete path and causes silent failures.
--    Delete permission is now enforced server-side in /api/tasks/delete.
DROP POLICY IF EXISTS "tasks: soft-delete restricted to creator or admin" ON public.tasks;
