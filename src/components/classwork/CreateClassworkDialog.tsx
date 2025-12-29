import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, BookOpen, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

interface CreateClassworkDialogProps {
  classId: string;
  topics: Topic[];
  onClassworkCreated?: () => void;
}

export function CreateClassworkDialog({ classId, topics, onClassworkCreated }: CreateClassworkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState<'lesson' | 'assignment'>('assignment');
  const [attachments, setAttachments] = useState<any[]>([]);
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      topic_id: '',
      due_date: '',
      points: '',
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: any[] = [];
      const tempId = Date.now().toString();

      for (const file of Array.from(files)) {
        const filePath = `temp/${tempId}/${file.name}`;

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
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classwork_items')
        .insert({
          class_id: classId,
          type,
          title: values.title.trim(),
          content: values.content?.trim() || null,
          topic_id: values.topic_id && values.topic_id !== 'none' ? values.topic_id : null,
          due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
          points: values.points ? parseInt(values.points) : null,
          created_by: user.id,
          attachments: attachments,
        })
        .select()
        .single();

      if (error) throw error;

      // Move files from temp folder to proper folder
      if (data && attachments.length > 0) {
        const updatedAttachments = [];
        for (const att of attachments) {
          const newPath = `${data.id}/${att.name}`;
          try {
            await supabase.storage
              .from('class-materials')
              .move(att.path, newPath);
            
            const { data: urlData } = supabase.storage
              .from('class-materials')
              .getPublicUrl(newPath);

            updatedAttachments.push({
              ...att,
              path: newPath,
              url: urlData.publicUrl,
            });
          } catch {
            updatedAttachments.push(att);
          }
        }

        await supabase
          .from('classwork_items')
          .update({ attachments: updatedAttachments })
          .eq('id', data.id);
      }

      toast.success(`${type === 'assignment' ? 'Assignment' : 'Lesson'} created!`);
      form.reset();
      setAttachments([]);
      setOpen(false);
      onClassworkCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create classwork');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (selectedType: 'lesson' | 'assignment') => {
    setType(selectedType);
    setAttachments([]);
    form.reset();
    setOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleOpen('assignment')} className="gap-2">
            <FileText className="h-4 w-4" />
            Assignment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpen('lesson')} className="gap-2">
            <BookOpen className="h-4 w-4" />
            Lesson / Material
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === 'assignment' ? (
                <>
                  <FileText className="h-5 w-5" />
                  Create Assignment
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5" />
                  Create Lesson
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {type === 'assignment'
                ? 'Create an assignment for students to complete'
                : 'Add a lesson or material for students to view'}
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
                      <Input 
                        placeholder={type === 'assignment' ? 'e.g., Chapter 1 Quiz' : 'e.g., Introduction to Algebra'} 
                        {...field} 
                      />
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

              {type === 'assignment' && (
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
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || uploading}>
                  {loading ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
