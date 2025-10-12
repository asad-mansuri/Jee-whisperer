-- Fix security issues with views - recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.leaderboard_ranked_total;
DROP VIEW IF EXISTS public.leaderboard_ranked_weekly;
DROP VIEW IF EXISTS public.leaderboard_ranked_monthly;

CREATE VIEW public.leaderboard_ranked_total AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.rank_updated_at ASC)::integer as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.total_xp DESC;

CREATE VIEW public.leaderboard_ranked_weekly AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.weekly_xp DESC, l.rank_updated_at ASC)::integer as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.weekly_xp DESC;

CREATE VIEW public.leaderboard_ranked_monthly AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.monthly_xp DESC, l.rank_updated_at ASC)::integer as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.monthly_xp DESC;

-- Add RLS policies for student_conversations
CREATE POLICY "Users can view global conversations"
  ON public.student_conversations
  FOR SELECT
  USING (is_global = true);

CREATE POLICY "Users can view conversations they created"
  ON public.student_conversations
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create conversations"
  ON public.student_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own conversations"
  ON public.student_conversations
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own conversations"
  ON public.student_conversations
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add RLS policies for student_messages
CREATE POLICY "Users can view messages in accessible conversations"
  ON public.student_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_conversations sc
      WHERE sc.id = student_messages.conversation_id
        AND (sc.is_global = true OR sc.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to accessible conversations"
  ON public.student_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.student_conversations sc
      WHERE sc.id = student_messages.conversation_id
        AND (sc.is_global = true OR sc.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.student_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.student_messages
  FOR DELETE
  USING (auth.uid() = sender_id);