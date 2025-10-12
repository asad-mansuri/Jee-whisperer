-- Create leaderboard ranked views for rankings
CREATE OR REPLACE VIEW public.leaderboard_ranked_total AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.rank_updated_at ASC) as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.total_xp DESC;

CREATE OR REPLACE VIEW public.leaderboard_ranked_weekly AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.weekly_xp DESC, l.rank_updated_at ASC) as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.weekly_xp DESC;

CREATE OR REPLACE VIEW public.leaderboard_ranked_monthly AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.monthly_xp DESC, l.rank_updated_at ASC) as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.monthly_xp DESC;

-- Create direct_conversations table for 1-on-1 chats
CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT different_users CHECK (user_a != user_b),
  CONSTRAINT ordered_users CHECK (user_a < user_b),
  UNIQUE(user_a, user_b)
);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own direct conversations"
  ON public.direct_conversations
  FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create direct conversations"
  ON public.direct_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Create direct_messages table for messages in 1-on-1 chats
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON public.direct_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
        AND (dc.user_a = auth.uid() OR dc.user_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.direct_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
        AND (dc.user_a = auth.uid() OR dc.user_b = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON public.direct_messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Create function to ensure direct conversation exists
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(user_a_id uuid, user_b_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id uuid;
  ordered_user_a uuid;
  ordered_user_b uuid;
BEGIN
  -- Order the user IDs to ensure consistent lookup
  IF user_a_id < user_b_id THEN
    ordered_user_a := user_a_id;
    ordered_user_b := user_b_id;
  ELSE
    ordered_user_a := user_b_id;
    ordered_user_b := user_a_id;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM public.direct_conversations
  WHERE user_a = ordered_user_a AND user_b = ordered_user_b;
  
  -- If not found, create it
  IF conversation_id IS NULL THEN
    INSERT INTO public.direct_conversations (user_a, user_b)
    VALUES (ordered_user_a, ordered_user_b)
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$;

-- Create trigger to update updated_at on direct_conversations
DROP TRIGGER IF EXISTS update_direct_conversations_updated_at ON public.direct_conversations;
CREATE TRIGGER update_direct_conversations_updated_at
  BEFORE UPDATE ON public.direct_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();