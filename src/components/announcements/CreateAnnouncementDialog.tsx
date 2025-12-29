import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  preselectedClassId?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export function CreateAnnouncementDialog({ 
  open, 
  onOpenChange, 
  onCreated,
  preselectedClassId 
}: CreateAnnouncementDialogProps) {
  const { user, isAdmin, isTeacher } = useAuth();
  const [content, setContent] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId || '');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (open) {
      fetchClasses();
      if (preselectedClassId) {
        setSelectedClassId(preselectedClassId);
      }
    }
  }, [open, preselectedClassId]);

  const fetchClasses = async () => {
    if (!user) return;
    setFetching(true);

    try {
      if (isAdmin) {
        const { data } = await supabase.from('classes').select('id, name');
        setClasses(data || []);
      } else if (isTeacher) {
        // Get classes where user is a teacher
        const { data: teacherClasses } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);

        const { data: createdClasses } = await supabase
          .from('classes')
          .select('id, name')
          .eq('created_by', user.id);

        const classIds = [
          ...(teacherClasses?.map(c => c.class_id) || []),
          ...(createdClasses?.map(c => c.id) || []),
        ];

        const uniqueClassIds = [...new Set(classIds)];

        if (uniqueClassIds.length > 0) {
          const { data } = await supabase
            .from('classes')
            .select('id, name')
            .in('id', uniqueClassIds);
          setClasses(data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleCreate = async () => {
    if (!content.trim() || !selectedClassId || !user) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('announcements').insert({
        content: content.trim(),
        class_id: selectedClassId,
        author_id: user.id,
      });

      if (error) throw error;

      toast.success('Announcement posted!');
      setContent('');
      setSelectedClassId(preselectedClassId || '');
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class</Label>
            {fetching ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              placeholder="Share something with your class..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !content.trim() || !selectedClassId}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
