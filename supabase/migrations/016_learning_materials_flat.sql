-- Drop old cycle-based tables (replaced by flat structure)
DROP TABLE IF EXISTS public.learning_materials CASCADE;
DROP TABLE IF EXISTS public.learning_cycles CASCADE;

CREATE TABLE public.learning_materials (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  type       text NOT NULL DEFAULT 'course',
  cadre      text NOT NULL DEFAULT 'personal_cognitive',
  status     text NOT NULL DEFAULT 'not_started',
  quarter    text NOT NULL DEFAULT 'Q1',
  year       integer NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::integer,
  url        text,
  notes      text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lm_select" ON public.learning_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "lm_insert" ON public.learning_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lm_update" ON public.learning_materials FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lm_delete" ON public.learning_materials FOR DELETE TO authenticated USING (auth.uid() = user_id);
