import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import type { ChatConversation } from '@/hooks/useChat';

interface ConversationListProps {
  conversations: ChatConversation[];
  loading: boolean;
  onSelectConversation: (id: string) => void;
}

export function ConversationList({ 
  conversations, 
  loading, 
  onSelectConversation 
}: ConversationListProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getConversationTitle = (conv: ChatConversation) => {
    if (conv.title) return conv.title;
    if (conv.participants.length === 1) {
      return conv.participants[0].full_name || 'User';
    }
    return conv.participants.map(p => p.full_name || 'User').join(', ');
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.participants.length === 1) {
      return conv.participants[0].avatar_url || undefined;
    }
    return undefined;
  };

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium">No conversations yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new conversation with the + button
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={getConversationAvatar(conv)} />
              <AvatarFallback>
                {getInitials(conv.participants[0]?.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{getConversationTitle(conv)}</p>
                {conv.last_message && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatMessageTime(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground truncate">
                  {conv.last_message?.content || 'No messages yet'}
                </p>
                {conv.unread_count > 0 && (
                  <Badge 
                    variant="default" 
                    className="h-5 min-w-5 rounded-full px-1.5 text-xs shrink-0"
                  >
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
