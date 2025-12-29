-- Add banner_url to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS banner_url text;

-- Create notification reads tracking table for badge notifications
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  content_type text NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, content_id, content_type)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can manage their own read status
CREATE POLICY "Users can view own read status"
ON public.notification_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read status"
ON public.notification_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own read status"
ON public.notification_reads FOR DELETE
USING (auth.uid() = user_id);