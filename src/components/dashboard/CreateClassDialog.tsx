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
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Extended profile type to include school_id
interface ExtendedProfile {
  school_id?: string | null;
}

const formSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  section: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  school_id: z.string().optional(),
  grade_level_id: z.string().optional(),
  color: z.string().default('green'),
});

type FormValues = z.infer<typeof formSchema>;

interface School {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
  order_index: number;
}

interface CreateClassDialogProps {
  onClassCreated?: () => void;
}

const colorOptions = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Purple' },
  { value: 'teal', label: 'Teal' },
];

export function CreateClassDialog({ onClassCreated }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const { user, profile, isAdmin, isTeacher } = useAuth();
  const extendedProfile = profile as ExtendedProfile | null;

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [schoolsRes, gradesRes] = await Promise.all([
      supabase.from('schools').select('id, name').order('name'),
      supabase.from('grade_levels').select('*').order('order_index'),
    ]);
    setSchools(schoolsRes.data || []);
    setGradeLevels(gradesRes.data || []);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      section: '',
      subject: '',
      description: '',
      school_id: '',
      grade_level_id: '',
      color: 'green',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    // For teachers, enforce school_id from their profile
    const schoolId = isAdmin 
      ? (values.school_id && values.school_id !== 'none' ? values.school_id : null)
      : extendedProfile?.school_id;

    if (isTeacher && !isAdmin && !schoolId) {
      toast.error('Your account is not assigned to a school. Please contact an administrator.');
      return;
    }

    setLoading(true);
    try {
      // Find grade level name
      const gradeLevel = gradeLevels.find(g => g.id === values.grade_level_id);

      const { data: newClass, error } = await supabase
        .from('classes')
        .insert({
          name: values.name,
          section: values.section || null,
          subject: values.subject || null,
          description: values.description || null,
          school_id: schoolId,
          grade_level_id: values.grade_level_id && values.grade_level_id !== 'none' ? values.grade_level_id : null,
          grade_level: gradeLevel?.name || values.grade_level_id || null,
          color: values.color,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as teacher
      await supabase.from('class_teachers').insert({
        class_id: newClass.id,
        teacher_id: user.id,
      });

      toast.success('Class created successfully!');
      form.reset();
      setOpen(false);
      onClassCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const sortedGradeLevels = [...gradeLevels].sort((a, b) => a.order_index - b.order_index);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new class</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new class.
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

            {/* Only show school selector for admins; teachers auto-use their school */}
            {isAdmin && schools.length > 0 && (
              <FormField
                control={form.control}
                name="school_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No school</SelectItem>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Show teacher's assigned school as read-only info */}
            {isTeacher && !isAdmin && extendedProfile?.school_id && (
              <div className="text-sm text-muted-foreground">
                School: {schools.find(s => s.id === extendedProfile.school_id)?.name || 'Your assigned school'}
              </div>
            )}

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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {loading ? 'Creating...' : 'Create Class'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
