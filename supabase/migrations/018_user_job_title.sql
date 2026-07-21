-- Add job_title field to users so members can set their actual role/position
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;
