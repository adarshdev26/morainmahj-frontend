import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Grid3X3, ClipboardList, 
  Trophy, Menu, X, Calendar, UserCircle, ScrollText, Mail, LogOut, Ticket
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { label: 'My Scorecard', icon: ScrollText, path: '/app' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'My Tournaments', icon: Calendar, path: '/app/my-tournaments' },
  { label: 'My Leagues', icon: Users, path: '/app/leagues' },
  { label: 'Tables', icon: Grid3X3, path: '/app/tables' },
  { label: 'Invites', icon: Mail, path: '/app/invites' },
  { label: 'Registrations', icon: ClipboardList, path: '/app/registrations' },
  { label: 'Score Entry', icon: ScrollText, path: '/app/scores' },
  { label: 'Leaderboard', icon: Trophy, path: '/app/leaderboard' },
  { label: 'Raffle', icon: Ticket, path: '/app/tournament' },
  { label: 'My Profile', icon: UserCircle, path: '/app/profile' },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onToggle} />
      )}

      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-md"
        onClick={onToggle}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground z-40 transition-transform duration-300 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Logo size="sm" className="text-sidebar-foreground" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 font-body overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-amber-200"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/30">
              <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user.full_name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-destructive transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}