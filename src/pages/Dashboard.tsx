import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Brain, 
  Trophy, 
  Zap, 
  TrendingUp, 
  Target,
  Calendar,
  Clock,
  ArrowRight,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalQuizzes: number;
  totalXP: number;
  currentStreak: number;
  weeklyProgress: number;
  recentActivities: Array<{
    type: string;
    title: string;
    date: string;
    score?: number;
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    totalXP: 0,
    currentStreak: 0,
    weeklyProgress: 0,
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch user's quiz results
        const { data: quizResults } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Fetch user's leaderboard data
        const { data: leaderboard } = await supabase
          .from('leaderboard')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Get user's current rank
        const { data: rankData } = await supabase
          .from('leaderboard_ranked_total')
          .select('rank')
          .eq('user_id', user.id)
          .single();
        // Fetch recent activities
        const { data: activities } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        // Calculate stats
        const totalQuizzes = quizResults?.length || 0;
        const totalXP = leaderboard?.total_xp || 0;
        const currentRank = rankData?.rank || null;
        
        // Calculate streak (simplified - consecutive days with activity)
        const currentStreak = activities?.length > 0 ? Math.min(activities.length, 7) : 0;
        
        // Calculate weekly progress (percentage of daily goals met)
        const weeklyProgress = Math.min((totalQuizzes * 20), 100);

        // Format recent activities
        const recentActivities = activities?.map(activity => {
          const metadata = activity.metadata as any;
          return {
            type: activity.activity_type,
            title: metadata?.title || `${activity.activity_type} activity`,
            date: new Date(activity.created_at).toLocaleDateString(),
            score: metadata?.score,
          };
        }) || [];

        setStats({
          totalQuizzes,
          totalXP,
          currentStreak,
          weeklyProgress,
          recentActivities,
          currentRank,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const quickActions = [
    {
      title: 'Smart Tutor',
      description: 'Ask questions and get instant help',
      icon: Brain,
      href: '/chat',
      color: 'bg-blue-500',
    },
    {
      title: 'Take Quiz',
      description: 'Test your knowledge',
      icon: BookOpen,
      href: '/quizzes',
      color: 'bg-green-500',
    },
    {
      title: 'Simulations',
      description: 'Interactive learning',
      icon: Zap,
      href: '/simulations',
      color: 'bg-purple-500',
    },
    {
      title: 'Watch Lectures',
      description: 'Video explanations',
      icon: Target,
      href: '/lectures',
      color: 'bg-orange-500',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back! 👋
        </h1>
        <p className="text-muted-foreground">
          Ready to continue your learning journey? Here's your progress overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card shadow-card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalXP}</div>
            <p className="text-xs text-muted-foreground">
              {stats.currentRank ? `Rank #${stats.currentRank}` : 'Unranked'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">
              Keep practicing to improve!
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <p className="text-xs text-muted-foreground">
              {stats.currentStreak > 0 ? 'Great momentum!' : 'Start your streak today!'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Goal</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyProgress}%</div>
            <Progress value={stats.weeklyProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="bg-gradient-card shadow-card hover-lift transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`${action.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest learning activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {activity.type}
                      </Badge>
                      <span className="font-medium">{activity.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {activity.score && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {activity.score}
                        </div>
                      )}
                      <span>{activity.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activities yet.</p>
                <p className="text-sm">Start learning to see your progress here!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Recommendations */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Today's Focus
            </CardTitle>
            <CardDescription>
              Recommended for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Physics: Motion</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Review equations of motion
                </p>
                <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/quizzes')}>
                  Start Quiz
                </Button>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100">Chemistry: Acids</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Properties of acids and bases
                </p>
                <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700" onClick={() => navigate('/lectures')}>
                  Watch Video
                </Button>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Biology: Life</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Life processes in living organisms
                </p>
                <Button size="sm" className="mt-2 bg-purple-600 hover:bg-purple-700" onClick={() => navigate('/chat')}>
                  Explore
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;