-- Add optional user note to highlights (for "Add to project" panel action)
ALTER TABLE public.highlights ADD COLUMN IF NOT EXISTS user_note TEXT;
