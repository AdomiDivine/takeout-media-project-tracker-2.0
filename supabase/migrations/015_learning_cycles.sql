CREATE TABLE IF NOT EXISTS public.learning_cycles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  start_date  date,
  end_date    date,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.learning_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_select" ON public.learning_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "lc_insert" ON public.learning_cycles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lc_update" ON public.learning_cycles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lc_delete" ON public.learning_cycles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.learning_materials (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id   uuid NOT NULL REFERENCES public.learning_cycles(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  type       text NOT NULL DEFAULT 'course',
  cadre      text NOT NULL DEFAULT 'personal_cognitive',
  status     text NOT NULL DEFAULT 'not_started',
  url        text,
  notes      text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lm_select" ON public.learning_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "lm_insert" ON public.learning_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lm_update" ON public.learning_materials FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lm_delete" ON public.learning_materials FOR DELETE TO authenticated USING (auth.uid() = user_id);
