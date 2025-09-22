import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Clock, 
  Send,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudentConversation {
  id: string;
  name: string;
  description: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  message_count?: number;
  last_message_time?: string;
}

interface StudentMessage {
  id: string;
  content: string;
  sender_id: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function StudentChat() {
  const [conversations, setConversations] = useState<StudentConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<StudentConversation | null>(null);
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingConversation, setEditingConversation] = useState<StudentConversation | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      // Set up real-time subscription for messages
      const channel = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'student_messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
          },
          (payload) => {
            // Fetch the complete message with profile data
            fetchMessages(selectedConversation.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('student_conversations')
        .select(`
          *,
          profiles:created_by (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch message counts and last message times
      const conversationsWithStats = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messageData } = await supabase
            .from('student_messages')
            .select('created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('student_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          return {
            ...conv,
            message_count: count || 0,
            last_message_time: messageData?.[0]?.created_at || conv.created_at,
          };
        })
      );

      setConversations(conversationsWithStats);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_messages')
        .select(`
          *,
          profiles:sender_id (
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createConversation = async () => {
    if (!newChatName.trim() || !user) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('student_conversations')
        .insert({
          name: newChatName.trim(),
          description: newChatDescription.trim() || null,
          created_by: user.id,
          is_global: false,
        });

      if (error) throw error;

      setNewChatName('');
      setNewChatDescription('');
      await fetchConversations();
      toast({
        title: 'Success',
        description: 'Chat room created successfully!',
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat room.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateConversation = async () => {
    if (!editingConversation || !newChatName.trim()) return;

    try {
      const { error } = await supabase
        .from('student_conversations')
        .update({
          name: newChatName.trim(),
          description: newChatDescription.trim() || null,
        })
        .eq('id', editingConversation.id);

      if (error) throw error;

      setEditingConversation(null);
      setNewChatName('');
      setNewChatDescription('');
      await fetchConversations();
      
      if (selectedConversation?.id === editingConversation.id) {
        setSelectedConversation(prev => prev ? {
          ...prev,
          name: newChatName.trim(),
          description: newChatDescription.trim() || null,
        } : null);
      }

      toast({
        title: 'Success',
        description: 'Chat room updated successfully!',
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chat room.',
        variant: 'destructive',
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // First delete all messages in the conversation
      await supabase
        .from('student_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete the conversation
      const { error } = await supabase
        .from('student_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      await fetchConversations();
      toast({
        title: 'Success',
        description: 'Chat room deleted successfully!',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat room.',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('student_messages')
        .insert({
          conversation_id: selectedConversation.id,
          content: newMessage.trim(),
          sender_id: user.id,
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const canEditOrDelete = (conversation: StudentConversation) => {
    return user?.id === conversation.created_by;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-muted rounded"></div>
              <div className="lg:col-span-2 h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Student Chat</h1>
          <p className="text-muted-foreground">Connect and collaborate with your classmates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Rooms
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Chat Room</DialogTitle>
                      <DialogDescription>
                        Start a new conversation with your classmates
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Room Name *</label>
                        <Input
                          value={newChatName}
                          onChange={(e) => setNewChatName(e.target.value)}
                          placeholder="e.g., Physics Study Group"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={newChatDescription}
                          onChange={(e) => setNewChatDescription(e.target.value)}
                          placeholder="What's this chat room about?"
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={createConversation}
                        disabled={!newChatName.trim() || isCreating}
                      >
                        {isCreating ? 'Creating...' : 'Create Room'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No chat rooms yet.</p>
                  <p className="text-sm">Create one to get started!</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-primary/10 border-primary'
                        : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold truncate flex-1">{conversation.name}</h3>
                      {canEditOrDelete(conversation) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConversation(conversation);
                                setNewChatName(conversation.name);
                                setNewChatDescription(conversation.description || '');
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => e.stopPropagation()}
                              className="text-destructive"
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <div className="flex items-center w-full">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Chat Room</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{conversation.name}"? 
                                      All messages will be permanently deleted. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteConversation(conversation.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    {conversation.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {conversation.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{conversation.message_count || 0} messages</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(conversation.last_message_time || conversation.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        by {conversation.profiles?.display_name || 'Anonymous'}
                      </span>
                      {conversation.is_global && (
                        <Badge variant="secondary" className="text-xs">Global</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="pb-4">
                  <CardTitle>{selectedConversation.name}</CardTitle>
                  {selectedConversation.description && (
                    <CardDescription>{selectedConversation.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet.</p>
                        <p className="text-sm">Be the first to start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.sender_id === user?.id ? 'flex-row-reverse' : ''
                          }`}
                        >
                          {/* Avatar removed */}
                          <div className={`flex-1 max-w-xs ${
                            message.sender_id === user?.id ? 'text-right' : ''
                          }`}>
                            <div className="flex items-baseline gap-2 mb-1">
                              {message.sender_id !== user?.id && (
                                <span className="text-sm font-medium">
                                  {message.profiles?.display_name || 'Anonymous'}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                            <div className={`p-3 rounded-lg ${
                              message.sender_id === user?.id
                                ? 'bg-primary text-primary-foreground ml-auto'
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a Chat Room</h3>
                  <p>Choose a conversation from the sidebar to start chatting</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingConversation} onOpenChange={(open) => !open && setEditingConversation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Chat Room</DialogTitle>
              <DialogDescription>
                Update the chat room details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Room Name *</label>
                <Input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="e.g., Physics Study Group"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newChatDescription}
                  onChange={(e) => setNewChatDescription(e.target.value)}
                  placeholder="What's this chat room about?"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingConversation(null)}>
                Cancel
              </Button>
              <Button
                onClick={updateConversation}
                disabled={!newChatName.trim()}
              >
                Update Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}