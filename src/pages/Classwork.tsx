import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadContent } from '@/hooks/useUnreadContent';
import { BookOpen } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  color: string | null;
  class_code: string;
  studentCount?: number;
  assignmentCount?: number;
  teacherName?: string;
  teacherAvatar?: string | null;
}

export default function Classwork() {
  const { user, profile, isAdmin, isTeacher, isStudent } = useAuth();
  const { selectedSchoolId } = useSchool();
  const { unreadCounts } = useUnreadContent();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const effectiveSchoolId = isAdmin ? selectedSchoolId : profile?.school_id;

      let classIds: string[] = [];

      if (isStudent) {
        // Students see classes they joined
        const { data: memberClasses } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);
        classIds = memberClasses?.map(c => c.class_id) || [];
      } else {
        // Teachers see classes they teach
        const { data: teachingClasses } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);
        classIds = teachingClasses?.map(c => c.class_id) || [];
      }

      if (classIds.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      let query = supabase.from('classes').select('*').in('id', classIds);
      if (effectiveSchoolId) {
        query = query.eq('school_id', effectiveSchoolId);
      }

      const { data: classesData } = await query;

      // Fetch counts
      const { data: memberCounts } = await supabase
        .from('class_members')
        .select('class_id')
        .in('class_id', classIds);

      const { data: assignmentCounts } = await supabase
        .from('classwork_items')
        .select('class_id')
        .in('class_id', classIds)
        .eq('type', 'assignment');

      const countsMap = new Map<string, { students: number; assignments: number }>();
      classIds.forEach(id => countsMap.set(id, { students: 0, assignments: 0 }));
      memberCounts?.forEach(m => {
        const current = countsMap.get(m.class_id);
        if (current) current.students++;
      });
      assignmentCounts?.forEach(a => {
        const current = countsMap.get(a.class_id);
        if (current) current.assignments++;
      });

      // Fetch teacher info
      const { data: classTeachers } = await supabase
        .from('class_teachers')
        .select('class_id, teacher_id')
        .in('class_id', classIds);

      const teacherIds = [...new Set(classTeachers?.map(ct => ct.teacher_id) || [])];
      const { data: teacherProfiles } = teacherIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', teacherIds)
        : { data: [] };

      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      teacherProfiles?.forEach(p => profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }));
      
      const teacherMap = new Map<string, { name: string; avatar: string | null }>();

      classTeachers?.forEach(ct => {
        const teacherProfile = profileMap.get(ct.teacher_id);
        if (teacherProfile && !teacherMap.has(ct.class_id)) {
          teacherMap.set(ct.class_id, {
            name: teacherProfile.full_name || 'Teacher',
            avatar: teacherProfile.avatar_url,
          });
        }
      });

      setClasses((classesData || []).map(cls => ({
        ...cls,
        studentCount: countsMap.get(cls.id)?.students || 0,
        assignmentCount: countsMap.get(cls.id)?.assignments || 0,
        teacherName: teacherMap.get(cls.id)?.name,
        teacherAvatar: teacherMap.get(cls.id)?.avatar,
      })));
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user, profile, isAdmin, isTeacher, isStudent, selectedSchoolId]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium">Classwork</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent 
            ? 'View all your enrolled classes and their materials'
            : 'View all your classes and assignments'}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const classUnread = unreadCounts.byClass[cls.id];
            const totalUnread = classUnread 
              ? classUnread.classwork + classUnread.announcements 
              : 0;
            
            return (
              <ClassCard
                key={cls.id}
                id={cls.id}
                name={cls.name}
                section={cls.section}
                subject={cls.subject}
                color={cls.color || 'green'}
                classCode={cls.class_code}
                studentCount={cls.studentCount || 0}
                assignmentCount={cls.assignmentCount || 0}
                teacherName={cls.teacherName}
                teacherAvatar={cls.teacherAvatar}
                hasNewAnnouncement={classUnread?.announcements > 0}
                unreadCount={totalUnread}
              />
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display text-lg font-medium">No classes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStudent
              ? 'Join a class from the dashboard to see classwork here'
              : 'Create a class to get started'}
          </p>
        </Card>
      )}
    </div>
  );
}
