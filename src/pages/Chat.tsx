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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
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

  // JEE-level quick prompts
  const quickPrompts = [
    {
      text: "Derive the equation for the time period of a simple pendulum and discuss the effect of length and gravity.",
      icon: Calculator,
      category: "Physics (JEE Level)"
    },
    {
      text: "Solve: If \u221A(x+3) + \u221A(x-2) = 5, find the value of x.",
      icon: Calculator,
      category: "Maths (JEE Level)"
    },
    {
      text: "Explain the mechanism of SN1 and SN2 reactions with suitable examples.",
      icon: Beaker,
      category: "Chemistry (JEE Level)"
    },
    {
      text: "A block slides down a frictionless incline of height h. Find its speed at the bottom using energy conservation.",
      icon: Atom,
      category: "Physics (JEE Level)"
    },
    {
      text: "Discuss the hybridization and shape of SF6 molecule.",
      icon: Beaker,
      category: "Chemistry (JEE Level)"
    },
    {
      text: "Find the equation of the tangent to the curve y = x^2 at x = 1.",
      icon: Calculator,
      category: "Maths (JEE Level)"
    }
  ];

  useEffect(() => {
    if (user) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="flex h-[calc(100vh-8rem)] gap-3 md:gap-6 px-2 md:px-4 lg:px-6">
      {/* Conversations Sidebar - desktop */}
      <Card className="w-72 lg:w-80 bg-gradient-card shadow-card hidden lg:block">
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
        <SheetContent side="left" className="w-[280px] sm:w-80 p-0">
          <SheetHeader className="p-3 sm:p-4">
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
              <CardTitle className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Mobile toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden mr-2"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="truncate">JEE Tutor & Mentor</span>
                </div>
                <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">JEE Advanced/ Mains</Badge>
                <Badge variant="secondary" className="ml-auto sm:hidden">JEE</Badge>
              </CardTitle>
            </CardHeader>

            <Separator />

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-2 sm:p-4">
              <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-primary" />
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Welcome to your JEE Tutor & Mentor!</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-2 sm:px-4 max-w-2xl mx-auto">
                      I am your personal AI mentor for JEE Mains & Advanced. Ask me conceptual doubts, get step-by-step solutions, or request tips for Physics, Chemistry, and Maths at the JEE level.
                    </p>
                    
                    <div className="w-full">
                      <Carousel
                        opts={{
                          align: "start",
                          loop: true,
                        }}
                        className="w-full max-w-[90vw] sm:max-w-full mx-auto"
                      >
                        <CarouselContent className="-ml-2 md:-ml-4">
                          {quickPrompts.map((prompt, index) => (
                            <CarouselItem key={index} className="pl-2 md:pl-4 basis-[85%] sm:basis-[70%] md:basis-1/2 lg:basis-1/3">
                              <Button
                                variant="outline"
                                className="w-full justify-start p-3 sm:p-4 h-auto hover-lift whitespace-normal text-left"
                                onClick={() => sendMessage(prompt.text)}
                                disabled={isLoading}
                              >
                                <prompt.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                                <div className="text-left w-full">
                                  <div className="font-medium break-words line-clamp-3">{prompt.text}</div>
                                  <div className="text-xs text-muted-foreground">{prompt.category}</div>
                                </div>
                              </Button>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex" />
                        <CarouselNext className="hidden md:flex" />
                      </Carousel>
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
                          <div className="bg-primary p-1.5 sm:p-2 rounded-full flex-shrink-0">
                            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed break-words">
                            {message.content}
                          </div>
                          <div className="text-[10px] sm:text-xs opacity-70 mt-1.5 sm:mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>

                        {message.sender === 'user' && (
                          <div className="bg-muted p-1.5 sm:p-2 rounded-full flex-shrink-0">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            <div className="p-2 sm:p-4">
              <div className="flex gap-2 sm:gap-3 items-end">
                <Input
                  placeholder="Ask me about JEE (Physics, Chemistry, Math)..."
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