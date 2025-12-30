import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Plus, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from './ChatMessage';
import { ConversationList } from './ConversationList';
import { NewConversationDialog } from './NewConversationDialog';
import { format } from 'date-fns';

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    messagesLoading,
    sendMessage,
  } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversation);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    await sendMessage(newMessage, activeConversation);
    setNewMessage('');
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConversationTitle = () => {
    if (!activeConv) return 'Chat';
    if (activeConv.title) return activeConv.title;
    if (activeConv.participants.length === 1) {
      return activeConv.participants[0].full_name || 'User';
    }
    return activeConv.participants.map(p => p.full_name || 'User').join(', ');
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            {activeConversation && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setActiveConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <SheetTitle className="flex-1 truncate">
              {activeConversation ? getConversationTitle() : 'Messages'}
            </SheetTitle>
            {!activeConversation && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNewConversationOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {activeConversation ? (
            // Chat View
            <div className="flex h-full flex-col">
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg, index) => {
                      const isOwn = msg.sender_id === user?.id;
                      const showAvatar = index === 0 || 
                        messages[index - 1]?.sender_id !== msg.sender_id;
                      const showTimestamp = index === messages.length - 1 ||
                        messages[index + 1]?.sender_id !== msg.sender_id;

                      return (
                        <ChatMessage
                          key={msg.id}
                          message={msg}
                          isOwn={isOwn}
                          showAvatar={showAvatar}
                          showTimestamp={showTimestamp}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">
                      Send a message to start the conversation
                    </p>
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Conversation List
            <ConversationList
              conversations={conversations}
              loading={loading}
              onSelectConversation={setActiveConversation}
            />
          )}
        </div>

        <NewConversationDialog
          open={newConversationOpen}
          onOpenChange={setNewConversationOpen}
          onConversationCreated={(id) => {
            setActiveConversation(id);
            setNewConversationOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
