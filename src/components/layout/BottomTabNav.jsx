import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Users, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Home', icon: Home, path: '/app' },
  { label: 'Tournaments', icon: Calendar, path: '/app/my-tournaments' },
  { label: 'Leagues', icon: Users, path: '/app/leagues' },
  { label: 'Classes', icon: BookOpen, path: '/app/courses' },
];

// Mirrors AppLayout's tab ownership logic
function getOwnerTab(pathname, tabPaths) {
  return tabPaths.slice().sort((a, b) => b.length - a.length)
    .find(tab => pathname === tab || pathname.startsWith(tab + '/')) ?? null;
}

export default function BottomTabNav({ onDiscover }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabPaths = tabs.map(t => t.path);
  const activeTab = getOwnerTab(location.pathname, tabPaths);

  const handleTabPress = (tab) => {
    if (activeTab === tab.path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-sidebar border-t border-sidebar-border flex"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      {/* Home + Tournaments (first 2 tabs) */}
      {tabs.slice(0, 2).map((tab) => {
        const isActive = activeTab === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] font-medium transition-all select-none relative active:scale-95",
              isActive
                ? "text-amber-300"
                : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300",
                isActive ? "w-5 bg-amber-300" : "w-0 bg-transparent"
              )}
            />
            <tab.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
            {tab.label}
          </button>
        );
      })}

      {/* Discover (center raised FAB) */}
      <button
        onClick={onDiscover}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] select-none active:scale-95"
      >
        <div className="flex flex-col items-center justify-center gap-1 bg-amber-400 rounded-xl px-3 py-1.5 shadow-md">
          <Search className="w-5 h-5 text-amber-900" />
          <span className="text-[10px] font-bold text-amber-900">Discover</span>
        </div>
      </button>

      {/* Leagues + Classes (last 2 tabs) */}
      {tabs.slice(2).map((tab) => {
        const isActive = activeTab === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] font-medium transition-all select-none relative active:scale-95",
              isActive
                ? "text-amber-300"
                : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300",
                isActive ? "w-5 bg-amber-300" : "w-0 bg-transparent"
              )}
            />
            <tab.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}