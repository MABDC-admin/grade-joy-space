import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Music, Video, File } from 'lucide-react';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    url: string;
    name: string;
    type?: string;
  } | null;
}

export function FilePreviewDialog({ open, onOpenChange, file }: FilePreviewDialogProps) {
  if (!file) return null;

  const isImage = file.type?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isVideo = file.type?.startsWith('video/') || 
    /\.(mp4|webm|ogg|mov)$/i.test(file.name);
  const isAudio = file.type?.startsWith('audio/') || 
    /\.(mp3|wav|ogg|m4a)$/i.test(file.name);

  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-16 w-16 text-destructive" />;
    if (isVideo) return <Video className="h-16 w-16 text-primary" />;
    if (isAudio) return <Music className="h-16 w-16 text-primary" />;
    return <File className="h-16 w-16 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle className="truncate pr-4">{file.name}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto min-h-0 flex items-center justify-center bg-muted/30 rounded-lg">
          {isImage && (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
          
          {isPdf && (
            <iframe
              src={file.url}
              title={file.name}
              className="w-full h-[70vh] border-0"
            />
          )}
          
          {isVideo && (
            <video
              src={file.url}
              controls
              className="max-w-full max-h-[70vh]"
            >
              Your browser does not support the video tag.
            </video>
          )}
          
          {isAudio && (
            <div className="flex flex-col items-center gap-4 p-8">
              <Music className="h-24 w-24 text-primary" />
              <audio src={file.url} controls className="w-full max-w-md">
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
          
          {!isImage && !isPdf && !isVideo && !isAudio && (
            <div className="flex flex-col items-center gap-4 p-8">
              {getFileIcon()}
              <p className="text-muted-foreground text-center">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
