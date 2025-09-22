import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Trash2,
  Edit3
} from 'lucide-react';
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
      
      // Auto-select first conversation if exists
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

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast({
        title: 'Success',
        description: 'Conversation deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage.trim();
    if (!textToSend || isLoading) return;

    // Create new conversation if none exists
    if (!currentConversation) {
      await createNewConversation();
      // Wait a bit for the conversation to be created
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!currentConversation) return;

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
    <div className="flex h-screen bg-background">
      {/* Sidebar - ChatGPT Style */}
      <div className="w-80 bg-muted/30 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={createNewConversation}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                  currentConversation === conversation.id
                    ? 'bg-muted border border-border'
                    : ''
                }`}
                onClick={() => {
                  setCurrentConversation(conversation.id);
                  loadMessages(conversation.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate flex-1">
                    {conversation.title}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add edit functionality here if needed
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}

            {conversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No conversations yet.</p>
                <p className="text-xs">Start a new chat to get help!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area - ChatGPT Style */}
      <div className="flex-1 flex flex-col">
        {currentConversation || messages.length > 0 ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-full">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold">Smart AI Tutor</h1>
                  <p className="text-sm text-muted-foreground">Class 10 Science Assistant</p>
                </div>
                <Badge variant="secondary" className="ml-auto">Online</Badge>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Bot className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-3">How can I help you today?</h2>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      I'm your AI tutor for Class 10 Science. Ask me anything about Physics, Chemistry, or Biology!
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {quickPrompts.map((prompt, index) => (
                        <Card
                          key={index}
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20"
                          onClick={() => sendMessage(prompt.text)}
                        >
                          <CardContent className="p-0">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <prompt.icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-sm">{prompt.text}</div>
                                <div className="text-xs text-muted-foreground mt-1">{prompt.category}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.sender === 'bot' && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={`max-w-[80%] ${
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          } rounded-2xl px-4 py-3`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </div>
                        </div>

                        {message.sender === 'user' && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="bg-muted">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-4 justify-start">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl px-4 py-3">
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

            {/* Input Area - ChatGPT Style */}
            <div className="p-4 border-t border-border bg-background">
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <Input
                    placeholder="Message Smart AI Tutor..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="pr-12 py-3 rounded-2xl border-2 focus:border-primary"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!newMessage.trim() || isLoading}
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Smart AI Tutor can make mistakes. Consider checking important information.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Welcome to Smart AI Tutor</h2>
              <p className="text-muted-foreground mb-6">
                Start a new conversation to get help with Class 10 Science topics.
              </p>
              <Button onClick={createNewConversation} className="gap-2">
                <Plus className="h-4 w-4" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;