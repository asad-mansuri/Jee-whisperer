-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  class TEXT DEFAULT '10',
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table for tracking user progress
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  activity_type TEXT CHECK (activity_type IN ('quiz', 'lecture', 'simulation', 'chat', 'note')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table for chatbot
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table for chatbot conversations
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender TEXT CHECK (sender IN ('user', 'bot')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_results table
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simulation_launches table
CREATE TABLE public.simulation_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  simulation_id TEXT NOT NULL,
  simulation_name TEXT,
  launched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lecture_views table
CREATE TABLE public.lecture_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT,
  watched_seconds INTEGER DEFAULT 0,
  total_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leaderboard table
CREATE TABLE public.leaderboard (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  weekly_xp INTEGER DEFAULT 0,
  monthly_xp INTEGER DEFAULT 0,
  rank_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_conversations for peer chat
CREATE TABLE public.student_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'General Chat',
  description TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_messages for peer chat
CREATE TABLE public.student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.student_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for activities
CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for conversations
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in own conversations" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert messages in own conversations" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND user_id = auth.uid())
);

-- Create RLS policies for quiz_results
CREATE POLICY "Users can view own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for simulation_launches
CREATE POLICY "Users can view own simulation launches" ON public.simulation_launches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own simulation launches" ON public.simulation_launches FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for lecture_views
CREATE POLICY "Users can view own lecture views" ON public.lecture_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lecture views" ON public.lecture_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lecture views" ON public.lecture_views FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for leaderboard
CREATE POLICY "Users can view leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can update own leaderboard entry" ON public.leaderboard FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leaderboard entry" ON public.leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for student_conversations
CREATE POLICY "Users can view all student conversations" ON public.student_conversations FOR SELECT USING (true);
CREATE POLICY "Users can create student conversations" ON public.student_conversations FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Create RLS policies for student_messages
CREATE POLICY "Users can view all student messages" ON public.student_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert student messages" ON public.student_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  
  -- Initialize leaderboard entry
  INSERT INTO public.leaderboard (user_id, total_xp, weekly_xp, monthly_xp)
  VALUES (NEW.id, 0, 0, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create default global chat room
INSERT INTO public.student_conversations (name, description, is_global, created_by)
VALUES ('General Discussion', 'A place for all students to chat and help each other', true, NULL);

-- Enable realtime for real-time features
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;
