import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatPanel } from './ChatPanel';
import { useChat } from '@/hooks/useChat';

export function ChatButton() {
  const [open, setOpen] = useState(false);
  const { unreadTotal } = useChat();

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-4"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadTotal > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1.5 text-xs"
          >
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </Badge>
        )}
      </Button>

      <ChatPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
