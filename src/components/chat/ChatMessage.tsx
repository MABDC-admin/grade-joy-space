import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
}

export function ChatMessage({ message, isOwn, showAvatar, showTimestamp }: ChatMessageProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      {showAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(message.sender?.full_name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={cn('max-w-[75%] space-y-1', isOwn && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {message.content}
        </div>

        {showTimestamp && (
          <p className={cn('text-[10px] text-muted-foreground px-1', isOwn && 'text-right')}>
            {format(new Date(message.created_at), 'h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
}
