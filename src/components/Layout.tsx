import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
interface LayoutProps {
  children: ReactNode;
}
export const Layout = ({
  children
}: LayoutProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load avatar from profiles table (profile.avatar_url) if available
  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (mounted) setAvatarUrl(data?.avatar_url || null);
      } catch (err) {
        // ignore - we'll fall back to user metadata
        console.debug('Could not load profile avatar:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  return <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-gradient-hero">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-4 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              {/* Burger menu only visible on mobile */}
              <SidebarTrigger className="md:hidden hover:bg-accent hover:text-accent-foreground" />
              <h2 className="font-semibold text-sm md:text-lg text-foreground truncate">
                Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student'}!
              </h2>
            </div>

            <div className="flex items-center gap-3">
              
              
              <div className="flex items-center gap-2">
                <Link to="/profile" aria-label="Profile">
                  <Avatar className="h-8 w-8 hover:opacity-90 transition-opacity">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.user_metadata?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>

              <Button variant="ghost" size="sm" onClick={signOut} className="hover-lift">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>;
};