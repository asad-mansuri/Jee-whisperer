import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-hero">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-4 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground" />
              <h2 className="font-semibold text-lg text-foreground">
                Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student'}!
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="hover-lift">
                <Bell className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.user_metadata?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="hover-lift"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};