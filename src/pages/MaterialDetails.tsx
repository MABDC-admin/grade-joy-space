import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileGrid } from '@/components/classwork/FileGrid';
import { FilePreviewDialog } from '@/components/ui/file-preview-dialog';

interface Material {
  id: string;
  title: string;
  content: string | null;
  type: string;
  attachments: any[] | null;
  created_at: string;
  class_id: string;
  classes?: { name: string; color: string | null };
}

interface PreviewFile {
  url: string;
  name: string;
  type?: string;
}

export default function MaterialDetails() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  useEffect(() => {
    if (materialId) {
      fetchMaterial();
    }
  }, [materialId]);

  const fetchMaterial = async () => {
    if (!materialId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classwork_items')
        .select(`
          *,
          classes (name, color)
        `)
        .eq('id', materialId)
        .single();

      if (error) throw error;
      setMaterial(data as Material);
    } catch (error) {
      console.error('Error fetching material:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: PreviewFile) => {
    setPreviewFile(file);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Material not found</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const attachments = (material.attachments || []).map((att: any) => ({
    url: att.url || att.file_url,
    name: att.name || att.file_name || 'File',
    type: att.type || att.file_type,
  }));

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback: navigate to the class page
      navigate(material?.class_id ? `/class/${material.class_id}` : '/dashboard');
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={handleBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Class
      </Button>

      {/* Material header */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          )}>
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium">{material.title}</h1>
            <p className="text-sm text-muted-foreground">{material.classes?.name}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent>
          {material.content ? (
            <p className="whitespace-pre-wrap">{material.content}</p>
          ) : (
            <p className="text-muted-foreground">No content provided</p>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachments ({attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <FileGrid attachments={attachments} onFileClick={handleFileClick} />
          </CardContent>
        </Card>
      )}

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
