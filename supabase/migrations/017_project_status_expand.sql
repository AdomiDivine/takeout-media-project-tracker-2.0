-- Add constraint to allow new project status values
-- (column is text so no enum change needed, just document valid values)
-- active | on_hold | completed | archived

-- Update existing archived projects to use consistent status
UPDATE public.projects SET status = 'active' WHERE status NOT IN ('active', 'on_hold', 'completed', 'archived');
