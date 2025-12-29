import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Camera, 
  X, 
  FileText, 
  Image as ImageIcon,
  File,
  Loader2,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SubmissionFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  url?: string;
  path?: string;
}

interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  assignmentTitle: string;
  existingSubmission?: {
    id: string;
    text_answer: string | null;
    status: string;
  } | null;
  onSubmitted?: () => void;
}

export function SubmissionDialog({
  open,
  onOpenChange,
  assignmentId,
  assignmentTitle,
  existingSubmission,
  onSubmitted,
}: SubmissionDialogProps) {
  const { user } = useAuth();
  const [textAnswer, setTextAnswer] = useState(existingSubmission?.text_answer || '');
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = '';
  };

  const addFiles = (selectedFiles: File[]) => {
    const newFiles: SubmissionFile[] = selectedFiles.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (file.type === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const uploadFiles = async (submissionId: string) => {
    if (!user) return [];

    const uploadedFiles: { url: string; path: string; type: string; name: string }[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const fileName = `${user.id}/${submissionId}/${Date.now()}_${fileData.file.name}`;

      setUploadProgress(Math.round(((i + 0.5) / totalFiles) * 100));

      const { data, error } = await supabase.storage
        .from('submissions')
        .upload(fileName, fileData.file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(data.path);

      uploadedFiles.push({
        url: urlData.publicUrl,
        path: data.path,
        type: fileData.file.type,
        name: fileData.file.name,
      });

      setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    return uploadedFiles;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!textAnswer.trim() && files.length === 0) {
      toast.error('Please add a comment or attach files');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // Create or update submission
      let submissionId = existingSubmission?.id;

      if (!submissionId) {
        const { data: newSubmission, error: createError } = await supabase
          .from('submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            text_answer: textAnswer.trim() || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        submissionId = newSubmission.id;
      } else {
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            text_answer: textAnswer.trim() || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        if (updateError) throw updateError;
      }

      // Upload files
      if (files.length > 0) {
        setUploading(true);
        const uploadedFiles = await uploadFiles(submissionId);

        // Save file references
        for (const file of uploadedFiles) {
          await supabase.from('submission_files').insert({
            submission_id: submissionId,
            file_url: file.url,
            file_path: file.path,
            file_type: file.type,
            file_name: file.name,
          });
        }
      }

      toast.success('Assignment submitted!');
      setTextAnswer('');
      setFiles([]);
      onOpenChange(false);
      onSubmitted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const isSubmitted = existingSubmission?.status === 'submitted' || existingSubmission?.status === 'graded';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Your Work</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {assignmentTitle}
            {isSubmitted && (
              <Badge variant="secondary" className="ml-2">
                <Check className="mr-1 h-3 w-3" />
                Submitted
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text answer */}
          <div className="space-y-2">
            <Label>Comments (optional)</Label>
            <Textarea
              placeholder="Add a private comment..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>

          {/* File attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            
            {/* Upload buttons */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>

            {/* File preview grid */}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {files.map((fileData, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg border overflow-hidden bg-muted"
                  >
                    {fileData.preview ? (
                      <img
                        src={fileData.preview}
                        alt={fileData.file.name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 flex flex-col items-center justify-center p-2">
                        {getFileIcon(fileData.file)}
                        <span className="text-xs text-muted-foreground mt-1 truncate max-w-full px-1">
                          {fileData.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isSubmitted ? (
                'Resubmit'
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
