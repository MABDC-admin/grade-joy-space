import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Music, Video, File, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker using CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

  // Reset states when file changes or dialog opens
  useEffect(() => {
    if (open && file) {
      setImageError(false);
      setImageLoading(true);
      setRetryCount(0);
      setNumPages(null);
      setPageNumber(1);
      setPdfError(false);
      setPdfLoading(true);
    }
  }, [open, file?.url]);

  // Detect container width for responsive PDF
  useEffect(() => {
    const updateWidth = () => {
      // Use smaller width on mobile for better PDF rendering
      const maxWidth = Math.min(window.innerWidth - 48, 800);
      setContainerWidth(maxWidth);
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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

  const handleOpenExternal = () => {
    window.open(file.url, '_blank', 'noopener,noreferrer');
  };

  const handleRetry = () => {
    setImageError(false);
    setImageLoading(true);
    setPdfError(false);
    setPdfLoading(true);
    setRetryCount(prev => prev + 1);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(false);
  };

  const onDocumentLoadError = () => {
    setPdfLoading(false);
    setPdfError(true);
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

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
  const pdfUrl = getCleanUrl(file.url);

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-16 w-16 text-destructive" />;
    if (isVideo) return <Video className="h-16 w-16 text-primary" />;
    if (isAudio) return <Music className="h-16 w-16 text-primary" />;
    return <File className="h-16 w-16 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex-1 min-w-0">
            <DialogTitle className="truncate pr-4 text-sm sm:text-base">{file.name}</DialogTitle>
            <DialogDescription className="sr-only">Preview of {file.name}</DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleOpenExternal} className="hidden sm:flex">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto min-h-0 flex flex-col items-center justify-center bg-muted/30 rounded-lg">
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
          
          {isPdf && !pdfError && (
            <div className="flex flex-col items-center w-full">
              {/* PDF Document */}
              <div className="overflow-auto max-h-[60vh] w-full flex justify-center bg-gray-100 dark:bg-gray-900 rounded-lg">
                {pdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                  </div>
                )}
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={null}
                  className="flex justify-center"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={containerWidth > 0 ? Math.min(containerWidth - 32, 600) : 300}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </div>

              {/* Page Navigation */}
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-4 mt-4 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Mobile hint */}
              <p className="text-xs text-muted-foreground mt-2 text-center sm:hidden">
                Pinch to zoom • Swipe to scroll
              </p>
            </div>
          )}

          {isPdf && pdfError && (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="rounded-full bg-destructive/10 p-4">
                <FileText className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-muted-foreground text-center">
                Unable to preview PDF in app
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
                <Button variant="secondary" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
          
          {isVideo && (
            <video
              src={file.url}
              controls
              playsInline
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
