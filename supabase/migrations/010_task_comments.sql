-- Task comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read comments (service role used in app anyway)
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own comments
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
