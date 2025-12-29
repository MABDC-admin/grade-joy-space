-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view classes they are part of" ON public.classes;

-- Create a new policy that allows:
-- 1. Admins to see all classes
-- 2. Teachers and members to see their classes
-- 3. Any authenticated user to look up a class (for joining via code)
CREATE POLICY "Users can view classes they are part of or lookup for joining"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_class_teacher(auth.uid(), id) 
  OR is_class_member(auth.uid(), id)
  OR auth.uid() IS NOT NULL  -- Allow any authenticated user to lookup classes
);