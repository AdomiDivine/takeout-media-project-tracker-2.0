-- ============================================================
-- Notification Triggers
-- Automatically insert notifications for key task events
-- ============================================================

-- 1. Notify user when they are assigned to a task
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task_name text;
BEGIN
  SELECT name INTO v_task_name FROM public.tasks WHERE id = NEW.task_id;

  INSERT INTO public.notifications (user_id, message, type, task_id)
  VALUES (
    NEW.user_id,
    'You have been assigned to "' || v_task_name || '"',
    'assignment',
    NEW.task_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_member_added
  AFTER INSERT ON public.task_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();


-- 2. Notify creator + members when a task is completed
CREATE OR REPLACE FUNCTION public.notify_task_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member record;
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Notify creator
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, message, type, task_id)
      VALUES (NEW.created_by, '"' || NEW.name || '" has been completed', 'completion', NEW.id);
    END IF;

    -- Notify assigned members (skip creator to avoid duplicate)
    FOR v_member IN
      SELECT user_id FROM public.task_members WHERE task_id = NEW.id AND user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000')
    LOOP
      INSERT INTO public.notifications (user_id, message, type, task_id)
      VALUES (v_member.user_id, '"' || NEW.name || '" has been completed', 'completion', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_completion();


-- 3. Notify creator + members when a task goes overdue
CREATE OR REPLACE FUNCTION public.notify_task_overdue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member record;
BEGIN
  IF OLD.status != 'overdue' AND NEW.status = 'overdue' THEN
    -- Notify creator
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, message, type, task_id)
      VALUES (NEW.created_by, '"' || NEW.name || '" is now overdue', 'overdue', NEW.id);
    END IF;

    -- Notify assigned members
    FOR v_member IN
      SELECT user_id FROM public.task_members WHERE task_id = NEW.id AND user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000')
    LOOP
      INSERT INTO public.notifications (user_id, message, type, task_id)
      VALUES (v_member.user_id, '"' || NEW.name || '" is now overdue', 'overdue', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_overdue
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_overdue();


-- 4. Notify assigned members when a blocker is added to a task
CREATE OR REPLACE FUNCTION public.notify_task_blocker()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member record;
BEGIN
  IF (OLD.blocker IS NULL OR OLD.blocker = '') AND NEW.blocker IS NOT NULL AND NEW.blocker != '' THEN
    FOR v_member IN SELECT user_id FROM public.task_members WHERE task_id = NEW.id LOOP
      INSERT INTO public.notifications (user_id, message, type, task_id)
      VALUES (
        v_member.user_id,
        'Blocker on "' || NEW.name || '": ' || NEW.blocker,
        'blocker',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_blocker_added
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_blocker();
