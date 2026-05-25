CREATE TABLE public.brands (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  avatar_url  text,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_select" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "brands_insert" ON public.brands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "brands_update" ON public.brands FOR UPDATE TO authenticated USING (true);
CREATE POLICY "brands_delete" ON public.brands FOR DELETE TO authenticated USING (true);

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
