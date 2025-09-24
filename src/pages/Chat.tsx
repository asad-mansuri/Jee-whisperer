import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Plus, 
  MessageCircle, 
  Bot, 
  User, 
  Loader2,
  Lightbulb,
  Calculator,
  Beaker,
  Atom,
  Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      text: "Explain Newton's laws of motion",
      icon: Calculator,
      category: "Physics"
    },
    {
      text: "What are acids and bases?",
      icon: Beaker,
      category: "Chemistry"
    },
    {
      text: "How does photosynthesis work?",
      icon: Lightbulb,
      category: "Biology"
    },
    {
      text: "Explain the periodic table structure",
      icon: Atom,
      category: "Chemistry"
    }
  ];

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConversations(data || []);
      
      // Auto-select first conversation or create new one
      if (data && data.length > 0) {
        setCurrentConversation(data[0].id);
        loadMessages(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'bot',
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'New Chat',
        })
        .select()
        .single();

      if (error) throw error;

      const newConv: Conversation = {
        id: data.id,
        title: data.title,
        updated_at: data.updated_at,
      };

      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(data.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new conversation',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage.trim();
    if (!textToSend || !currentConversation || isLoading) return;

    setIsLoading(true);
    setNewMessage('');

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      content: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call the chat edge function
      const response = await supabase.functions.invoke('chat', {
        body: {
          message: textToSend,
          conversationId: currentConversation,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send message');
      }

      // Reload messages to get the bot response
      await loadMessages(currentConversation);
      
      // Update conversation title if it's the first message
      const currentConv = conversations.find(c => c.id === currentConversation);
      if (currentConv && currentConv.title === 'New Chat') {
        const newTitle = textToSend.substring(0, 50) + (textToSend.length > 50 ? '...' : '');
        
        await supabase
          .from('conversations')
          .update({ title: newTitle })
          .eq('id', currentConversation);

        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversation 
              ? { ...conv, title: newTitle }
              : conv
          )
        );
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
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

  if (isLoadingConversations) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg font-medium">Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Conversations Sidebar - desktop */}
      <Card className="w-80 bg-gradient-card shadow-card hidden lg:block">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <Button
              size="sm"
              onClick={createNewConversation}
              className="hover-lift"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-3 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover-lift ${
                    currentConversation === conversation.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => {
                    setCurrentConversation(conversation.id);
                    loadMessages(conversation.id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {conversation.title}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}

              {conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet.</p>
                  <p className="text-sm">Start a new chat to get help!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <Button size="sm" onClick={createNewConversation} className="w-full mb-3">
              <Plus className="h-4 w-4 mr-2" /> New Chat
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="p-3 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover-lift ${
                    currentConversation === conversation.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => {
                    setCurrentConversation(conversation.id);
                    loadMessages(conversation.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {conversation.title}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}

              {conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet.</p>
                  <p className="text-sm">Start a new chat to get help!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Chat Area */}
      <Card className="flex-1 bg-gradient-card shadow-card">
        {currentConversation ? (
          <div className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                {/* Mobile toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden mr-2"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Bot className="h-5 w-5 text-primary" />
                Smart AI Tutor
                <Badge variant="secondary" className="ml-auto">Class 10 Science</Badge>
              </CardTitle>
            </CardHeader>

            <Separator />

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Welcome to Smart AI Tutor!</h3>
                    <p className="text-muted-foreground mb-6">
                      I'm here to help you with Class 10 Science. Ask me anything about Physics, Chemistry, or Biology!
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {quickPrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="justify-start p-4 h-auto hover-lift"
                          onClick={() => sendMessage(prompt.text)}
                          disabled={isLoading}
                        >
                          <prompt.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">{prompt.text}</div>
                            <div className="text-xs text-muted-foreground">{prompt.category}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.sender === 'bot' && (
                          <div className="bg-primary p-2 rounded-full">
                            <Bot className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[80%] p-4 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </div>
                          <div className="text-xs opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>

                        {message.sender === 'user' && (
                          <div className="bg-muted p-2 rounded-full">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="bg-primary p-2 rounded-full">
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            <Separator />

            {/* Input Area */}
            <div className="p-4">
              <div className="flex gap-3 items-end">
                <Input
                  placeholder="Ask me anything about Class 10 Science..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!newMessage.trim() || isLoading}
                  className="hover-lift"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose an existing conversation or create a new one to start chatting.
              </p>
              <Button onClick={createNewConversation} className="hover-lift">
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Chat;