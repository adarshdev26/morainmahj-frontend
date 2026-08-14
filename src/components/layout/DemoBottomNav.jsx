import React from 'react';
import { Home, BarChart2, Calendar, Search, Users, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Home',        icon: Home,      active: false },
  { label: 'Stats',       icon: BarChart2,  active: false },
  { label: 'Tournaments', icon: Calendar,   active: false },
  { label: 'Discover',    icon: Search,     active: false },
  { label: 'Leagues',     icon: Users,      active: false },
  { label: 'Classes',     icon: BookOpen,   active: false },
];

export default function DemoBottomNav({ activeTab = '' }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((tab) => {
        const isActive = tab.label === activeTab;
        return (
          <div
            key={tab.label}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] font-medium relative select-none",
              isActive ? "text-amber-300" : "text-sidebar-foreground/40"
            )}
          >
            <span className={cn(
              "absolute top-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300",
              isActive ? "w-5 bg-amber-300" : "w-0 bg-transparent"
            )} />
            <tab.icon className={cn("h-5 w-5", isActive && "scale-110")} />
            {tab.label}
          </div>
        );
      })}
    </nav>
  );
}