import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Music, Video, File, RefreshCw, ImageIcon, AlertCircle } from 'lucide-react';

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
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Reset states when file changes or dialog opens
  useEffect(() => {
    if (open && file) {
      setImageError(false);
      setImageLoading(true);
      setRetryCount(0);
    }
  }, [open, file?.url]);

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

  const handleRetry = () => {
    setImageError(false);
    setImageLoading(true);
    setRetryCount(prev => prev + 1);
  };

  // Get clean URL
  const getCleanUrl = (url: string) => {
    try {
      if (url.includes('%25')) {
        return decodeURIComponent(url);
      }
      return url;
    } catch {
      return url;
    }
  };

  const imageUrl = `${getCleanUrl(file.url)}${retryCount > 0 ? `?retry=${retryCount}` : ''}`;

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
          <div>
            <DialogTitle className="truncate pr-4">{file.name}</DialogTitle>
            <DialogDescription className="sr-only">Preview of {file.name}</DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto min-h-0 flex items-center justify-center bg-muted/30 rounded-lg">
          {isImage && !imageError && (
            <div className="relative w-full h-full flex items-center justify-center">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <img
                src={imageUrl}
                alt={file.name}
                className={`max-w-full max-h-[70vh] object-contain transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </div>
          )}

          {isImage && imageError && (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-muted-foreground text-center">
                Failed to load image preview
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Instead
                </Button>
              </div>
            </div>
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
