import { FileText, Image, Video, Music, File } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <button
          key={index}
          onClick={() => onFileClick(file)}
          className={cn(
            "group relative rounded-lg border bg-card p-2 text-left transition-all",
            "hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
        >
          {isImage(file) ? (
            <div className="aspect-square overflow-hidden rounded-md bg-muted">
              <img
                src={file.url}
                alt={file.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center rounded-md bg-muted">
              {getFileIcon(file)}
            </div>
          )}
          <p className="mt-2 text-xs font-medium truncate" title={file.name}>
            {file.name}
          </p>
        </button>
      ))}
    </div>
  );
}
