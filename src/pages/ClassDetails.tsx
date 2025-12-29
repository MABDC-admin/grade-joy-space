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
import { ArrowLeft, Copy, FileText, BookOpen, Users, UserPlus, Loader2, MoreVertical, Pencil, Trash2, ChevronDown, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CreateTopicDialog } from '@/components/classwork/CreateTopicDialog';
import { CreateClassworkDialog } from '@/components/classwork/CreateClassworkDialog';
import { EditClassDialog } from '@/components/class/EditClassDialog';
import { DeleteClassDialog } from '@/components/class/DeleteClassDialog';
import { AddTeacherDialog } from '@/components/class/AddTeacherDialog';
import { EditTopicDialog } from '@/components/classwork/EditTopicDialog';
import { DeleteTopicDialog } from '@/components/classwork/DeleteTopicDialog';
import { EditClassworkDialog } from '@/components/classwork/EditClassworkDialog';
import { DeleteClassworkDialog } from '@/components/classwork/DeleteClassworkDialog';
import { FileGrid } from '@/components/classwork/FileGrid';
import { FilePreviewDialog } from '@/components/ui/file-preview-dialog';
import { ClassSettingsDialog } from '@/components/class/ClassSettingsDialog';
import { ClassAnnouncementBanner } from '@/components/class/ClassAnnouncementBanner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  description: string | null;
  class_code: string;
  color: string | null;
  grade_level: string | null;
  grade_level_id: string | null;
  created_by: string | null;
  school_id: string | null;
  banner_url?: string | null;
}

interface Topic {
  id: string;
  name: string;
  order_index: number;
  class_id?: string;
  created_at?: string;
  color: string;
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
  topic_id: string | null;
  attachments: any[] | null;
}

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: 'teacher' | 'student';
}

interface AvailableStudent {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface PreviewFile {
  url: string;
  name: string;
  type?: string;
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
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  
  // Topic edit/delete state
  const [editTopicDialog, setEditTopicDialog] = useState<{ open: boolean; topic: Topic | null }>({ open: false, topic: null });
  const [deleteTopicDialog, setDeleteTopicDialog] = useState<{ open: boolean; topic: Topic | null }>({ open: false, topic: null });
  
  // Classwork edit/delete state
  const [editClassworkDialog, setEditClassworkDialog] = useState<{ open: boolean; item: ClassworkItem | null }>({ open: false, item: null });
  const [deleteClassworkDialog, setDeleteClassworkDialog] = useState<{ open: boolean; item: ClassworkItem | null }>({ open: false, item: null });
  
  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

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
          class_id: classId,
          created_at: new Date().toISOString(),
          color: 'gray',
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
      } else {
        setMembers([]);
      }

