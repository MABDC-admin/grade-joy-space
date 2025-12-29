-- Create teacher_grade_levels table for assigning teachers to grade levels
CREATE TABLE public.teacher_grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  grade_level_id UUID NOT NULL REFERENCES public.grade_levels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, grade_level_id)
);

-- Enable RLS
ALTER TABLE public.teacher_grade_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage teacher grade levels"
  ON public.teacher_grade_levels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their own grade levels"
  ON public.teacher_grade_levels FOR SELECT
  USING (auth.uid() = teacher_id);

-- Create helper function to check if teacher can create class for a grade level
CREATE OR REPLACE FUNCTION public.can_teach_grade(_user_id uuid, _grade_level_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_grade_levels
    WHERE teacher_id = _user_id
      AND grade_level_id = _grade_level_id
  )
$$;