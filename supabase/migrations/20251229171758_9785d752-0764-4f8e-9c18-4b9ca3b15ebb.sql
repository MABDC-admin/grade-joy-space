-- Drop the existing INSERT policy for classes
DROP POLICY IF EXISTS "Teachers and admins can create classes" ON public.classes;

-- Create stricter INSERT policy: teachers MUST have a school_id that matches their profile
CREATE POLICY "Teachers and admins can create classes" 
ON public.classes 
FOR INSERT 
WITH CHECK (
  -- Admins can create any class
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Teachers must:
  -- 1. Have the teacher role
  -- 2. Set created_by to themselves
  -- 3. Have a school_id that matches their profile (not NULL)
  (
    has_role(auth.uid(), 'teacher'::app_role) 
    AND created_by = auth.uid()
    AND school_id IS NOT NULL
    AND school_id = (
      SELECT p.school_id 
      FROM profiles p 
      WHERE p.user_id = auth.uid()
    )
  )
);