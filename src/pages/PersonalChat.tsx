import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  MessageCircle, 
  User, 
  Loader2,
  Search,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PersonalMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender_profile?: {
    display_name: string;
  };
}

interface ChatUser {
  id: string;
  display_name: string;
  class: string;
  section: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

const PersonalChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadChatUsers();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
      
      // Set up real-time subscription for messages
      const channel = supabase
        .channel('personal-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'personal_messages',
            filter: `or(and(sender_id.eq.${user?.id},receiver_id.eq.${selectedChat}),and(sender_id.eq.${selectedChat},receiver_id.eq.${user?.id}))`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as PersonalMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, user?.id]);

  const loadChatUsers = async () => {
    try {
      // Get all users from leaderboard with profiles
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          user_id,
          profiles!leaderboard_user_id_profiles_id_fkey(
            id,
            display_name,
            class,
            section
          )
        `)
        .neq('user_id', user?.id);

      if (error) throw error;

      const users = data?.map(entry => ({
        id: entry.user_id,
        display_name: entry.profiles?.display_name || 'Unknown User',
        class: entry.profiles?.class || '10',
        section: entry.profiles?.section || '',
      })) || [];

      setChatUsers(users);
    } catch (error) {
      console.error('Error loading chat users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase.from('student_messages')
        .from('personal_messages')
        .select(`
          *,
          sender_profile:profiles!personal_messages_sender_id_profiles_id_fkey(display_name)
        `)
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isLoading) return;

    setIsLoading(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('student_messages')
        .insert({
          sender_id: user?.id,
          receiver_id: selectedChat,
          content: messageText,
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredUsers = chatUsers.filter(user =>
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = chatUsers.find(u => u.id === selectedChat);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 bg-background">
      {/* Chat List Sidebar - WhatsApp Style */}
      <div className="w-80 bg-muted/30 border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-semibold mb-3">Chats</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-140px)]">
          <div className="space-y-1 p-2">
            {filteredUsers.map((chatUser) => (
              <div
                key={chatUser.id}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                  selectedChat === chatUser.id
                    ? 'bg-primary/10 border-l-4 border-primary'
                    : ''
                }`}
                onClick={() => setSelectedChat(chatUser.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10">
                      {chatUser.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {chatUser.display_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Class {chatUser.class}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Section {chatUser.section}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area - WhatsApp Style */}
      <div className="flex-1 flex flex-col">
        {selectedChat && selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg">
                    {selectedUser.display_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedUser.display_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Class {selectedUser.class} • Section {selectedUser.section}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-2">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-muted/10">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    } animate-fade-in`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl relative ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card border rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-end">
                    <div className="bg-primary/20 p-3 rounded-2xl rounded-br-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message Input - WhatsApp Style */}
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="flex gap-3 items-end">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 rounded-3xl resize-none border-2 focus:border-primary"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  className="rounded-full h-10 w-10 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center max-w-md mx-auto">
              <MessageCircle className="h-20 w-20 mx-auto mb-6 text-muted-foreground opacity-50" />
              <h3 className="text-2xl font-semibold mb-3">Welcome to Personal Chat</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Select a classmate from the list to start a personal conversation. 
                Connect with your peers and collaborate on your studies!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalChat;