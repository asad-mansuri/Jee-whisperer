import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('total');
  const { user } = useAuth();

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
        .select(`user_id,total_xp,weekly_xp,monthly_xp,rank,display_name,avatar_url,class,section`)
        .order('rank', { ascending: true })
        .limit(50);

      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data: quizResults, error } = await supabase
        .from('quiz_results')
        .select('score, topic, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (quizResults && quizResults.length > 0) {
        const totalQuizzes = quizResults.length;
        const averageScore = quizResults.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes;
        
        // Find most common subject
        const subjectCounts: Record<string, number> = {};
        quizResults.forEach(quiz => {
          subjectCounts[quiz.topic] = (subjectCounts[quiz.topic] || 0) + 1;
        });
        const favoriteSubject = Object.keys(subjectCounts).reduce((a, b) => 
          subjectCounts[a] > subjectCounts[b] ? a : b
        );

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
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
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
        return entry.weekly_xp;
      case 'monthly':
        return entry.monthly_xp;
      default:
        return entry.total_xp;
    }
  };

  const currentUserRank = leaderboardData.find((entry) => entry.user_id === user?.id)?.rank || null;

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{currentUserRank ?? '--'}</div>
                  <div className="text-sm text-muted-foreground">Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {leaderboardData.find(e => e.user_id === user.id)?.total_xp || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total XP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats.totalQuizzes}</div>
                  <div className="text-sm text-muted-foreground">Quizzes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats.averageScore}%</div>
                  <div className="text-sm text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
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
              <Card>
                <CardContent className="text-center py-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No data available yet. Take some quizzes to appear on the leaderboard!</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Top 3 Podium */}
                {leaderboardData.length >= 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center items-end gap-4 mb-6">
                        {/* 2nd Place */}
                        <div className="text-center">
                          <div className="w-20 h-16 bg-gradient-to-r from-gray-300 to-gray-500 rounded-t-lg flex items-center justify-center text-white font-bold mb-2">
                            2nd
                          </div>
                          <Avatar className="h-12 w-12 mx-auto mb-2">
                            <AvatarImage src={leaderboardData[1]?.avatar_url || ''} />
                            <AvatarFallback>
                              {leaderboardData[1]?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-semibold text-sm">
                            {leaderboardData[1]?.display_name || 'Anonymous'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getXPForTab(leaderboardData[1])} XP
                          </div>
                        </div>

                        {/* 1st Place */}
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-t-lg flex items-center justify-center text-white font-bold mb-2">
                            1st
                          </div>
                          <Avatar className="h-16 w-16 mx-auto mb-2">
                            <AvatarImage src={leaderboardData[0]?.avatar_url || ''} />
                            <AvatarFallback>
                              {leaderboardData[0]?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-semibold">
                            {leaderboardData[0]?.display_name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getXPForTab(leaderboardData[0])} XP
                          </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="text-center">
                          <div className="w-20 h-12 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-lg flex items-center justify-center text-white font-bold mb-2">
                            3rd
                          </div>
                          <Avatar className="h-12 w-12 mx-auto mb-2">
                            <AvatarImage src={leaderboardData[2]?.avatar_url || ''} />
                            <AvatarFallback>
                              {leaderboardData[2]?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-semibold text-sm">
                            {leaderboardData[2]?.display_name || 'Anonymous'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getXPForTab(leaderboardData[2])} XP
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Full Rankings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rankings</CardTitle>
                    <CardDescription>
                      {activeTab === 'total' && 'All-time leaderboard rankings'}
                      {activeTab === 'monthly' && 'This month\'s top performers'}
                      {activeTab === 'weekly' && 'This week\'s achievements'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaderboardData.map((entry, index) => (
                        <div
                          key={entry.user_id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                            entry.user_id === user?.id ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getRankBadgeColor(index + 1)}`}
                            >
                              {index + 1}
                            </Badge>
                            {getRankIcon(index + 1)}
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarImage src={entry.avatar_url || ''} />
                            <AvatarFallback>
                              {entry.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="font-semibold">
                              {entry.display_name || 'Anonymous'}
                              {entry.user_id === user?.id && (
                                <Badge variant="secondary" className="ml-2">You</Badge>
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
                              {activeTab === 'total' && `Total: ${entry.total_xp.toLocaleString()}`}
                              {activeTab === 'monthly' && `Monthly: ${entry.monthly_xp.toLocaleString()}`}
                              {activeTab === 'weekly' && `Weekly: ${entry.weekly_xp.toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}