import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvailableTeacher {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface AddTeacherDialogProps {
  classId: string;
  schoolId: string | null;
  existingTeacherIds: string[];
  onTeacherAdded?: () => void;
}

export function AddTeacherDialog({
  classId,
  schoolId,
  existingTeacherIds,
  onTeacherAdded,
}: AddTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingTeacherId, setAddingTeacherId] = useState<string | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<AvailableTeacher[]>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableTeachers();
    }
  }, [open, schoolId, existingTeacherIds]);

  const fetchAvailableTeachers = async () => {
    setLoading(true);
    try {
      // Get all teachers (users with teacher role)
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      const teacherUserIds = teacherRoles?.map(r => r.user_id) || [];

      if (teacherUserIds.length === 0) {
        setAvailableTeachers([]);
        return;
      }

      // Get profiles of teachers
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', teacherUserIds);

      // Filter by school if class has a school
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data: profiles } = await query;

      // Filter out teachers already in the class
      const available = (profiles || [])
        .filter(p => !existingTeacherIds.includes(p.user_id))
        .map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
        }));

      setAvailableTeachers(available);
    } catch (error) {
      console.error('Error fetching available teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTeacherToClass = async (teacherId: string) => {
    setAddingTeacherId(teacherId);
    try {
      const { error } = await supabase.from('class_teachers').insert({
        class_id: classId,
        teacher_id: teacherId,
      });

      if (error) throw error;

      toast.success('Teacher added to class');
      setAvailableTeachers(prev => prev.filter(t => t.user_id !== teacherId));
      onTeacherAdded?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add teacher');
    } finally {
      setAddingTeacherId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Teacher to Class</DialogTitle>
          <DialogDescription>
            Select a teacher from the same school to add to this class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableTeachers.length > 0 ? (
            availableTeachers.map((teacher) => (
              <div key={teacher.user_id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={teacher.avatar_url || undefined} />
                    <AvatarFallback>{teacher.full_name?.charAt(0) || 'T'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{teacher.full_name || 'Teacher'}</p>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => addTeacherToClass(teacher.user_id)}
                  disabled={addingTeacherId === teacher.user_id}
                >
                  {addingTeacherId === teacher.user_id ? (
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
            <p className="text-center text-sm text-muted-foreground py-8">
              No available teachers to add
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
