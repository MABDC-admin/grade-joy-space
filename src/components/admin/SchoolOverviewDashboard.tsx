import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  Shield,
  ChevronRight
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SchoolData {
  id: string;
  name: string;
  code: string;
}

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  school_id: string | null;
  roles: string[];
}

interface SchoolOverviewDashboardProps {
  schools: SchoolData[];
  users: UserData[];
}

interface SchoolStats {
  school: SchoolData;
  admins: number;
  teachers: number;
  students: number;
  total: number;
}

export function SchoolOverviewDashboard({ schools, users }: SchoolOverviewDashboardProps) {
  // Calculate stats per school
  const schoolStats: SchoolStats[] = schools.map(school => {
    const schoolUsers = users.filter(u => u.school_id === school.id);
    return {
      school,
      admins: schoolUsers.filter(u => u.roles.includes('admin')).length,
      teachers: schoolUsers.filter(u => u.roles.includes('teacher')).length,
      students: schoolUsers.filter(u => u.roles.includes('student') && !u.roles.includes('teacher')).length,
      total: schoolUsers.length,
    };
  });

  // Users without school assignment
  const unassignedUsers = users.filter(u => !u.school_id);
  const unassignedStats = {
    admins: unassignedUsers.filter(u => u.roles.includes('admin')).length,
    teachers: unassignedUsers.filter(u => u.roles.includes('teacher')).length,
    students: unassignedUsers.filter(u => u.roles.includes('student') && !u.roles.includes('teacher')).length,
    total: unassignedUsers.length,
  };

  // Global totals
  const totalAdmins = users.filter(u => u.roles.includes('admin')).length;
  const totalTeachers = users.filter(u => u.roles.includes('teacher')).length;
  const totalStudents = users.filter(u => u.roles.includes('student') && !u.roles.includes('teacher')).length;

  return (
    <div className="space-y-6">
      {/* Global Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{schools.length}</p>
              <p className="text-sm text-muted-foreground">Total Schools</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAdmins}</p>
              <p className="text-sm text-muted-foreground">Total Admins</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTeachers}</p>
              <p className="text-sm text-muted-foreground">Total Teachers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
              <GraduationCap className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users by School Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Users by School
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Shield className="h-4 w-4 text-destructive" />
                    Admins
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-accent" />
                    Teachers
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <GraduationCap className="h-4 w-4 text-warning" />
                    Students
                  </div>
                </TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolStats.map(({ school, admins, teachers, students, total }) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{school.name}</p>
                        <p className="text-xs text-muted-foreground">Code: {school.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={admins > 0 ? "destructive" : "secondary"} className="min-w-[2rem]">
                      {admins}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={teachers > 0 ? "default" : "secondary"} className="min-w-[2rem]">
                      {teachers}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={students > 0 ? "outline" : "secondary"} className="min-w-[2rem]">
                      {students}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold">{total}</span>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Unassigned Users Row */}
              {unassignedStats.total > 0 && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Unassigned</p>
                        <p className="text-xs text-muted-foreground">No school assigned</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={unassignedStats.admins > 0 ? "destructive" : "secondary"} className="min-w-[2rem]">
                      {unassignedStats.admins}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={unassignedStats.teachers > 0 ? "default" : "secondary"} className="min-w-[2rem]">
                      {unassignedStats.teachers}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={unassignedStats.students > 0 ? "outline" : "secondary"} className="min-w-[2rem]">
                      {unassignedStats.students}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold">{unassignedStats.total}</span>
                  </TableCell>
                </TableRow>
              )}

              {/* Totals Row */}
              <TableRow className="bg-primary/5 font-semibold">
                <TableCell>
                  <p className="font-semibold">Total</p>
                </TableCell>
                <TableCell className="text-center">{totalAdmins}</TableCell>
                <TableCell className="text-center">{totalTeachers}</TableCell>
                <TableCell className="text-center">{totalStudents}</TableCell>
                <TableCell className="text-center">{users.length}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-School Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {schoolStats.map(({ school, admins, teachers, students, total }) => (
          <Card key={school.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {school.name}
                </span>
                <Badge variant="secondary">{school.code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Shield className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-2xl font-bold">{admins}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-2xl font-bold">{teachers}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-warning" />
                  </div>
                  <p className="text-2xl font-bold">{students}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Total Users</span>
                <span className="font-semibold">{total}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
