-- Add start_date to tasks; existing tasks default to their created_at date
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;

UPDATE public.tasks SET start_date = created_at::date WHERE start_date IS NULL;
