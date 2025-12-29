-- Add color column to topics table for topic header colors
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS color text DEFAULT 'blue';

-- Add attachments column to classwork_items if not exists (for file uploads)
-- Already exists from schema, just ensuring it's there