-- Update handle_new_user function to read role and grade_level_id from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  grade_id uuid;
BEGIN
  -- Get role from metadata, default to student
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
  grade_id := (NEW.raw_user_meta_data ->> 'grade_level_id')::uuid;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, grade_level_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    grade_id
  );
  
  -- Assign role (teacher or student)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::app_role);
  
  -- If teacher, also assign to their grade level
  IF user_role = 'teacher' AND grade_id IS NOT NULL THEN
    INSERT INTO public.teacher_grade_levels (teacher_id, grade_level_id)
    VALUES (NEW.id, grade_id);
  END IF;
  
  RETURN NEW;
END;
$$;