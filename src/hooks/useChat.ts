import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachments: Json;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  is_direct: boolean;
  class_id: string | null;
  created_at: string;
  updated_at: string;
  participants: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
  last_message?: ChatMessage | null;
  unread_count: number;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get conversations where user is participant
      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);
      const lastReadMap = new Map(participantData.map(p => [p.conversation_id, p.last_read_at]));

      // Get conversation details
      const { data: convData } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (!convData) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get all participants for these conversations
      const { data: allParticipants } = await supabase
        .from('chat_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      // Get profiles for all participants
      const participantUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', participantUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get last message for each conversation
      const { data: lastMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      const lastMessageMap = new Map<string, ChatMessage>();
      lastMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      });

      // Count unread messages per conversation
      const unreadCounts = new Map<string, number>();
      for (const conv of convData) {
        const lastRead = lastReadMap.get(conv.id);
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .gt('created_at', lastRead || '1970-01-01');
        
        unreadCounts.set(conv.id, count || 0);
      }

      const conversationsWithDetails: ChatConversation[] = convData.map(conv => {
        const participants = (allParticipants || [])
          .filter(p => p.conversation_id === conv.id && p.user_id !== user.id)
          .map(p => {
            const profile = profileMap.get(p.user_id);
            return {
              user_id: p.user_id,
              full_name: profile?.full_name || null,
              avatar_url: profile?.avatar_url || null,
            };
          });

        return {
          id: conv.id,
          title: conv.title,
          is_direct: conv.is_direct,
          class_id: conv.class_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          participants,
          last_message: lastMessageMap.get(conv.id) || null,
          unread_count: unreadCounts.get(conv.id) || 0,
        };
      });

      setConversations(conversationsWithDetails);
      setUnreadTotal(conversationsWithDetails.reduce((acc, c) => acc + c.unread_count, 0));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    setMessagesLoading(true);
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (data) {
        // Get sender profiles
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setMessages(data.map(msg => ({
          ...msg,
          sender: profileMap.get(msg.sender_id) || null,
        })));

        // Mark messages as read
        await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        // Update unread count in local state
        setConversations(prev => 
          prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
        );
        setUnreadTotal(prev => {
          const conv = conversations.find(c => c.id === conversationId);
          return prev - (conv?.unread_count || 0);
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user, conversations]);

  // Send a message
  const sendMessage = useCallback(async (content: string, conversationId: string) => {
    if (!user || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, [user]);

  // Create a new conversation
  const createConversation = useCallback(async (participantIds: string[], title?: string, classId?: string) => {
    if (!user) return null;

    try {
      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          title: title || null,
          is_direct: participantIds.length === 1,
          class_id: classId || null,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants including current user
      const allParticipants = [...new Set([user.id, ...participantIds])];
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(
          allParticipants.map(userId => ({
            conversation_id: conv.id,
            user_id: userId,
          }))
        );

      if (partError) throw partError;

      await fetchConversations();
      return conv;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user, fetchConversations]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // If message is in active conversation, add it
          if (activeConversation && newMessage.conversation_id === activeConversation) {
            setMessages(prev => [...prev, newMessage]);
          }
          
          // Refresh conversations to update last_message and unread
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    messagesLoading,
    unreadTotal,
    sendMessage,
    createConversation,
    fetchConversations,
  };
}
