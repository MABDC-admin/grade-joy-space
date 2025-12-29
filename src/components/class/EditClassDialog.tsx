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
  DialogTrigger,
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
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  section: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  grade_level_id: z.string().optional(),
  color: z.string().default('green'),
});

type FormValues = z.infer<typeof formSchema>;

interface GradeLevel {
  id: string;
  name: string;
  order_index: number;
}

interface EditClassDialogProps {
  classId: string;
  classData: {
    name: string;
    section: string | null;
    subject: string | null;
    description: string | null;
    grade_level_id: string | null;
    color: string | null;
  };
  onClassUpdated?: () => void;
}

const colorOptions = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Purple' },
  { value: 'teal', label: 'Teal' },
];

export function EditClassDialog({ classId, classData, onClassUpdated }: EditClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);

  useEffect(() => {
    fetchGradeLevels();
  }, []);

  const fetchGradeLevels = async () => {
    const { data } = await supabase
      .from('grade_levels')
      .select('*')
      .order('order_index');
    setGradeLevels(data || []);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: classData.name,
      section: classData.section || '',
      subject: classData.subject || '',
      description: classData.description || '',
      grade_level_id: classData.grade_level_id || '',
      color: classData.color || 'green',
    },
  });

  useEffect(() => {
    form.reset({
      name: classData.name,
      section: classData.section || '',
      subject: classData.subject || '',
      description: classData.description || '',
      grade_level_id: classData.grade_level_id || '',
      color: classData.color || 'green',
    });
  }, [classData, form]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const gradeLevel = gradeLevels.find(g => g.id === values.grade_level_id);

      const { error } = await supabase
        .from('classes')
        .update({
          name: values.name,
          section: values.section || null,
          subject: values.subject || null,
          description: values.description || null,
          grade_level_id: values.grade_level_id && values.grade_level_id !== 'none' ? values.grade_level_id : null,
          grade_level: gradeLevel?.name || null,
          color: values.color,
        })
        .eq('id', classId);

      if (error) throw error;

      toast.success('Class updated successfully!');
      setOpen(false);
      onClassUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  const sortedGradeLevels = [...gradeLevels].sort((a, b) => a.order_index - b.order_index);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
          <DialogDescription>
            Update the class details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Math 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade_level_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No grade</SelectItem>
                        {sortedGradeLevels.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input placeholder="Section A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Mathematics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Class description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`h-4 w-4 rounded-full class-card-gradient-${option.value}`} 
                            />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
