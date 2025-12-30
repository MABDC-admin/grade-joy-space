import { useState, useEffect } from 'react';
import { Search, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface User {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const { user, profile } = useAuth();
  const { createConversation, conversations } = useChat();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    } else {
      setSelectedUsers([]);
      setSearch('');
    }
  }, [open]);

  const fetchUsers = async () => {
    if (!user || !profile?.school_id) return;

    setLoading(true);
    try {
      // Get all users in the same school
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('school_id', profile.school_id)
        .neq('user_id', user.id)
        .order('full_name');

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0 || creating) return;

    setCreating(true);
    try {
      // Check if a direct conversation already exists
      if (selectedUsers.length === 1) {
        const existingConv = conversations.find(c =>
          c.is_direct &&
          c.participants.length === 1 &&
          c.participants[0].user_id === selectedUsers[0]
        );

        if (existingConv) {
          onConversationCreated(existingConv.id);
          return;
        }
      }

      const conv = await createConversation(selectedUsers);
      if (conv) {
        onConversationCreated(conv.id);
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-1">
                {filteredUsers.map(u => {
                  const isSelected = selectedUsers.includes(u.user_id);
                  return (
                    <button
                      key={u.user_id}
                      onClick={() => toggleUser(u.user_id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.full_name || 'User'}</p>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      </div>
                      {isSelected && (
                        <div className="rounded-full bg-primary p-1">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                {search ? 'No users found' : 'No users available'}
              </p>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedUsers.length === 0 || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Start Chat${selectedUsers.length > 1 ? ` (${selectedUsers.length})` : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
