-- Create schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)),
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create grade_levels table with predefined levels
CREATE TABLE public.grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert predefined grade levels
INSERT INTO public.grade_levels (name, order_index) VALUES
  ('Kindergarten', 0),
  ('Grade 1', 1),
  ('Grade 2', 2),
  ('Grade 3', 3),
  ('Grade 4', 4),
  ('Grade 5', 5),
  ('Grade 6', 6),
  ('Grade 7', 7),
  ('Grade 8', 8),
  ('Grade 9', 9),
  ('Grade 10', 10),
  ('Grade 11', 11),
  ('Grade 12', 12);

-- Add school reference to profiles
ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL;

-- Add school and grade level to classes
ALTER TABLE public.classes ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.classes ADD COLUMN grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;

-- Schools policies
CREATE POLICY "Everyone can view schools" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schools" ON public.schools FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Grade levels policies (read-only for everyone)
CREATE POLICY "Everyone can view grade levels" ON public.grade_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage grade levels" ON public.grade_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles policies to allow admin to manage all
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if user belongs to school
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND school_id = _school_id
  )
$$;