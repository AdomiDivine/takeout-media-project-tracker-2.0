ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS brand_manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
