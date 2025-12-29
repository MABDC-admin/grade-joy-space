import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteClassworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    title: string;
    type: 'lesson' | 'assignment';
    attachments?: any[] | null;
  };
  onClassworkDeleted?: () => void;
}

export function DeleteClassworkDialog({ 
  open, 
  onOpenChange, 
  item, 
  onClassworkDeleted 
}: DeleteClassworkDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Delete attachments from storage if any
      if (item.attachments && item.attachments.length > 0) {
        const paths = item.attachments.map(a => a.path).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage
            .from('class-materials')
            .remove(paths);
        }
      }

      // Delete any submissions for this assignment
      if (item.type === 'assignment') {
        // First get submission IDs
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id')
          .eq('assignment_id', item.id);

        if (submissions && submissions.length > 0) {
          const submissionIds = submissions.map(s => s.id);
          
          // Delete submission files
          await supabase
            .from('submission_files')
            .delete()
            .in('submission_id', submissionIds);

          // Delete submissions
          await supabase
            .from('submissions')
            .delete()
            .eq('assignment_id', item.id);
        }
      }

      // Delete the classwork item
      const { error } = await supabase
        .from('classwork_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`${item.type === 'assignment' ? 'Assignment' : 'Lesson'} deleted!`);
      onOpenChange(false);
      onClassworkDeleted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {item.type === 'assignment' ? 'Assignment' : 'Lesson'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{item.title}"? 
            {item.type === 'assignment' && ' All student submissions will also be deleted.'}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
