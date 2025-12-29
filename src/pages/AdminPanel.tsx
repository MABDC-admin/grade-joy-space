import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  BookOpen, 
  Shield, 
  UserPlus, 
  Building2,
  GraduationCap,
  School,
  RefreshCw
} from 'lucide-react';
import { CreateSchoolDialog } from '@/components/admin/CreateSchoolDialog';
import { CreateTeacherDialog } from '@/components/admin/CreateTeacherDialog';
import { CreateStudentDialog } from '@/components/admin/CreateStudentDialog';
import { AccountRepairSection } from '@/components/admin/AccountRepairSection';
import { Button } from '@/components/ui/button';

interface SchoolData {
  id: string;
  name: string;
  code: string;
  address: string | null;
}

interface GradeLevel {
  id: string;
  name: string;
  order_index: number;
}

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  school_id: string | null;
  grade_level_id: string | null;
  grade_level: string | null;
  section: string | null;
  roles: string[];
  school_name?: string;
}

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  class_code: string;
  student_count: number;
  school_name?: string;
  grade_level_name?: string;
}

export default function AdminPanel() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [roleConfirmDialog, setRoleConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    role: 'admin' | 'teacher' | 'student';
    action: 'add' | 'remove';
  } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch schools
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      setSchools(schoolsData || []);

      // Fetch grade levels
      const { data: gradesData } = await supabase
        .from('grade_levels')
        .select('*')
        .order('order_index');
      setGradeLevels(gradesData || []);

      // Fetch all profiles with their roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      const usersWithRoles = (profiles || []).map(profile => {
        const school = schoolsData?.find(s => s.id === profile.school_id);
        return {
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          school_id: profile.school_id,
          grade_level_id: profile.grade_level_id,
          grade_level: profile.grade_level,
          section: profile.section,
          roles: (roles || [])
            .filter(r => r.user_id === profile.user_id)
            .map(r => r.role),
          school_name: school?.name,
        };
      });

      setUsers(usersWithRoles);

      // Fetch all classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*');

      const { data: members } = await supabase
        .from('class_members')
        .select('class_id');

      const classesWithCounts = (classesData || []).map(cls => {
        const school = schoolsData?.find(s => s.id === cls.school_id);
        const grade = gradesData?.find(g => g.id === cls.grade_level_id);
        return {
          id: cls.id,
          name: cls.name,
          section: cls.section,
          class_code: cls.class_code,
          student_count: (members || []).filter(m => m.class_id === cls.id).length,
          school_name: school?.name,
          grade_level_name: grade?.name,
        };
      });

      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRoleConfirmDialog = (
    userId: string,
    userName: string,
    role: 'admin' | 'teacher' | 'student',
    hasRole: boolean
  ) => {
    setRoleConfirmDialog({
      open: true,
      userId,
      userName,
      role,
      action: hasRole ? 'remove' : 'add',
    });
  };

  const confirmRoleChange = async () => {
    if (!roleConfirmDialog) return;
    
    const { userId, role, action } = roleConfirmDialog;
    
    try {
      if (action === 'remove') {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        toast.success(`Removed ${role} role`);
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        toast.success(`Added ${role} role`);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setRoleConfirmDialog(null);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const teachers = users.filter(u => u.roles.includes('teacher'));
  const students = users.filter(u => u.roles.includes('student') && !u.roles.includes('teacher'));
  
  const filteredStudents = students.filter(s => {
    if (selectedSchool !== 'all' && s.school_id !== selectedSchool) return false;
    if (selectedGrade !== 'all' && s.grade_level_id !== selectedGrade) return false;
    return true;
  });

  const filteredTeachers = teachers.filter(t => {
    if (selectedSchool !== 'all' && t.school_id !== selectedSchool) return false;
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage schools, teachers, students, and classes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{schools.length}</p>
              <p className="text-sm text-muted-foreground">Schools</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teachers.length}</p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
              <GraduationCap className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <BookOpen className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classes.length}</p>
              <p className="text-sm text-muted-foreground">Classes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Repair Section */}
      <AccountRepairSection
        users={users}
        schools={schools}
        onRepairComplete={fetchData}
      />

      <Tabs defaultValue="schools">
        <TabsList>
          <TabsTrigger value="schools" className="gap-2">
            <Building2 className="h-4 w-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2">
            <Users className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classes
          </TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Schools</CardTitle>
              <CreateSchoolDialog onSchoolCreated={fetchData} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : schools.length > 0 ? (
                <div className="space-y-3">
                  {schools.map(school => (
                    <div
                      key={school.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <School className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{school.name}</p>
                          {school.address && (
                            <p className="text-sm text-muted-foreground">{school.address}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">Code: {school.code}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No schools yet. Create your first school to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Teachers</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map(school => (
                      <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CreateTeacherDialog schools={schools} onTeacherCreated={fetchData} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : filteredTeachers.length > 0 ? (
                <div className="space-y-3">
                  {filteredTeachers.map(user => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Teacher'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.school_name && (
                          <Badge variant="outline">{user.school_name}</Badge>
                        )}
                        <Button
                          variant={user.roles.includes('admin') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => openRoleConfirmDialog(
                            user.user_id,
                            user.full_name || user.email,
                            'admin',
                            user.roles.includes('admin')
                          )}
                        >
                          Admin
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No teachers found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Students</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map(school => (
                      <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {gradeLevels.sort((a, b) => a.order_index - b.order_index).map(grade => (
                      <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CreateStudentDialog 
                  schools={schools} 
                  gradeLevels={gradeLevels} 
                  onStudentCreated={fetchData} 
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-3">
                  {filteredStudents.map(user => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Student'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.grade_level && (
                          <Badge variant="outline">{user.grade_level}</Badge>
                        )}
                        {user.section && (
                          <Badge variant="secondary">Sec. {user.section}</Badge>
                        )}
                        {user.school_name && (
                          <Badge variant="outline" className="hidden sm:inline-flex">
                            {user.school_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No students found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : classes.length > 0 ? (
                <div className="space-y-3">
                  {classes.map(cls => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <div className="flex gap-2 mt-1">
                          {cls.school_name && (
                            <span className="text-sm text-muted-foreground">{cls.school_name}</span>
                          )}
                          {cls.grade_level_name && (
                            <span className="text-sm text-muted-foreground">• {cls.grade_level_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{cls.student_count} students</Badge>
                        <Badge variant="secondary">Code: {cls.class_code}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No classes yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog 
        open={roleConfirmDialog?.open ?? false} 
        onOpenChange={(open) => !open && setRoleConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleConfirmDialog?.action === 'remove' ? 'Remove' : 'Add'} {roleConfirmDialog?.role} role?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleConfirmDialog?.action === 'remove' ? (
                <>
                  Are you sure you want to remove the <strong>{roleConfirmDialog?.role}</strong> role 
                  from <strong>{roleConfirmDialog?.userName}</strong>? This action can be undone later.
                </>
              ) : (
                <>
                  Are you sure you want to grant the <strong>{roleConfirmDialog?.role}</strong> role 
                  to <strong>{roleConfirmDialog?.userName}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              className={roleConfirmDialog?.action === 'remove' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {roleConfirmDialog?.action === 'remove' ? 'Remove Role' : 'Add Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
