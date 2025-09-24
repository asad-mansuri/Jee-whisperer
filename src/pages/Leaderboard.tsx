import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Crown, TrendingUp, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  weekly_xp: number;
  monthly_xp: number;
  rank: number;
  display_name: string | null;
  avatar_url: string | null;
  class: string | null;
  section: string | null;
}

interface UserStats {
  totalQuizzes: number;
  averageScore: number;
  favoriteSubject: string;
  currentStreak: number;
  totalXP: number;
  weeklyXP: number;
  monthlyXP: number;
  currentRank: number | null;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('total');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaderboardData();
    if (user) {
      fetchUserStats();
    }
  }, [user, activeTab]);

  const fetchLeaderboardData = async () => {
    try {
      const viewName = activeTab === 'total'
        ? 'leaderboard_ranked_total'
        : activeTab === 'weekly'
        ? 'leaderboard_ranked_weekly'
        : 'leaderboard_ranked_monthly';

      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .order('rank', { ascending: true })
        .limit(50);

      if (error) {
        console.warn('View fetch failed, using fallback.', error);
        await fetchLeaderboardDataFallback();
        return;
      }

      if (!data || data.length === 0) {
        await fetchLeaderboardDataFallback();
        return;
      }

      // Ensure client-side ordering by rank just in case
      const sorted = (data || []).slice().sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));
      setLeaderboardData(sorted);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboardDataFallback = async () => {
    try {
      const metric = activeTab === 'total' ? 'total_xp' : activeTab === 'weekly' ? 'weekly_xp' : 'monthly_xp';

      const { data: baseRows, error: baseErr } = await supabase
        .from('leaderboard')
        .select('user_id, total_xp, weekly_xp, monthly_xp, rank_updated_at')
        .order(metric, { ascending: false })
        .order('rank_updated_at', { ascending: true })
        .limit(50);

      if (baseErr) throw baseErr;

      const userIds = (baseRows || []).map(r => r.user_id);
      let profilesById: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, class, section')
          .in('id', userIds);
        if (profErr) throw profErr;
        profilesById = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      }

      const sorted = (baseRows || []).slice().sort((a: any, b: any) => {
        const av = a[metric] || 0; const bv = b[metric] || 0;
        if (bv !== av) return bv - av;
        const at = new Date(a.rank_updated_at || 0).getTime();
        const bt = new Date(b.rank_updated_at || 0).getTime();
        return at - bt;
      });

      let lastVal: number | null = null;
      let lastRank = 0;
      const enriched = sorted.map((row: any, idx: number) => {
        const val = row[metric] || 0;
        if (lastVal === null || val !== lastVal) {
          lastRank = idx + 1;
          lastVal = val;
        }
        const prof = profilesById[row.user_id] || {};
        return {
          user_id: row.user_id,
          total_xp: row.total_xp || 0,
          weekly_xp: row.weekly_xp || 0,
          monthly_xp: row.monthly_xp || 0,
          rank: lastRank,
          display_name: prof.display_name || null,
          avatar_url: prof.avatar_url || null,
          class: prof.class || null,
          section: prof.section || null,
        } as LeaderboardEntry;
      });

      setLeaderboardData(enriched);
    } catch (fallbackErr) {
      console.error('Fallback fetch failed:', fallbackErr);
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard data.',
        variant: 'destructive',
      });
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch user's quiz results
      const { data: quizResults, error: quizError } = await supabase
        .from('quiz_results')
        .select('score, topic, created_at, xp_earned')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (quizError) throw quizError;

      // Fetch user's leaderboard data
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (leaderboardError && leaderboardError.code !== 'PGRST116') {
        throw leaderboardError;
      }

      // Get user's current rank from the active tab view
      const viewName = activeTab === 'total'
        ? 'leaderboard_ranked_total'
        : activeTab === 'weekly'
        ? 'leaderboard_ranked_weekly'
        : 'leaderboard_ranked_monthly';

      const { data: rankData } = await supabase
        .from(viewName)
        .select('rank')
        .eq('user_id', user.id)
        .single();

      if (quizResults && quizResults.length > 0) {
        const totalQuizzes = quizResults.length;
        const averageScore = quizResults.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes;
        
        // Find most common subject
        const subjectCounts: Record<string, number> = {};
        quizResults.forEach(quiz => {
          const topic = quiz.topic || 'general';
          subjectCounts[topic] = (subjectCounts[topic] || 0) + 1;
        });
        const favoriteSubject = Object.keys(subjectCounts).length > 0 
          ? Object.keys(subjectCounts).reduce((a, b) => 
              subjectCounts[a] > subjectCounts[b] ? a : b
            )
          : 'general';

        // Calculate streak (simplified - consecutive days with quizzes)
        let currentStreak = 0;
        const today = new Date();
        const sortedDates = [...new Set(quizResults.map(q => q.created_at.split('T')[0]))].sort().reverse();
        
        for (let i = 0; i < sortedDates.length; i++) {
          const quizDate = new Date(sortedDates[i]);
          const daysDiff = Math.floor((today.getTime() - quizDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === i) {
            currentStreak++;
          } else {
            break;
          }
        }

        setUserStats({
          totalQuizzes,
          averageScore: Math.round(averageScore),
          favoriteSubject,
          currentStreak,
          totalXP: leaderboard?.total_xp || 0,
          weeklyXP: leaderboard?.weekly_xp || 0,
          monthlyXP: leaderboard?.monthly_xp || 0,
          currentRank: rankData?.rank || null,
        });
      } else {
        setUserStats({
          totalQuizzes: 0,
          averageScore: 0,
          favoriteSubject: 'general',
          currentStreak: 0,
          totalXP: leaderboard?.total_xp || 0,
          weeklyXP: leaderboard?.weekly_xp || 0,
          monthlyXP: leaderboard?.monthly_xp || 0,
          currentRank: rankData?.rank || null,
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your stats.',
        variant: 'destructive',
      });
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Award className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-muted';
    }
  };

  const getXPForTab = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'weekly':
        return entry.weekly_xp || 0;
      case 'monthly':
        return entry.monthly_xp || 0;
      default:
        return entry.total_xp || 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Compete with your classmates and climb the ranks!</p>
        </div>

        {user && userStats && (
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Performance
              </CardTitle>
              <CardDescription>Your current stats and ranking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {userStats.currentRank ? `#${userStats.currentRank}` : '--'}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Rank</div>
                </div>
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-accent">
                    {activeTab === 'total' ? userStats.totalXP : 
                     activeTab === 'weekly' ? userStats.weeklyXP : 
                     userStats.monthlyXP}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activeTab === 'total' ? 'Total XP' : 
                     activeTab === 'weekly' ? 'Weekly XP' : 
                     'Monthly XP'}
                  </div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-2xl font-bold">{userStats.totalQuizzes}</div>
                  <div className="text-sm text-muted-foreground">Quizzes</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-2xl font-bold">{userStats.averageScore}%</div>
                  <div className="text-sm text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                  <div className="text-2xl font-bold">{userStats.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="text-lg font-bold capitalize">{userStats.favoriteSubject}</div>
                  <div className="text-sm text-muted-foreground">Favorite</div>
                </div>
                <div className="text-center p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg">
                  <div className="text-2xl font-bold">{userStats.totalXP}</div>
                  <div className="text-sm text-muted-foreground">Total XP</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="total">All Time</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {leaderboardData.length === 0 ? (
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Rankings Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Take some quizzes to appear on the leaderboard and start earning XP!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Top 3 Podium */}
                {leaderboardData.length >= 3 && (
                  <Card className="bg-gradient-card shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-500" />
                        Top Performers
                      </CardTitle>
                      <CardDescription>
                        {activeTab === 'total' && 'All-time champions'}
                        {activeTab === 'monthly' && 'This month\'s leaders'}
                        {activeTab === 'weekly' && 'This week\'s stars'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center items-end gap-4 mb-6">
                        {/* 2nd Place */}
                        {leaderboardData[1] && (
                          <div className="text-center">
                            <div className="w-20 h-16 bg-gradient-to-r from-gray-300 to-gray-500 rounded-t-lg flex items-center justify-center text-white font-bold mb-2">
                              2nd
                            </div>
                            <Avatar className="h-12 w-12 mx-auto mb-2">
                              <AvatarImage src={leaderboardData[1]?.avatar_url || ''} />
                              <AvatarFallback className="bg-gray-200">
                                {leaderboardData[1]?.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-semibold text-sm">
                              {leaderboardData[1]?.display_name || 'Anonymous'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getXPForTab(leaderboardData[1]).toLocaleString()} XP
                            </div>
                          </div>
                        )}

                        {/* 1st Place */}
                        {leaderboardData[0] && (
                          <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-t-lg flex items-center justify-center text-white font-bold mb-2">
                              1st
                            </div>
                            <Avatar className="h-16 w-16 mx-auto mb-2">
                              <AvatarImage src={leaderboardData[0]?.avatar_url || ''} />
                              <AvatarFallback className="bg-yellow-200">
                                {leaderboardData[0]?.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-semibold">
                              {leaderboardData[0]?.display_name || 'Anonymous'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getXPForTab(leaderboardData[0]).toLocaleString()} XP
                            </div>
                          </div>
                        )}

                        {/* 3rd Place */}
                        {leaderboardData[2] && (
                          <div className="text-center">
                            <div className="w-20 h-12 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg flex items-center justify-center text-white font-bold mb-2">
                              3rd
                            </div>
                            <Avatar className="h-12 w-12 mx-auto mb-2">
                              <AvatarImage src={leaderboardData[2]?.avatar_url || ''} />
                              <AvatarFallback className="bg-amber-200">
                                {leaderboardData[2]?.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-semibold text-sm">
                              {leaderboardData[2]?.display_name || 'Anonymous'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getXPForTab(leaderboardData[2]).toLocaleString()} XP
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Full Rankings */}
                <Card className="bg-gradient-card shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Rankings
                    </CardTitle>
                    <CardDescription>
                      {activeTab === 'total' && 'All-time leaderboard rankings based on total XP earned'}
                      {activeTab === 'monthly' && 'This month\'s top performers - resets monthly'}
                      {activeTab === 'weekly' && 'This week\'s achievements - resets weekly'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaderboardData.map((entry, index) => (
                        <div
                          key={entry.user_id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover-lift ${
                            entry.user_id === user?.id 
                              ? 'bg-primary/10 border-primary shadow-soft' 
                              : 'hover:bg-muted/50 border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getRankBadgeColor(entry.rank)}`}
                            >
                              {entry.rank}
                            </Badge>
                            {getRankIcon(entry.rank)}
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarImage src={entry.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10">
                              {entry.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="font-semibold flex items-center gap-2">
                              {entry.display_name || 'Anonymous'}
                              {entry.user_id === user?.id && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                              {entry.rank <= 3 && (
                                <Star className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            {entry.class && entry.section && (
                              <div className="text-sm text-muted-foreground">
                                Class {entry.class} - Section {entry.section}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-lg text-primary">
                              {getXPForTab(entry).toLocaleString()} XP
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {activeTab === 'total' && `Total: ${(entry.total_xp || 0).toLocaleString()}`}
                              {activeTab === 'monthly' && `Monthly: ${(entry.monthly_xp || 0).toLocaleString()}`}
                              {activeTab === 'weekly' && `Weekly: ${(entry.weekly_xp || 0).toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {leaderboardData.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No rankings available yet.</p>
                        <p className="text-sm">Complete some quizzes to see the leaderboard!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* How XP Works */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              How XP Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">10 XP</div>
                <div className="text-sm font-medium mb-1">Easy Questions</div>
                <div className="text-xs text-muted-foreground">Per correct answer</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-2">15 XP</div>
                <div className="text-sm font-medium mb-1">Medium Questions</div>
                <div className="text-xs text-muted-foreground">Per correct answer</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <div className="text-2xl font-bold text-red-600 mb-2">20 XP</div>
                <div className="text-sm font-medium mb-1">Hard Questions</div>
                <div className="text-xs text-muted-foreground">Per correct answer</div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Complete quizzes to earn XP and climb the leaderboard! Weekly and monthly rankings reset automatically.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}