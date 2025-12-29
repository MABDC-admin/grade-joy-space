import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const { user, loading } = useAuth();
  
  // Enable realtime notifications for students
  useRealtimeNotifications();

  // Listen for localStorage changes to sync collapsed state
  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    };
    
    // Custom event for same-tab updates
    const handleCollapse = () => {
      setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    };

    window.addEventListener('storage', handleStorage);
    
    // Check periodically for changes (since storage events don't fire in same tab)
    const interval = setInterval(handleCollapse, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const mainMargin = sidebarCollapsed ? 'md:ml-16' : 'md:ml-64';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className={`pb-20 ${mainMargin} md:pb-4 transition-all duration-200`}>
        <div className="container max-w-7xl py-6">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
