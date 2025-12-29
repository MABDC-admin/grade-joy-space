import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteClassDialogProps {
  classId: string;
  className: string;
}

export function DeleteClassDialog({ classId, className }: DeleteClassDialogProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Delete in order: classwork_items, topics, class_members, class_teachers, announcements, then class
      await supabase.from('classwork_items').delete().eq('class_id', classId);
      await supabase.from('topics').delete().eq('class_id', classId);
      await supabase.from('class_members').delete().eq('class_id', classId);
      await supabase.from('class_teachers').delete().eq('class_id', classId);
      await supabase.from('announcements').delete().eq('class_id', classId);

      const { error } = await supabase.from('classes').delete().eq('id', classId);

      if (error) throw error;

      toast.success('Class deleted successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Class</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>"{className}"</strong>? This will permanently
            remove all topics, assignments, announcements, and enrolled students. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Class'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
