-- Add review workflow columns to learning_materials
ALTER TABLE public.learning_materials
  ADD COLUMN IF NOT EXISTS completion_date date,
  ADD COLUMN IF NOT EXISTS key_learning    text,
  ADD COLUMN IF NOT EXISTS application_evidence text,
  ADD COLUMN IF NOT EXISTS observable_impact    text,
  ADD COLUMN IF NOT EXISTS comment              text,
  ADD COLUMN IF NOT EXISTS follow_up_required   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ops_notes            text;

-- Allow admins to update any learning material (for admin review fields)
DROP POLICY IF EXISTS "lm_update" ON public.learning_materials;
CREATE POLICY "lm_update" ON public.learning_materials
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.current_user_role() IN ('super_admin', 'admin'));

-- Add learning_review notification type (safe: IF NOT EXISTS prevents duplicate errors)
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'learning_review';
