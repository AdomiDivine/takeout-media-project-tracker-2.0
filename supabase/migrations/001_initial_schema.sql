-- ============================================================
-- TM Work OS — Initial Schema
-- Supabase / PostgreSQL
-- Overdue cron: 18:01 WAT (17:01 UTC) daily via pg_cron
-- Tasks use soft-delete (deleted_at)
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'team_lead', 'member');
CREATE TYPE project_status AS ENUM ('active', 'archived');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE notification_type AS ENUM (
  'assignment', 'collaboration', 'deadline', 'overdue', 'blocker', 'completion'
);

-- ─── Users ───────────────────────────────────────────────────
-- Mirrors auth.users; created via trigger on signup
CREATE TABLE public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text UNIQUE NOT NULL,
  role       user_role NOT NULL DEFAULT 'member',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Auto-insert into public.users when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Projects ────────────────────────────────────────────────
CREATE TABLE public.projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  team_lead_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  avatar_url   text,
  status       project_status DEFAULT 'active',
  created_at   timestamptz DEFAULT now()
);

-- ─── Tasks ───────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deadline       date NOT NULL,
  status         task_status DEFAULT 'pending',
  priority       task_priority NOT NULL,
  blocker        text,
  progress       integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attachment_url text,
  created_at     timestamptz DEFAULT now(),
  completed_at   timestamptz,
  deleted_at     timestamptz  -- soft-delete; NULL = active
);

-- ─── Task Members (Many-to-Many) ─────────────────────────────
CREATE TABLE public.task_members (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id  uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message     text NOT NULL,
  read_status boolean DEFAULT false,
  type        notification_type NOT NULL,
  task_id     uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- ─── Activity Log ────────────────────────────────────────────
CREATE TABLE public.activity_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  task_id    uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action     text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_tasks_project_id    ON public.tasks(project_id);
CREATE INDEX idx_tasks_status        ON public.tasks(status);
CREATE INDEX idx_tasks_deadline      ON public.tasks(deadline);
CREATE INDEX idx_tasks_deleted_at    ON public.tasks(deleted_at);
CREATE INDEX idx_task_members_task   ON public.task_members(task_id);
CREATE INDEX idx_task_members_user   ON public.task_members(user_id);
CREATE INDEX idx_notifications_user  ON public.notifications(user_id);
CREATE INDEX idx_notifications_read  ON public.notifications(user_id, read_status);
CREATE INDEX idx_activity_user       ON public.activity_log(user_id);

-- ─── Overdue Scheduler (pg_cron) ─────────────────────────────
-- Runs at 17:01 UTC = 18:01 WAT daily
-- Marks tasks as overdue if deadline has passed and not yet completed
SELECT cron.schedule(
  'mark-overdue-tasks',
  '1 17 * * *',
  $$
    UPDATE public.tasks
    SET status = 'overdue'
    WHERE status IN ('pending', 'in_progress')
      AND deleted_at IS NULL
      AND (
        deadline < CURRENT_DATE
        OR (
          deadline = CURRENT_DATE
          AND (now() AT TIME ZONE 'Africa/Lagos')::time >= '18:01'
        )
      );
  $$
);

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log  ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ─── RLS Policies: users ─────────────────────────────────────
-- Anyone can read their own profile; admins can read all
CREATE POLICY "users: read own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users: admins read all" ON public.users
  FOR SELECT USING (public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "users: update own" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users: super_admin update role" ON public.users
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

-- ─── RLS Policies: projects ──────────────────────────────────
CREATE POLICY "projects: members view active" ON public.projects
  FOR SELECT USING (status = 'active');

CREATE POLICY "projects: admin/super manage" ON public.projects
  FOR ALL USING (public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "projects: team_lead view assigned" ON public.projects
  FOR SELECT USING (team_lead_id = auth.uid());

-- ─── RLS Policies: tasks ─────────────────────────────────────
-- Members see their own tasks (created or assigned)
CREATE POLICY "tasks: member sees own" ON public.tasks
  FOR SELECT USING (
    deleted_at IS NULL AND (
      created_by = auth.uid()
      OR id IN (SELECT task_id FROM public.task_members WHERE user_id = auth.uid())
    )
  );

-- Team leads see all tasks in their projects
CREATE POLICY "tasks: team_lead sees project tasks" ON public.tasks
  FOR SELECT USING (
    deleted_at IS NULL AND
    project_id IN (SELECT id FROM public.projects WHERE team_lead_id = auth.uid())
  );

-- Admins see everything
CREATE POLICY "tasks: admin sees all" ON public.tasks
  FOR SELECT USING (
    public.current_user_role() IN ('super_admin', 'admin')
  );

-- Members can create tasks
CREATE POLICY "tasks: member can create" ON public.tasks
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Assigned members can update tasks they own or are assigned to
CREATE POLICY "tasks: member can update own" ON public.tasks
  FOR UPDATE USING (
    created_by = auth.uid()
    OR id IN (SELECT task_id FROM public.task_members WHERE user_id = auth.uid())
  );

-- Admins and leads can update any task in their scope
CREATE POLICY "tasks: admin can update all" ON public.tasks
  FOR UPDATE USING (
    public.current_user_role() IN ('super_admin', 'admin', 'team_lead')
  );

-- ─── RLS Policies: task_members ──────────────────────────────
CREATE POLICY "task_members: view own" ON public.task_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "task_members: view as collaborator" ON public.task_members
  FOR SELECT USING (
    task_id IN (SELECT task_id FROM public.task_members WHERE user_id = auth.uid())
  );

CREATE POLICY "task_members: insert by task creator or lead" ON public.task_members
  FOR INSERT WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
    OR public.current_user_role() IN ('super_admin', 'admin', 'team_lead')
  );

-- ─── RLS Policies: notifications ─────────────────────────────
CREATE POLICY "notifications: own only" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ─── RLS Policies: activity_log ──────────────────────────────
CREATE POLICY "activity_log: member sees own" ON public.activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "activity_log: admin sees all" ON public.activity_log
  FOR SELECT USING (
    public.current_user_role() IN ('super_admin', 'admin', 'team_lead')
  );

CREATE POLICY "activity_log: insert authenticated" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
