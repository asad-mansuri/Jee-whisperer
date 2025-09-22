-- One-to-one direct messages schema and user settings

-- Direct conversations: pair of participants
CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_a, user_b),
  CHECK (user_a <> user_b)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function to get a stable pair (min, max) to enforce uniqueness regardless of order
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(_user_a UUID, _user_b UUID)
RETURNS UUID AS $$
DECLARE
  a UUID;
  b UUID;
  conv_id UUID;
BEGIN
  IF _user_a = _user_b THEN
    RAISE EXCEPTION 'Cannot create conversation with self';
  END IF;

  IF _user_a < _user_b THEN
    a := _user_a; b := _user_b;
  ELSE
    a := _user_b; b := _user_a;
  END IF;

  INSERT INTO public.direct_conversations (user_a, user_b)
  VALUES (a, b)
  ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
  RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_prefs JSONB DEFAULT '{"tone":"friendly","detail":"standard"}',
  chat_privacy TEXT DEFAULT 'everyone', -- everyone | contacts | no_one
  mute_dm BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_user_settings ON public.user_settings;
CREATE TRIGGER touch_user_settings
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies: a user can see their conversations and messages
DROP POLICY IF EXISTS "dm: view own conversations" ON public.direct_conversations;
CREATE POLICY "dm: view own conversations" ON public.direct_conversations
FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "dm: create conversation" ON public.direct_conversations;
CREATE POLICY "dm: create conversation" ON public.direct_conversations
FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "dm: view messages" ON public.direct_messages;
CREATE POLICY "dm: view messages" ON public.direct_messages
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_a FROM public.direct_conversations c WHERE c.id = direct_messages.conversation_id
  ) OR auth.uid() IN (
    SELECT user_b FROM public.direct_conversations c WHERE c.id = direct_messages.conversation_id
  )
);

DROP POLICY IF EXISTS "dm: send messages" ON public.direct_messages;
CREATE POLICY "dm: send messages" ON public.direct_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    auth.uid() IN (
      SELECT user_a FROM public.direct_conversations c WHERE c.id = direct_messages.conversation_id
    ) OR auth.uid() IN (
      SELECT user_b FROM public.direct_conversations c WHERE c.id = direct_messages.conversation_id
    )
  )
);

-- Settings policies
DROP POLICY IF EXISTS "settings: view own" ON public.user_settings;
CREATE POLICY "settings: view own" ON public.user_settings
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings: upsert own" ON public.user_settings;
CREATE POLICY "settings: upsert own" ON public.user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings: update own" ON public.user_settings;
CREATE POLICY "settings: update own" ON public.user_settings
FOR UPDATE USING (auth.uid() = user_id);


