import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, BookOpen, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().max(5000, 'Content too long').optional(),
  topic_id: z.string().optional(),
  due_date: z.string().optional(),
  points: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Topic {
  id: string;
  name: string;
}

interface ClassworkItem {
  id: string;
  title: string;
  type: 'lesson' | 'assignment';
  content: string | null;
  topic_id: string | null;
  due_date: string | null;
  points: number | null;
  attachments: any[] | null;
}

interface EditClassworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ClassworkItem;
  topics: Topic[];
  onClassworkUpdated?: () => void;
}

export function EditClassworkDialog({ 
  open, 
  onOpenChange, 
  item, 
  topics, 
  onClassworkUpdated 
}: EditClassworkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>(item.attachments || []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: item.title,
      content: item.content || '',
      topic_id: item.topic_id || '',
      due_date: item.due_date ? new Date(item.due_date).toISOString().slice(0, 16) : '',
      points: item.points?.toString() || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: item.title,
        content: item.content || '',
        topic_id: item.topic_id || '',
        due_date: item.due_date ? new Date(item.due_date).toISOString().slice(0, 16) : '',
        points: item.points?.toString() || '',
      });
      setAttachments(item.attachments || []);
    }
  }, [open, item, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: any[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${item.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('class-materials')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('class-materials')
          .getPublicUrl(filePath);

        newAttachments.push({
          name: file.name,
          path: filePath,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = async (index: number) => {
    const attachment = attachments[index];
    try {
      if (attachment.path) {
        await supabase.storage
          .from('class-materials')
          .remove([attachment.path]);
      }
      setAttachments(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Failed to remove file:', error);
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('classwork_items')
        .update({
          title: values.title.trim(),
          content: values.content?.trim() || null,
          topic_id: values.topic_id && values.topic_id !== 'none' ? values.topic_id : null,
          due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
          points: values.points ? parseInt(values.points) : null,
          attachments: attachments,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`${item.type === 'assignment' ? 'Assignment' : 'Lesson'} updated!`);
      onOpenChange(false);
      onClassworkUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update classwork');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.type === 'assignment' ? (
              <>
                <FileText className="h-5 w-5" />
                Edit Assignment
              </>
            ) : (
              <>
                <BookOpen className="h-5 w-5" />
                Edit Lesson
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Update the {item.type} details and attachments.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions / Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add instructions or content..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topic_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No topic</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {item.type === 'assignment' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          min="0"
                          max="1000"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-2">
              <FormLabel>Attachments</FormLabel>
              
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{attachment.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploading ? 'Uploading...' : 'Upload Files'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
