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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required').max(100),
  school_id: z.string().min(1, 'School is required'),
  grade_level_ids: z.array(z.string()).optional(),
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

interface CreateTeacherDialogProps {
  schools: School[];
  gradeLevels?: GradeLevel[];
  onTeacherCreated?: () => void;
}

export function CreateTeacherDialog({ schools, gradeLevels = [], onTeacherCreated }: CreateTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allGradeLevels, setAllGradeLevels] = useState<GradeLevel[]>(gradeLevels);

  useEffect(() => {
    if (gradeLevels.length === 0) {
      fetchGradeLevels();
    } else {
      setAllGradeLevels(gradeLevels);
    }
  }, [gradeLevels]);

  const fetchGradeLevels = async () => {
    const { data } = await supabase
      .from('grade_levels')
      .select('*')
      .order('order_index');
    setAllGradeLevels(data || []);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', full_name: '', school_id: '', grade_level_ids: [] },
  });

  const selectedGradeLevelIds = form.watch('grade_level_ids') || [];

  const handleGradeLevelToggle = (gradeLevelId: string) => {
    const current = form.getValues('grade_level_ids') || [];
    if (current.includes(gradeLevelId)) {
      form.setValue('grade_level_ids', current.filter(id => id !== gradeLevelId));
    } else {
      form.setValue('grade_level_ids', [...current, gradeLevelId]);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      // Call backend function to create teacher (uses service role)
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: 'teacher',
          school_id: values.school_id,
          grade_level_ids: values.grade_level_ids || [],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Teacher created successfully!');
      form.reset();
      setOpen(false);
      onTeacherCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  };

  const sortedGradeLevels = [...allGradeLevels].sort((a, b) => a.order_index - b.order_index);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Teacher Account</DialogTitle>
          <DialogDescription>
            Add a new teacher to a school and assign grade levels.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="teacher@school.edu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="school_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            {/* Grade Levels Multi-Select */}
            <div className="space-y-2">
              <FormLabel>Grade Levels (optional)</FormLabel>
              <ScrollArea className="h-[150px] rounded-md border p-2">
                <div className="space-y-2">
                  {sortedGradeLevels.map((grade) => (
                    <div
                      key={grade.id}
                      className="flex items-center gap-2 rounded p-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleGradeLevelToggle(grade.id)}
                    >
                      <Checkbox
                        checked={selectedGradeLevelIds.includes(grade.id)}
                        onCheckedChange={() => handleGradeLevelToggle(grade.id)}
                      />
                      <span className="text-sm">{grade.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedGradeLevelIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedGradeLevelIds.map(id => {
                    const grade = allGradeLevels.find(g => g.id === id);
                    return grade ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {grade.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Teacher'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
