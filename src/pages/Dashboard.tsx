import { useEffect, useState } from 'react';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { CreateClassDialog } from '@/components/dashboard/CreateClassDialog';
import { JoinClassDialog } from '@/components/dashboard/JoinClassDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  color: string | null;
  class_code: string;
  created_by: string | null;
}

interface UpcomingItem {
  id: string;
  title: string;
  due_date: string | null;
  class_name: string;
  type: string;
}

export default function Dashboard() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch classes based on role
      if (isAdmin || isTeacher) {
        // Teachers see classes they created or teach
        const { data: teachingClasses } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);

        const classIds = teachingClasses?.map(c => c.class_id) || [];

        if (classIds.length > 0) {
          const { data } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          setClasses(data || []);
        } else {
          // Also check created_by
          const { data } = await supabase
            .from('classes')
            .select('*')
            .eq('created_by', user.id);
          setClasses(data || []);
        }
      } else {
        // Students see classes they joined
        const { data: memberClasses } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);

        const classIds = memberClasses?.map(c => c.class_id) || [];

        if (classIds.length > 0) {
          const { data } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          setClasses(data || []);
        } else {
          setClasses([]);
        }
      }

      // Fetch upcoming assignments
      const { data: items } = await supabase
        .from('classwork_items')
        .select(`
          id,
          title,
          due_date,
          type,
          classes (name)
        `)
        .eq('type', 'assignment')
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (items) {
        setUpcomingItems(
          items.map((item: any) => ({
            id: item.id,
            title: item.title,
            due_date: item.due_date,
            class_name: item.classes?.name || '',
            type: item.type,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user, isAdmin, isTeacher]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium">My Classes</h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher || isAdmin ? 'Manage your classes' : 'View your enrolled classes'}
          </p>
        </div>
        <div className="flex gap-2">
          {isStudent && <JoinClassDialog onClassJoined={fetchClasses} />}
          {(isTeacher || isAdmin) && <CreateClassDialog onClassCreated={fetchClasses} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Classes Grid */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : classes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((cls) => (
                <ClassCard
                  key={cls.id}
                  id={cls.id}
                  name={cls.name}
                  section={cls.section}
                  subject={cls.subject}
                  color={cls.color || 'green'}
                  classCode={cls.class_code}
                />
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-display text-lg font-medium">No classes yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isTeacher || isAdmin
                  ? 'Create your first class to get started'
                  : 'Join a class using the class code from your teacher'}
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingItems.length > 0 ? (
                upcomingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.class_name}</p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatDate(item.due_date)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No upcoming assignments
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground py-4">
                Activity will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
