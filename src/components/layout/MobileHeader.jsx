import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Menu, LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

// Screens that are "child" screens and should show a back button
const childScreens = [
  '/app/scores',
  '/app/tables',
  '/app/players',
  '/app/player-profile',
];

export default function MobileHeader({ onMenuToggle, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isChild = childScreens.some(p => location.pathname.startsWith(p));

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground flex items-center h-14"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="flex items-center w-full px-3">
        {isChild ? (
          <button
            onClick={() => navigate(-1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <button
            onClick={onMenuToggle}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 flex justify-center">
          {title ? (
            <span className="font-heading text-base font-semibold">{title}</span>
          ) : (
            <Logo size="xs" className="text-sidebar-foreground" />
          )}
        </div>
        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}