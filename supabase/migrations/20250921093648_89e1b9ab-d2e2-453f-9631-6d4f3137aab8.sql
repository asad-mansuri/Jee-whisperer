-- Create personal_messages table for direct messaging between users
CREATE TABLE public.personal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.personal_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for personal messages
CREATE POLICY "Users can view messages they sent or received" 
ON public.personal_messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON public.personal_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON public.personal_messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON public.personal_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX idx_personal_messages_sender_receiver ON public.personal_messages(sender_id, receiver_id);
CREATE INDEX idx_personal_messages_created_at ON public.personal_messages(created_at);

-- Create function to update timestamps
CREATE TRIGGER update_personal_messages_updated_at
BEFORE UPDATE ON public.personal_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for personal messages
ALTER TABLE public.personal_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_messages;