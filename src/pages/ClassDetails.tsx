import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Copy, FileText, BookOpen, Users, ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  description: string | null;
  class_code: string;
  color: string | null;
  grade_level: string | null;
  created_by: string | null;
}

interface Topic {
  id: string;
  name: string;
  order_index: number;
  class_id?: string;
  created_at?: string;
  items: ClassworkItem[];
}

interface ClassworkItem {
  id: string;
  title: string;
  type: 'lesson' | 'assignment';
  content: string | null;
  due_date: string | null;
  points: number | null;
  order_index: number;
}

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: 'teacher' | 'student';
}

const colorVariants: Record<string, string> = {
  green: 'class-card-gradient-green',
  blue: 'class-card-gradient-blue',
  orange: 'class-card-gradient-orange',
  purple: 'class-card-gradient-purple',
  teal: 'class-card-gradient-teal',
};

export default function ClassDetails() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, isTeacher, isAdmin } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      fetchClassData();
    }
  }, [classId]);

  const fetchClassData = async () => {
    if (!classId) return;

    setLoading(true);
    try {
      // Fetch class details
      const { data: cls, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      setClassData(cls);

      // Fetch topics with items
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('class_id', classId)
        .order('order_index');

      const { data: itemsData } = await supabase
        .from('classwork_items')
        .select('*')
        .eq('class_id', classId)
        .order('order_index');

      const topicsWithItems = (topicsData || []).map(topic => ({
        ...topic,
        items: (itemsData || []).filter(item => item.topic_id === topic.id) as ClassworkItem[],
      }));

      // Add items without topics
      const uncategorizedItems = (itemsData || []).filter(item => !item.topic_id) as ClassworkItem[];
      if (uncategorizedItems.length > 0) {
        topicsWithItems.unshift({
          id: 'uncategorized',
          name: 'Uncategorized',
          order_index: -1,
          items: uncategorizedItems,
        });
      }

      setTopics(topicsWithItems);

      // Fetch members
      const { data: teachers } = await supabase
        .from('class_teachers')
        .select('teacher_id')
        .eq('class_id', classId);

      const { data: students } = await supabase
        .from('class_members')
        .select('student_id')
        .eq('class_id', classId);

      const teacherIds = teachers?.map(t => t.teacher_id) || [];
      const studentIds = students?.map(s => s.student_id) || [];
      const allUserIds = [...teacherIds, ...studentIds];

      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', allUserIds);

        const membersList: Member[] = (profiles || []).map(p => ({
          id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role: teacherIds.includes(p.user_id) ? 'teacher' : 'student',
        }));

        setMembers(membersList);
      }
    } catch (error) {
      console.error('Error fetching class:', error);
      toast.error('Failed to load class');
    } finally {
      setLoading(false);
    }
  };

  const copyClassCode = () => {
    if (classData?.class_code) {
      navigator.clipboard.writeText(classData.class_code);
      toast.success('Class code copied!');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Class not found</p>
        <Button variant="link" onClick={() => navigate('/dashboard')}>
          Go back to dashboard
        </Button>
      </div>
    );
  }

  const gradientClass = colorVariants[classData.color || 'green'] || colorVariants.green;
  const teachers = members.filter(m => m.role === 'teacher');
  const students = members.filter(m => m.role === 'student');
  const canManage = isTeacher || isAdmin;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to classes
      </Button>

      {/* Class header */}
      <div className={cn('rounded-lg p-6 text-primary-foreground', gradientClass)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium">{classData.name}</h1>
            {classData.section && <p className="mt-1 opacity-90">{classData.section}</p>}
            {classData.subject && <p className="text-sm opacity-80">{classData.subject}</p>}
          </div>
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-white/20 text-white hover:bg-white/30"
              onClick={copyClassCode}
            >
              <Copy className="h-4 w-4" />
              Code: {classData.class_code}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stream" className="w-full">
        <TabsList>
          <TabsTrigger value="stream" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Stream
          </TabsTrigger>
          <TabsTrigger value="classwork" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classwork
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
        </TabsList>

        {/* Stream Tab */}
        <TabsContent value="stream" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* Announcement input */}
              {canManage && (
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-4">
                    <Avatar>
                      <AvatarFallback>+</AvatarFallback>
                    </Avatar>
                    <p className="text-muted-foreground">Announce something to your class...</p>
                  </CardContent>
                </Card>
              )}

              <Card className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No announcements yet</p>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No work due soon
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Classwork Tab */}
        <TabsContent value="classwork" className="mt-6">
          <div className="space-y-4">
            {canManage && (
              <div className="flex justify-end">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </div>
            )}

            {topics.length > 0 ? (
              <Accordion type="multiple" className="space-y-2">
                {topics.map((topic) => (
                  <AccordionItem key={topic.id} value={topic.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <span className="font-display font-medium">{topic.name}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {topic.items.length > 0 ? (
                        <div className="space-y-2">
                          {topic.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                            >
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full",
                                item.type === 'assignment' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                              )}>
                                {item.type === 'assignment' ? (
                                  <FileText className="h-5 w-5" />
                                ) : (
                                  <BookOpen className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.title}</p>
                                {item.due_date && (
                                  <p className="text-sm text-muted-foreground">
                                    Due {formatDate(item.due_date)}
                                  </p>
                                )}
                              </div>
                              {item.points && (
                                <Badge variant="outline">{item.points} pts</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No items in this topic</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Card className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No classwork yet</p>
                {canManage && (
                  <p className="text-sm text-muted-foreground">
                    Click "Create" to add lessons and assignments
                  </p>
                )}
              </Card>
            )}
          </div>
        </TabsContent>

        {/* People Tab */}
        <TabsContent value="people" className="mt-6 space-y-6">
          {/* Teachers */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Teachers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={teacher.avatar_url || undefined} />
                      <AvatarFallback>{teacher.full_name?.charAt(0) || 'T'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{teacher.full_name || 'Teacher'}</p>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No teachers assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Students */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">
                Students ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.length > 0 ? (
                students.map((student) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback>{student.full_name?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.full_name || 'Student'}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No students enrolled yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
