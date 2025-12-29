import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users, BookOpen, Shield, UserPlus } from 'lucide-react';

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: string[];
}

interface ClassData {
  id: string;
  name: string;
  section: string | null;
  class_code: string;
  student_count: number;
}

export default function AdminPanel() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles with their roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      const usersWithRoles = (profiles || []).map(profile => ({
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        roles: (roles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role),
      }));

      setUsers(usersWithRoles);

      // Fetch all classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*');

      const { data: members } = await supabase
        .from('class_members')
        .select('class_id');

      const classesWithCounts = (classesData || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        section: cls.section,
        class_code: cls.class_code,
        student_count: (members || []).filter(m => m.class_id === cls.id).length,
      }));

      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, role: 'admin' | 'teacher' | 'student', hasRole: boolean) => {
    try {
      if (hasRole) {
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

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Admin Panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage users, classes, and system settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classes.length}</p>
              <p className="text-sm text-muted-foreground">Total Classes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
              <UserPlus className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter(u => u.roles.includes('teacher')).length}
              </p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map(user => (
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
                          <p className="font-medium">{user.full_name || 'User'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {['admin', 'teacher', 'student'].map(role => {
                          const hasRole = user.roles.includes(role);
                          return (
                            <Button
                              key={role}
                              variant={hasRole ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleRole(user.user_id, role as any, hasRole)}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16" />
                  ))}
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
                        {cls.section && (
                          <p className="text-sm text-muted-foreground">{cls.section}</p>
                        )}
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
    </div>
  );
}
