-- Add description column to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description text;

-- Storage RLS policies for avatars bucket
-- Run AFTER creating the 'avatars' and 'project-avatars' buckets in the Supabase dashboard

CREATE POLICY "avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars: authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars: authenticated update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "project-avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-avatars');

CREATE POLICY "project-avatars: authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'project-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "project-avatars: authenticated update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'project-avatars' AND auth.role() = 'authenticated');