      // Fetch available students (same grade level, not in class)
      if (cls.grade_level_id) {
        await fetchAvailableStudents(cls.grade_level_id, studentIds);
      }
    } catch (error) {
      console.error('Error fetching class:', error);
      toast.error('Failed to load class');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async (gradeLevelId: string, existingStudentIds: string[]) => {
    try {
      // Get all students with the same grade level
      const { data: studentsWithGrade } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('grade_level_id', gradeLevelId);

      // Get user_ids that have student role
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentRoleIds = studentRoles?.map(r => r.user_id) || [];

      // Filter to only students who aren't already in the class
      const available = (studentsWithGrade || [])
        .filter(p => 
          studentRoleIds.includes(p.user_id) && 
          !existingStudentIds.includes(p.user_id)
        )
        .map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
        }));

      setAvailableStudents(available);
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  const addStudentToClass = async (studentId: string) => {
    if (!classId) return;
    
    setAddingStudentId(studentId);
    try {
      const { error } = await supabase
        .from('class_members')
        .insert({
          class_id: classId,
          student_id: studentId,
        });

      if (error) throw error;

      toast.success('Student added to class');
      
      // Update local state
      const addedStudent = availableStudents.find(s => s.user_id === studentId);
      if (addedStudent) {
        setMembers(prev => [...prev, {
          id: addedStudent.user_id,
          full_name: addedStudent.full_name,
          email: addedStudent.email,
          avatar_url: addedStudent.avatar_url,
          role: 'student',
        }]);
        setAvailableStudents(prev => prev.filter(s => s.user_id !== studentId));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add student');
    } finally {
      setAddingStudentId(null);
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

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getAttachments = (item: ClassworkItem) => {
    return (item.attachments || []).map((att: any) => ({
      url: att.url || att.file_url,
      name: att.name || att.file_name || 'File',
      type: att.type || att.file_type,
    }));
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
  const canEdit = isAdmin;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to classes
      </Button>

      {/* Class header */}
      <div 
        className={cn('rounded-lg p-6 text-primary-foreground relative overflow-hidden', gradientClass)}
        style={classData.banner_url ? { 
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${classData.banner_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between relative z-10">
          <div>
            <h1 className="font-display text-2xl font-medium">{classData.name}</h1>
            {classData.section && <p className="mt-1 opacity-90">{classData.section}</p>}
            {classData.subject && <p className="text-sm opacity-80">{classData.subject}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 bg-white/20 text-white hover:bg-white/30"
                  onClick={copyClassCode}
                >
                  <Copy className="h-4 w-4" />
                  Code: {classData.class_code}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white/20 text-white hover:bg-white/30"
                  onClick={() => setSettingsDialogOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
            {canEdit && (
              <DeleteClassDialog classId={classData.id} className={classData.name} />
            )}
          </div>
        </div>
      </div>

      {/* Announcement Banner for Students */}
      <ClassAnnouncementBanner classId={classData.id} />

      {/* Tabs */}
      <Tabs defaultValue="classwork" className="w-full">
        <TabsList>
          <TabsTrigger value="classwork" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classwork
          </TabsTrigger>
          <TabsTrigger value="participants" className="gap-2">
            <Users className="h-4 w-4" />
            Participants
          </TabsTrigger>
        </TabsList>

        {/* Classwork Tab */}
        <TabsContent value="classwork" className="mt-6">
          <div className="space-y-4">
            {canManage && (
              <div className="flex justify-end gap-2">
                <CreateTopicDialog classId={classData.id} onTopicCreated={fetchClassData} />
                <CreateClassworkDialog 
                  classId={classData.id} 
                  topics={topics.filter(t => t.id !== 'uncategorized')} 
                  onClassworkCreated={fetchClassData} 
                />
              </div>
            )}

            {topics.length > 0 ? (
              <Accordion type="multiple" className="space-y-2">
                {topics.map((topic) => {
                  const topicColorClass = topic.color ? `bg-${topic.color}-500` : 'bg-blue-500';
                  return (
                    <AccordionItem key={topic.id} value={topic.id} className="border rounded-lg overflow-hidden">
                      <div className={cn("h-2", topicColorClass)} />
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between flex-1 pr-2">
                          <span className="font-display font-medium">{topic.name}</span>
                          {canManage && topic.id !== 'uncategorized' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => setEditTopicDialog({ open: true, topic })}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteTopicDialog({ open: true, topic })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {topic.items.length > 0 ? (
                          <div className="space-y-2">
                            {topic.items.map((item) => {
                              const isExpanded = expandedItems.includes(item.id);
                              const attachments = getAttachments(item);
                              
                              return (
                                <Collapsible 
                                  key={item.id} 
                                  open={isExpanded}
                                  onOpenChange={() => toggleItemExpanded(item.id)}
                                >
                                  <div className="rounded-lg border overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer">
                                        <div 
                                          className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
                                            item.type === 'assignment' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                          )}
                                        >
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
                                          <Badge variant="outline" className="shrink-0">{item.points} pts</Badge>
                                        )}
                                        {attachments.length > 0 && (
                                          <Badge variant="secondary" className="shrink-0">{attachments.length} file(s)</Badge>
                                        )}
                                        <ChevronDown className={cn(
                                          "h-4 w-4 shrink-0 transition-transform text-muted-foreground",
                                          isExpanded && "rotate-180"
                                        )} />
                                        {canManage && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                              <DropdownMenuItem onClick={() => setEditClassworkDialog({ open: true, item })}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                className="text-destructive"
                                                onClick={() => setDeleteClassworkDialog({ open: true, item })}
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                                        <div className="pt-3 space-y-4">
                                          {/* Content */}
                                          {item.content && (
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                                {item.type === 'assignment' ? 'Instructions' : 'Content'}
                                              </p>
                                              <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                                            </div>
                                          )}
                                          
                                          {/* File Grid */}
                                          {attachments.length > 0 && (
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground mb-2">Attachments</p>
                                              <FileGrid 
                                                attachments={attachments} 
                                                onFileClick={(file) => setPreviewFile(file)} 
                                              />
                                            </div>
                                          )}
                                          
                                          {/* View Details Button */}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => navigate(
                                              item.type === 'assignment' 
                                                ? `/assignment/${item.id}` 
                                                : `/material/${item.id}`
                                            )}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                            View Full Details
                                          </Button>
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No items in this topic</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
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

          {/* Topic Dialogs */}
          {editTopicDialog.topic && (
            <EditTopicDialog
              open={editTopicDialog.open}
              onOpenChange={(open) => setEditTopicDialog({ open, topic: open ? editTopicDialog.topic : null })}
              topic={editTopicDialog.topic}
              onTopicUpdated={fetchClassData}
            />
          )}
          {deleteTopicDialog.topic && (
            <DeleteTopicDialog
              open={deleteTopicDialog.open}
              onOpenChange={(open) => setDeleteTopicDialog({ open, topic: open ? deleteTopicDialog.topic : null })}
              topic={deleteTopicDialog.topic}
              onTopicDeleted={fetchClassData}
            />
          )}

          {/* Classwork Dialogs */}
          {editClassworkDialog.item && (
            <EditClassworkDialog
              open={editClassworkDialog.open}
              onOpenChange={(open) => setEditClassworkDialog({ open, item: open ? editClassworkDialog.item : null })}
              item={editClassworkDialog.item}
              topics={topics.filter(t => t.id !== 'uncategorized')}
              onClassworkUpdated={fetchClassData}
            />
          )}
          {deleteClassworkDialog.item && (
            <DeleteClassworkDialog
              open={deleteClassworkDialog.open}
              onOpenChange={(open) => setDeleteClassworkDialog({ open, item: open ? deleteClassworkDialog.item : null })}
              item={deleteClassworkDialog.item}
              onClassworkDeleted={fetchClassData}
            />
          )}
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="mt-6 space-y-6">
          {/* Teachers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Teachers</CardTitle>
              {canEdit && (
                <AddTeacherDialog
                  classId={classData.id}
                  schoolId={classData.school_id}
                  existingTeacherIds={teachers.map(t => t.id)}
                  onTeacherAdded={fetchClassData}
                />
              )}
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

          {/* Available Students (Same Grade Level) - Only visible to teachers/admins */}
          {canManage && classData.grade_level_id && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg">
                    Available Students
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Students in {classData.grade_level || 'this grade level'} not yet enrolled
                  </p>
                </div>
                <Badge variant="secondary">{availableStudents.length} available</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableStudents.length > 0 ? (
                  availableStudents.map((student) => (
                    <div key={student.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={student.avatar_url || undefined} />
                          <AvatarFallback>{student.full_name?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.full_name || 'Student'}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => addStudentToClass(student.user_id)}
                        disabled={addingStudentId === student.user_id}
                      >
                        {addingStudentId === student.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    All students in this grade level are already enrolled
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />

      {/* Class Settings Dialog */}
      {classData && (
        <ClassSettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          classData={classData}
          onUpdate={fetchClassData}
        />
      )}
    </div>
  );
}
