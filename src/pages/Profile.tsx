import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { 
  User, 
  Moon, 
  Sun, 
  Camera, 
  MessageSquare, 
  Trash2, 
  Edit3,
  Save,
  X,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { toast } from '@/components/ui/use-toast';


interface Profile {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}



export default function Profile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  
  // Form data
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);


  

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;
        
        setProfile(createdProfile);
        setDisplayName(createdProfile.display_name || '');
        setAvatarUrl('');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const conversationsWithCount = data?.map(conv => ({
        ...conv,
        message_count: conv.messages?.[0]?.count || 0
      })) || [];
      
      setConversations(conversationsWithCount);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchConversations();
    }
  }, [user, fetchProfile, fetchConversations]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await fetchProfile(); // Refresh profile data
      setEditingProfile(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      await fetchConversations(); // Refresh conversations
      
      toast({
        title: "Success",
        description: "Conversation deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error", 
        description: "Failed to delete conversation.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateConversationTitle = async (conversationId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
      
      await fetchConversations(); // Refresh conversations
      setEditingConversation(null);
      setNewConversationTitle('');
      
      toast({
        title: "Success",
        description: "Conversation title updated!",
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation title.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account, preferences, and data</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="chats">My Chats</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarUrl || ''} />
                    <AvatarFallback>
                      {displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar-url">Avatar URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="avatar-url"
                        placeholder="https://..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        disabled={!editingProfile}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!editingProfile}
                        onClick={() => {
                          // Simple validation for now
                          if (!avatarUrl) return;
                          toast({ title: 'Preview updated' });
                        }}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste an image URL. This avatar appears on the leaderboard.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!editingProfile}
                      placeholder="Enter your display name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  

                </div>

                <div className="flex gap-3">
                  {!editingProfile ? (
                    <Button onClick={() => setEditingProfile(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingProfile(false);
                        setDisplayName(profile?.display_name || '');
                        setAvatarUrl(profile?.avatar_url || '');
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chats Tab */}
          <TabsContent value="chats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  My Conversations ({conversations.length})
                </CardTitle>
                <CardDescription>
                  Manage your chat conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet. Start chatting to see them here!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        
                        <div className="flex-1 min-w-0">
                          {editingConversation === conversation.id ? (
                            <Input
                              value={newConversationTitle}
                              onChange={(e) => setNewConversationTitle(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateConversationTitle(conversation.id, newConversationTitle);
                                }
                              }}
                              placeholder="Enter new title..."
                              autoFocus
                            />
                          ) : (
                            <div>
                              <h3 className="font-medium truncate">{conversation.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {conversation.message_count} messages
                                </Badge>
                                <span>•</span>
                                <span>{new Date(conversation.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {editingConversation === conversation.id ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleUpdateConversationTitle(conversation.id, newConversationTitle)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingConversation(null);
                                  setNewConversationTitle('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingConversation(conversation.id);
                                  setNewConversationTitle(conversation.title);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{conversation.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteConversation(conversation.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Appearance & Preferences
                </CardTitle>
                <CardDescription>
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                    <Moon className="h-4 w-4" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base">Account Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Member since</p>
                      <p className="font-medium">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profile updated</p>
                      <p className="font-medium">
                        {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}