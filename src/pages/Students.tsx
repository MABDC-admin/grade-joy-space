import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Classmate {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  grade_level: string | null;
  section: string | null;
}

interface ClassWithClassmates {
  id: string;
  name: string;
  subject: string | null;
  classmates: Classmate[];
}

export default function Students() {
  const { user, isStudent } = useAuth();
  const [classesWithClassmates, setClassesWithClassmates] = useState<ClassWithClassmates[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchClassmates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get student's enrolled classes
      const { data: memberClasses } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      const classIds = memberClasses?.map(c => c.class_id) || [];

      if (classIds.length === 0) {
        setClassesWithClassmates([]);
        setLoading(false);
        return;
      }

      // Get class details
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, subject')
        .in('id', classIds);

      // Get all classmates from these classes
      const { data: allMembers } = await supabase
        .from('class_members')
        .select('class_id, student_id')
        .in('class_id', classIds);

      // Get unique student IDs (excluding current user)
      const studentIds = [...new Set(
        allMembers
          ?.filter(m => m.student_id !== user.id)
          .map(m => m.student_id) || []
      )];

      // Fetch profiles for all classmates
      const { data: profiles } = studentIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, full_name, email, avatar_url, grade_level, section')
            .in('user_id', studentIds)
        : { data: [] };

      const profileMap = new Map<string, Classmate>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      // Group classmates by class
      const classesWithStudents: ClassWithClassmates[] = (classes || []).map(cls => {
        const classMembers = allMembers
          ?.filter(m => m.class_id === cls.id && m.student_id !== user.id)
          .map(m => profileMap.get(m.student_id))
          .filter(Boolean) as Classmate[];

        return {
          id: cls.id,
          name: cls.name,
          subject: cls.subject,
          classmates: classMembers || [],
        };
      });

      setClassesWithClassmates(classesWithStudents);
    } catch (error) {
      console.error('Error fetching classmates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchClassmates();
    }
  }, [user, isStudent]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter classmates based on search
  const filteredClasses = classesWithClassmates.map(cls => ({
    ...cls,
    classmates: cls.classmates.filter(classmate =>
      classmate.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classmate.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cls => cls.classmates.length > 0 || searchQuery === '');

  const totalClassmates = [...new Set(
    classesWithClassmates.flatMap(cls => cls.classmates.map(c => c.user_id))
  )].length;

  if (!isStudent) {
    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="font-display text-2xl font-medium">Students</h1>
          <p className="text-sm text-muted-foreground">
            View and manage students across your classes
          </p>
        </div>

        <Card className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display text-lg font-medium">Student Directory</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a class to view its enrolled students
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium">Classmates</h1>
          <p className="text-sm text-muted-foreground">
            Students enrolled in the same classes as you
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Users className="h-3 w-3 mr-1" />
          {totalClassmates} classmates
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search classmates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="space-y-6">
          {filteredClasses.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {cls.name}
                  {cls.subject && (
                    <span className="text-muted-foreground font-normal">• {cls.subject}</span>
                  )}
                  <Badge variant="outline" className="ml-auto">
                    {cls.classmates.length} students
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cls.classmates.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cls.classmates.map((classmate) => (
                      <div
                        key={classmate.user_id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={classmate.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {getInitials(classmate.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {classmate.full_name || 'Student'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {classmate.section || classmate.grade_level || classmate.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No other students in this class yet
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display text-lg font-medium">No results found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No classmates match "{searchQuery}"
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display text-lg font-medium">No classmates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a class to see your classmates
          </p>
        </Card>
      )}
    </div>
  );
}
