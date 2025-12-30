-- Chat System Tables

-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  is_direct BOOLEAN DEFAULT false,
  title TEXT
);

-- Chat participants table
CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is participant
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view conversations they are part of"
ON public.chat_conversations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  is_chat_participant(auth.uid(), id)
);

CREATE POLICY "Authenticated users can create conversations"
ON public.chat_conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversation"
ON public.chat_conversations
FOR UPDATE
USING (is_chat_participant(auth.uid(), id));

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their conversations"
ON public.chat_participants
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  is_chat_participant(auth.uid(), conversation_id) OR
  user_id = auth.uid()
);

CREATE POLICY "Users can join conversations"
ON public.chat_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own participation"
ON public.chat_participants
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can leave conversations"
ON public.chat_participants
FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Participants can view messages"
ON public.chat_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  is_chat_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Participants can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  is_chat_participant(auth.uid(), conversation_id)
);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Update updated_at trigger for conversations
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();