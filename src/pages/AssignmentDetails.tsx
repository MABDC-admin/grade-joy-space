import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubmissionDialog } from '@/components/submission/SubmissionDialog';
import { FileGrid } from '@/components/classwork/FileGrid';
import { FilePreviewDialog } from '@/components/ui/file-preview-dialog';

interface Assignment {
  id: string;
  title: string;
  content: string | null;
  due_date: string | null;
  points: number | null;
  created_at: string;
  class_id: string;
  classes?: { name: string; color: string | null };
  profiles?: { full_name: string | null; avatar_url: string | null };
}

interface Submission {
  id: string;
  text_answer: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string | null;
}

interface SubmissionFile {
  id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
}

interface PreviewFile {
  url: string;
  name: string;
  type?: string;
}

export default function AssignmentDetails() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user, isTeacher, isAdmin } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<SubmissionFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  const fetchAssignment = async () => {
    if (!assignmentId || !user) return;

    setLoading(true);
    try {
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('classwork_items')
        .select(`
          *,
          classes (name, color)
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData as Assignment);

      // Fetch submission for this student
      const { data: submissionData } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      setSubmission(submissionData);

      // Fetch submission files
      if (submissionData) {
        const { data: filesData } = await supabase
          .from('submission_files')
          .select('*')
          .eq('submission_id', submissionData.id);
        setSubmissionFiles(filesData || []);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = () => {
    if (!submission) {
      return <Badge variant="outline">Assigned</Badge>;
    }
    switch (submission.status) {
      case 'submitted':
        return <Badge className="bg-success text-success-foreground">Submitted</Badge>;
      case 'graded':
        return <Badge className="bg-primary text-primary-foreground">Graded</Badge>;
      case 'returned':
        return <Badge variant="secondary">Returned</Badge>;
      default:
        return <Badge variant="outline">Assigned</Badge>;
    }
  };

  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();
  const canManage = isTeacher || isAdmin;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Assignment not found</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Assignment header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
            )}>
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium">{assignment.title}</h1>
              <p className="text-sm text-muted-foreground">{assignment.classes?.name}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm">
          {assignment.due_date && (
            <div className={cn(
              "flex items-center gap-1",
              isOverdue && !submission ? "text-destructive" : "text-muted-foreground"
            )}>
              <Calendar className="h-4 w-4" />
              <span>Due: {formatDate(assignment.due_date)}</span>
            </div>
          )}
          {assignment.points && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>{assignment.points} points</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Instructions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.content ? (
                <p className="whitespace-pre-wrap">{assignment.content}</p>
              ) : (
                <p className="text-muted-foreground">No instructions provided</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submission panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission?.status === 'graded' && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Grade</span>
                    <span className="font-display text-lg font-medium">
                      {submission.grade}/{assignment.points || 100}
                    </span>
                  </div>
                  {submission.feedback && (
                    <p className="mt-2 text-sm">{submission.feedback}</p>
                  )}
                </div>
              )}

              {submissionFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attached files</p>
                  <FileGrid 
                    attachments={submissionFiles.map(f => ({
                      url: f.file_url,
                      name: f.file_name || 'File',
                      type: f.file_type || undefined,
                    }))}
                    onFileClick={(file) => setPreviewFile(file)}
                  />
                </div>
              )}

              {submission?.text_answer && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Your comment</p>
                  <p className="text-sm text-muted-foreground">{submission.text_answer}</p>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={() => setSubmissionOpen(true)}
                variant={submission ? 'outline' : 'default'}
              >
                {submission ? 'View / Edit Submission' : 'Add Submission'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submission dialog */}
      <SubmissionDialog
        open={submissionOpen}
        onOpenChange={setSubmissionOpen}
        assignmentId={assignment.id}
        assignmentTitle={assignment.title}
        existingSubmission={submission}
        onSubmitted={fetchAssignment}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
