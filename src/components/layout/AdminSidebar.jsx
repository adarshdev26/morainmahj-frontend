import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { filterNavGroupsForPlan } from '@/lib/adminNav';
import SidebarCancelSubscription from '@/components/admin/SidebarCancelSubscription';

export default function AdminSidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { subscription } = useSubscription(user);
  const isSuperAdmin = user?.role === 'admin';
  const visibleGroups = filterNavGroupsForPlan(subscription?.plan, isSuperAdmin);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}

      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-md border"
        onClick={onToggle}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 z-40 transition-transform duration-300 flex flex-col",
        "bg-sidebar text-sidebar-foreground",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/app">
            <Logo size="sm" className="text-sidebar-foreground" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4 font-body">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1.5 font-semibold">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => window.innerWidth < 1024 && onToggle()}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-sidebar-accent text-amber-200"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link to="/app" className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            Back to App
          </Link>
          <SidebarCancelSubscription user={user} subscription={subscription} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="w-full justify-start text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground gap-2 h-8"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}