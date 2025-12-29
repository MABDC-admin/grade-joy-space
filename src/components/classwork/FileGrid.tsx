import { FileText, Image as ImageIcon, Video, Music, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface FileAttachment {
  url: string;
  name: string;
  type?: string;
}

interface FileGridProps {
  attachments: FileAttachment[];
  onFileClick: (file: FileAttachment) => void;
}

export function FileGrid({ attachments, onFileClick }: FileGridProps) {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (file: FileAttachment) => {
    const type = file.type?.toLowerCase() || '';
    const name = file.name?.toLowerCase() || '';

    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
      return null; // Will show thumbnail
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-destructive" />;
    }
    if (type.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(name)) {
      return <Video className="h-8 w-8 text-primary" />;
    }
    if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(name)) {
      return <Music className="h-8 w-8 text-primary" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const isImage = (file: FileAttachment) => {
    const type = file.type?.toLowerCase() || '';
    const name = file.name?.toLowerCase() || '';
    return type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {attachments.map((file, index) => (
        <FileThumbnail 
          key={index} 
          file={file} 
          isImage={isImage(file)}
          icon={getFileIcon(file)}
          onClick={() => onFileClick(file)} 
        />
      ))}
    </div>
  );
}

interface FileThumbnailProps {
  file: FileAttachment;
  isImage: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

function FileThumbnail({ file, isImage, icon, onClick }: FileThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border bg-card p-2 text-left transition-all",
        "hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
    >
      {isImage && !imageError ? (
        <div className="aspect-square overflow-hidden rounded-md bg-muted relative">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          <img
            src={file.url}
            alt={file.name}
            className={cn(
              "h-full w-full object-cover transition-all group-hover:scale-105",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center rounded-md bg-muted">
          {imageError ? <ImageIcon className="h-8 w-8 text-muted-foreground" /> : icon}
        </div>
      )}
      <p className="mt-2 text-xs font-medium truncate" title={file.name}>
        {file.name}
      </p>
    </button>
  );
}
