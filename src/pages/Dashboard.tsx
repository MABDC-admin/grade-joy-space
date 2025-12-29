import { useEffect, useState } from 'react';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { CreateClassDialog } from '@/components/dashboard/CreateClassDialog';
import { JoinClassDialog } from '@/components/dashboard/JoinClassDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnreadContent } from '@/hooks/useUnreadContent';
import { useNavigate } from 'react-router-dom';

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  color: string | null;
  class_code: string;
  created_by: string | null;
  school_id: string | null;
}

interface UpcomingItem {
  id: string;
  title: string;
  due_date: string | null;
  class_name: string;
  class_id: string;
  type: string;
  status?: string;
}

export default function Dashboard() {
  const { user, profile, isAdmin, isTeacher, isStudent } = useAuth();
  const { selectedSchoolId } = useSchool();
  const { unreadCounts } = useUnreadContent();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const effectiveSchoolId = isAdmin ? selectedSchoolId : profile?.school_id;

      if (isAdmin || isTeacher) {
        const { data: teachingClasses } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);

        const classIds = teachingClasses?.map(c => c.class_id) || [];

        if (classIds.length > 0) {
          let query = supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          
          if (effectiveSchoolId) {
            query = query.eq('school_id', effectiveSchoolId);
          }
          
          const { data } = await query;
          setClasses(data || []);
        } else {
          let query = supabase
            .from('classes')
            .select('*')
            .eq('created_by', user.id);
          
          if (effectiveSchoolId) {
            query = query.eq('school_id', effectiveSchoolId);
          }
          
          const { data } = await query;
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
          let query = supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          
          if (effectiveSchoolId) {
            query = query.eq('school_id', effectiveSchoolId);
          }
          
          const { data } = await query;
          setClasses(data || []);

          // For students, fetch upcoming assignments from their enrolled classes
          await fetchUpcomingForStudent(classIds);
        } else {
          setClasses([]);
          setUpcomingItems([]);
        }
        return;
      }

      // For teachers/admins, fetch general upcoming
      const { data: items } = await supabase
        .from('classwork_items')
        .select(`
          id,
          title,
          due_date,
          type,
          class_id,
          classes (name, school_id)
        `)
        .eq('type', 'assignment')
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (items) {
        const filteredItems = effectiveSchoolId
          ? items.filter((item: any) => item.classes?.school_id === effectiveSchoolId)
          : items;
        
        setUpcomingItems(
          filteredItems.map((item: any) => ({
            id: item.id,
            title: item.title,
            due_date: item.due_date,
            class_name: item.classes?.name || '',
            class_id: item.class_id,
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

  const fetchUpcomingForStudent = async (classIds: string[]) => {
    if (classIds.length === 0) {
      setUpcomingItems([]);
      return;
    }

    try {
      // Get assignments from enrolled classes
      const { data: assignments } = await supabase
        .from('classwork_items')
        .select(`
          id,
          title,
          due_date,
          type,
          class_id,
          classes (name)
        `)
        .eq('type', 'assignment')
        .in('class_id', classIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(10);

      if (!assignments) {
        setUpcomingItems([]);
        return;
      }

      // Get submission status for each assignment
      const { data: submissions } = await supabase
        .from('submissions')
        .select('assignment_id, status')
        .eq('student_id', user!.id)
        .in('assignment_id', assignments.map(a => a.id));

      const submissionMap = new Map(
        submissions?.map(s => [s.assignment_id, s.status]) || []
      );

      setUpcomingItems(
        assignments.map((item: any) => ({
          id: item.id,
          title: item.title,
          due_date: item.due_date,
          class_name: item.classes?.name || '',
          class_id: item.class_id,
          type: item.type,
          status: submissionMap.get(item.id) || 'assigned',
        }))
      );
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user, profile, isAdmin, isTeacher, selectedSchoolId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 0) return 'Overdue';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status?: string, dueDate?: string | null) => {
    if (status === 'submitted' || status === 'graded') {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Submitted</Badge>;
    }
    
    if (dueDate) {
      const now = new Date();
      const due = new Date(dueDate);
      if (due < now) {
        return <Badge variant="destructive">Missing</Badge>;
      }
    }
    
    return null;
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium">My Classes</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Manage your classes' : isTeacher ? 'View and manage your assigned classes' : 'View your enrolled classes'}
          </p>
        </div>
        <div className="flex gap-2">
          {isStudent && <JoinClassDialog onClassJoined={fetchClasses} />}
          {isAdmin && <CreateClassDialog onClassCreated={fetchClasses} />}
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
                    hasNewAnnouncement={classUnread?.announcements > 0}
                    unreadCount={totalUnread}
                  />
                );
              })}
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
                  <button
                    key={item.id}
                    onClick={() => navigate(`/assignment/${item.id}`)}
                    className="w-full flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        {getStatusBadge(item.status, item.due_date)}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.class_name}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDate(item.due_date)}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
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
