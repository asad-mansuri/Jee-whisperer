import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Search, Clock, UserCircle, Send } from 'lucide-react';

type ConversationListItem = {
  id: string;
  other_user_id: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message?: string | null;
  last_message_time?: string | null;
};

type DirectMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

export default function DirectChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedPeer, setSelectedPeer] = useState<{ id: string; name: string | null } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null; avatar_url: string | null }[]>([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    fetchMessages(selectedConversationId);
    const channel = supabase
      .channel(`direct-messages-${selectedConversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${selectedConversationId}` }, () => {
        fetchMessages(selectedConversationId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('direct_conversations')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const items: ConversationListItem[] = [];
      for (const conv of data || []) {
        const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', otherId)
          .single();
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        items.push({
          id: conv.id,
          other_user_id: otherId,
          other_display_name: profile?.display_name ?? null,
          other_avatar_url: profile?.avatar_url ?? null,
          last_message: lastMsg?.content ?? null,
          last_message_time: lastMsg?.created_at ?? conv.created_at,
        });
      }
      setConversations(items);
    } catch (e) {
      console.error('Error loading DMs', e);
      toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('id, content, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (!error) setMessages((data || []) as DirectMessage[]);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${searchQuery}%`)
      .limit(10);
    setSearchResults(data || []);
  };

  const startDirectConversation = async (otherUserId: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc('ensure_direct_conversation', { _user_a: user.id, _user_b: otherUserId });
    if (error) {
      toast({ title: 'Error', description: 'Could not start conversation', variant: 'destructive' });
      return;
    }
    await fetchConversations();
    setSelectedConversationId(data as unknown as string);
    const peer = searchResults.find((p) => p.id === otherUserId);
    setSelectedPeer({ id: otherUserId, name: peer?.display_name ?? null });
    setSearchQuery('');
    setSearchResults([]);
  };

  const sendMessage = async () => {
    if (!user || !selectedConversationId || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({ conversation_id: selectedConversationId, sender_id: user.id, content: newMessage.trim() });
      if (error) throw error;
      setNewMessage('');
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const headerTitle = useMemo(() => (selectedPeer?.name ? selectedPeer.name : 'Direct Messages'), [selectedPeer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-muted rounded" />
              <div className="lg:col-span-2 h-96 bg-muted rounded" />
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
          <p className="text-muted-foreground">One-to-one chats with classmates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Direct Messages
                </CardTitle>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search students by name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={searchUsers}>Search</Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {searchResults.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Search results</div>
                  {searchResults.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5" />
                        <span className="text-sm">{p.display_name || 'Anonymous'}</span>
                      </div>
                      <Button size="sm" onClick={() => startDirectConversation(p.id)}>Chat</Button>
                    </div>
                  ))}
                  <div className="h-px bg-border my-2" />
                </div>
              )}

              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet.</p>
                  <p className="text-sm">Search a student to start chatting.</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${selectedConversationId === c.id ? 'bg-primary/10 border-primary' : ''}`}
                    onClick={() => {
                      setSelectedConversationId(c.id);
                      setSelectedPeer({ id: c.other_user_id, name: c.other_display_name });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{c.other_display_name || 'Anonymous'}</div>
                        {c.last_message && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{c.last_message}</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversationId ? (
              <>
                <CardHeader className="pb-4">
                  <CardTitle>{headerTitle}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet.</p>
                        <p className="text-sm">Be the first to start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`flex gap-3 ${m.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex-1 max-w-xs ${m.sender_id === user?.id ? 'text-right' : ''}`}>
                            <div className="text-xs text-muted-foreground mb-1">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className={`p-3 rounded-lg ${m.sender_id === user?.id ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
                              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
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
                  <h3 className="text-lg font-medium mb-2">Select a Conversation</h3>
                  <p>Choose from the left or search a student to start chatting</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}


