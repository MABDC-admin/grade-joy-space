import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, UserCheck, Building2, Shield } from 'lucide-react';

interface School {
  id: string;
  name: string;
}

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  school_id: string | null;
  roles: string[];
  school_name?: string;
}

interface AccountRepairSectionProps {
  users: UserData[];
  schools: School[];
  onRepairComplete: () => void;
}

export function AccountRepairSection({ users, schools, onRepairComplete }: AccountRepairSectionProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<Record<string, string>>({});

  // Find users that need repair
  const teachersWithoutSchool = users.filter(
    u => u.roles.includes('teacher') && !u.school_id
  );
  
  const usersWithSchoolButNoTeacherRole = users.filter(
    u => u.school_id && !u.roles.includes('teacher') && !u.roles.includes('admin')
  );

  const hasIssues = teachersWithoutSchool.length > 0 || usersWithSchoolButNoTeacherRole.length > 0;

  const assignSchool = async (userId: string) => {
    const schoolId = selectedSchools[userId];
    if (!schoolId) {
      toast.error('Please select a school first');
      return;
    }

    setLoadingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ school_id: schoolId })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('School assigned successfully');
      onRepairComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign school');
    } finally {
      setLoadingUserId(null);
    }
  };

  const grantTeacherRole = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'teacher' });

      if (error) throw error;
      
      toast.success('Teacher role granted successfully');
      onRepairComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant teacher role');
    } finally {
      setLoadingUserId(null);
    }
  };

  if (!hasIssues) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
            <UserCheck className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="font-medium text-success">All Accounts Healthy</p>
            <p className="text-sm text-muted-foreground">
              No teacher accounts are missing school assignments or roles.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Account Repair Needed
        </CardTitle>
        <CardDescription>
          The following accounts have issues that prevent them from functioning correctly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Teachers without school */}
        {teachersWithoutSchool.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Teachers Missing School Assignment ({teachersWithoutSchool.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              These teachers cannot create classes because they're not assigned to any school.
            </p>
            <div className="space-y-2">
              {teachersWithoutSchool.map(user => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.full_name || 'Teacher'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedSchools[user.user_id] || ''}
                      onValueChange={(value) => 
                        setSelectedSchools(prev => ({ ...prev, [user.user_id]: value }))
                      }
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map(school => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => assignSchool(user.user_id)}
                      disabled={loadingUserId === user.user_id || !selectedSchools[user.user_id]}
                    >
                      {loadingUserId === user.user_id ? 'Saving...' : 'Assign'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users with school but no teacher role (potential teachers) */}
        {usersWithSchoolButNoTeacherRole.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Users Missing Teacher Role ({usersWithSchoolButNoTeacherRole.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              These users have a school assigned but only have the student role. 
              Grant teacher role if they should be teachers.
            </p>
            <div className="space-y-2">
              {usersWithSchoolButNoTeacherRole.slice(0, 5).map(user => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.school_name && (
                      <Badge variant="outline" className="text-xs">{user.school_name}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {user.roles.join(', ') || 'No roles'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => grantTeacherRole(user.user_id)}
                      disabled={loadingUserId === user.user_id}
                    >
                      {loadingUserId === user.user_id ? 'Granting...' : 'Grant Teacher'}
                    </Button>
                  </div>
                </div>
              ))}
              {usersWithSchoolButNoTeacherRole.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  And {usersWithSchoolButNoTeacherRole.length - 5} more...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
