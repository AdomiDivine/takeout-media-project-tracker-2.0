-- Add flag so overdue emails are only sent once per task
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS overdue_email_sent boolean NOT NULL DEFAULT false;

-- Reset flag when a task moves back out of overdue
CREATE OR REPLACE FUNCTION public.reset_overdue_email_flag()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'overdue' AND NEW.status != 'overdue' THEN
    NEW.overdue_email_sent := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_status_changed_from_overdue
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.reset_overdue_email_flag();
