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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GradeLevel {
  id: string;
  name: string;
  order_index: number;
}

interface AssignGradeLevelsDialogProps {
  teacherId: string;
  teacherName: string;
  gradeLevels: GradeLevel[];
  onAssignmentsChanged?: () => void;
}

export function AssignGradeLevelsDialog({
  teacherId,
  teacherName,
  gradeLevels,
  onAssignmentsChanged,
}: AssignGradeLevelsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignedGradeLevelIds, setAssignedGradeLevelIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchAssignedGradeLevels();
    }
  }, [open, teacherId]);

  const fetchAssignedGradeLevels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_grade_levels')
        .select('grade_level_id')
        .eq('teacher_id', teacherId);

      if (error) throw error;
      setAssignedGradeLevelIds(data?.map(d => d.grade_level_id) || []);
    } catch (error) {
      console.error('Error fetching assigned grade levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (gradeLevelId: string) => {
    setAssignedGradeLevelIds(prev =>
      prev.includes(gradeLevelId)
        ? prev.filter(id => id !== gradeLevelId)
        : [...prev, gradeLevelId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current assignments
      const { data: currentAssignments } = await supabase
        .from('teacher_grade_levels')
        .select('grade_level_id')
        .eq('teacher_id', teacherId);

      const currentIds = currentAssignments?.map(a => a.grade_level_id) || [];

      // Find what to add and what to remove
      const toAdd = assignedGradeLevelIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !assignedGradeLevelIds.includes(id));

      // Remove unselected
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('teacher_grade_levels')
          .delete()
          .eq('teacher_id', teacherId)
          .in('grade_level_id', toRemove);

        if (deleteError) throw deleteError;
      }

      // Add newly selected
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_grade_levels')
          .insert(toAdd.map(grade_level_id => ({
            teacher_id: teacherId,
            grade_level_id,
          })));

        if (insertError) throw insertError;
      }

      toast.success('Grade level assignments updated');
      setOpen(false);
      onAssignmentsChanged?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update assignments');
    } finally {
      setSaving(false);
    }
  };

  const sortedGradeLevels = [...gradeLevels].sort((a, b) => a.order_index - b.order_index);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <GraduationCap className="h-4 w-4" />
          Grades
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Grade Levels</DialogTitle>
          <DialogDescription>
            Select the grade levels that <strong>{teacherName}</strong> can teach.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-3">
                {sortedGradeLevels.map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleToggle(grade.id)}
                  >
                    <Checkbox
                      checked={assignedGradeLevelIds.includes(grade.id)}
                      onCheckedChange={() => handleToggle(grade.id)}
                    />
                    <span className="flex-1">{grade.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {assignedGradeLevelIds.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {assignedGradeLevelIds.map(id => {
                  const grade = gradeLevels.find(g => g.id === id);
                  return grade ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {grade.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
