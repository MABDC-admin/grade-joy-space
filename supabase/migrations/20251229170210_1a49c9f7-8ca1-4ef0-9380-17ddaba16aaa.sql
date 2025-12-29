-- Drop existing INSERT policy on classes
DROP POLICY IF EXISTS "Teachers and admins can create classes" ON public.classes;

-- Create improved INSERT policy that enforces school membership for teachers
CREATE POLICY "Teachers and admins can create classes" 
ON public.classes 
FOR INSERT 
WITH CHECK (
  -- Admins can create classes anywhere
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Teachers can create classes only in their own school
  (
    has_role(auth.uid(), 'teacher'::app_role) 
    AND (
      -- school_id must match teacher's school_id
      school_id IS NULL 
      OR school_id = (SELECT p.school_id FROM public.profiles p WHERE p.user_id = auth.uid())
    )
    AND created_by = auth.uid()
  )
);