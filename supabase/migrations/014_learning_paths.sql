CREATE TABLE IF NOT EXISTS public.learning_paths (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  type         text NOT NULL DEFAULT 'course',
  description  text,
  url          text,
  progress     integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status       text NOT NULL DEFAULT 'not_started',
  brand_id     uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  target_date  date,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lp_select" ON public.learning_paths FOR SELECT TO authenticated USING (true);
CREATE POLICY "lp_insert" ON public.learning_paths FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lp_update" ON public.learning_paths FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lp_delete" ON public.learning_paths FOR DELETE TO authenticated USING (auth.uid() = user_id);
