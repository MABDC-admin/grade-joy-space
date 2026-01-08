import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker using CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  url: string;
  name: string;
  className?: string;
}

export function PdfThumbnail({ url, name, className }: PdfThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset states when URL changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setRetryCount(0);
  }, [url]);

  const handleLoadSuccess = () => {
    setLoading(false);
    setError(false);
  };

  const handleLoadError = () => {
    setLoading(false);
    setError(true);
  };

  // Get file name without extension for display
  const getDisplayName = (name: string) => {
    const parts = name.split('.');
    if (parts.length > 1) {
      parts.pop();
      return parts.join('.');
    }
    return name;
  };

  // Handle CORS by adding retry parameter
  const pdfUrl = `${url}${retryCount > 0 ? `?retry=${retryCount}` : ''}`;

  if (error) {
    // Fallback to styled icon when PDF can't be loaded
    return (
      <div className={cn(
        "aspect-square flex flex-col items-center justify-center rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 gap-2",
        className
      )}>
        <div className="relative">
          <FileText className="h-10 w-10 text-red-500" />
          <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-white bg-red-500 px-1 rounded">
            PDF
          </span>
        </div>
        <span className="text-[10px] text-red-600 dark:text-red-400 font-medium text-center px-1 truncate max-w-full">
          {getDisplayName(name).slice(0, 12)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "aspect-square rounded-md overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 relative",
      className
    )}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
        </div>
      )}
      
      <Document
        file={pdfUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={null}
        className="w-full h-full flex items-center justify-center"
      >
        <Page
          pageNumber={1}
          width={120}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="!bg-transparent"
        />
      </Document>
      
      {/* PDF Badge */}
      <div className="absolute bottom-1 right-1 text-[8px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm">
        PDF
      </div>
    </div>
  );
}
