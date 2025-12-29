import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Megaphone, 
  Settings,
  Shield,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useUnreadContent } from '@/hooks/useUnreadContent';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/classwork', icon: BookOpen, label: 'Classwork', badgeKey: 'classwork' as const },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements', badgeKey: 'announcements' as const },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { isAdmin, isStudent } = useAuth();
  const { unreadCounts } = useUnreadContent();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const getBadgeCount = (key?: 'classwork' | 'announcements') => {
    if (!key || !isStudent) return 0;
    return unreadCounts[key] || 0;
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  const NavItemContent = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean }) => {
    const badgeCount = getBadgeCount(item.badgeKey);
    
    return (
      <>
        <div className="relative">
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-medium">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </div>
        {!collapsed && <span className="ml-3">{item.label}</span>}
      </>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] border-r bg-sidebar transition-all duration-200',
          sidebarWidth,
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          <div className="flex justify-end p-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              
              if (collapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={cn(
                          'flex items-center justify-center rounded-full p-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <NavItemContent item={item} isActive={isActive} />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    'flex items-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <NavItemContent item={item} isActive={isActive} />
                </NavLink>
              );
            })}

            {isAdmin && (
              collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/admin"
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-center rounded-full p-2.5 text-sm font-medium transition-colors',
                        location.pathname === '/admin'
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Shield className="h-5 w-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    Admin
                  </TooltipContent>
                </Tooltip>
              ) : (
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={cn(
                    'flex items-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
                    location.pathname === '/admin'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Shield className="h-5 w-5" />
                  <span className="ml-3">Admin</span>
                </NavLink>
              )
            )}
          </nav>

          {/* Collapse toggle - desktop only */}
          <div className="hidden md:flex border-t p-2 justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
