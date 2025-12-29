-- Enable realtime for classwork_items and announcements tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.classwork_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;