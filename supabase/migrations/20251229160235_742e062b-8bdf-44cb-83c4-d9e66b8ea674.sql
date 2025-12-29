-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  grade_level TEXT,
  section TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT,
  subject TEXT,
  description TEXT,
  class_code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  color TEXT DEFAULT 'green',
  grade_level TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create class_teachers junction table
CREATE TABLE public.class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (class_id, teacher_id)
);

-- Create class_members junction table
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (class_id, student_id)
);

-- Create topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create classwork_items table
CREATE TABLE public.classwork_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('lesson', 'assignment')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  due_date TIMESTAMP WITH TIME ZONE,
  points INTEGER,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.classwork_items(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text_answer TEXT,
  status TEXT CHECK (status IN ('assigned', 'submitted', 'graded', 'returned')) DEFAULT 'assigned',
  grade INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (assignment_id, student_id)
);

-- Create submission_files table
CREATE TABLE public.submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classwork_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is teacher of a class
CREATE OR REPLACE FUNCTION public.is_class_teacher(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_teachers
    WHERE teacher_id = _user_id
      AND class_id = _class_id
  ) OR EXISTS (
    SELECT 1
    FROM public.classes
    WHERE id = _class_id
      AND created_by = _user_id
  )
$$;

-- Function to check if user is member of a class
CREATE OR REPLACE FUNCTION public.is_class_member(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members
    WHERE student_id = _user_id
      AND class_id = _class_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Classes policies
CREATE POLICY "Users can view classes they are part of" ON public.classes FOR SELECT TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.is_class_teacher(auth.uid(), id) OR 
  public.is_class_member(auth.uid(), id)
);
CREATE POLICY "Teachers and admins can create classes" ON public.classes FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can update their classes" ON public.classes FOR UPDATE TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), id));
CREATE POLICY "Admins can delete classes" ON public.classes FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Class teachers policies
CREATE POLICY "View class teachers" ON public.class_teachers FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id) OR public.is_class_member(auth.uid(), class_id));
CREATE POLICY "Admins can manage class teachers" ON public.class_teachers FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Class members policies
CREATE POLICY "View class members" ON public.class_members FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id) OR public.is_class_member(auth.uid(), class_id));
CREATE POLICY "Students can join classes" ON public.class_members FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can leave or admins remove" ON public.class_members FOR DELETE TO authenticated 
USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

-- Topics policies
CREATE POLICY "View topics in accessible classes" ON public.topics FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id) OR public.is_class_member(auth.uid(), class_id));
CREATE POLICY "Teachers can manage topics" ON public.topics FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id));

-- Classwork items policies
CREATE POLICY "View classwork in accessible classes" ON public.classwork_items FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id) OR public.is_class_member(auth.uid(), class_id));
CREATE POLICY "Teachers can manage classwork" ON public.classwork_items FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id));

-- Submissions policies
CREATE POLICY "Students view own submissions" ON public.submissions FOR SELECT TO authenticated 
USING (auth.uid() = student_id);
CREATE POLICY "Teachers view submissions for their assignments" ON public.submissions FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.classwork_items ci
    WHERE ci.id = assignment_id
    AND public.is_class_teacher(auth.uid(), ci.class_id)
  )
);
CREATE POLICY "Students can submit" ON public.submissions FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own submissions" ON public.submissions FOR UPDATE TO authenticated 
USING (auth.uid() = student_id);
CREATE POLICY "Teachers can grade" ON public.submissions FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.classwork_items ci
    WHERE ci.id = assignment_id
    AND public.is_class_teacher(auth.uid(), ci.class_id)
  )
);

-- Submission files policies
CREATE POLICY "View own submission files" ON public.submission_files FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.student_id = auth.uid())
);
CREATE POLICY "Teachers view submission files" ON public.submission_files FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.classwork_items ci ON ci.id = s.assignment_id
    WHERE s.id = submission_id
    AND public.is_class_teacher(auth.uid(), ci.class_id)
  )
);
CREATE POLICY "Students can upload files" ON public.submission_files FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.student_id = auth.uid())
);
CREATE POLICY "Students can delete own files" ON public.submission_files FOR DELETE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.student_id = auth.uid())
);

-- Announcements policies
CREATE POLICY "View announcements" ON public.announcements FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id) OR public.is_class_member(auth.uid(), class_id));
CREATE POLICY "Teachers can post announcements" ON public.announcements FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_class_teacher(auth.uid(), class_id));
CREATE POLICY "Teachers can manage announcements" ON public.announcements FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = author_id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  -- Default to student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('class-materials', 'class-materials', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for class materials
CREATE POLICY "Class materials are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'class-materials');
CREATE POLICY "Teachers can upload materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'class-materials' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

-- Storage policies for submissions
CREATE POLICY "Users can view own submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Students can upload submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Teachers can view all submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));