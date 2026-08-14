import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Trophy, Users, Calendar, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';

const screenshotGuide = [
  {
    id: 1,
    title: 'Home Dashboard',
    description: 'Main screen with tournament cards, bottom navigation, welcome message',
    path: '/app',
    icon: Smartphone,
    category: 'Core Experience',
    tip: 'Show your personalized tournament feed'
  },
  {
    id: 2,
    title: 'Live Scorecard',
    description: 'East player verification with special hands, seat tracking, set entry',
    path: '/app/scorecard',
    icon: Trophy,
    category: 'Score Tracking',
    tip: 'During an active tournament round'
  },
  {
    id: 3,
    title: 'Tournament Dashboard',
    description: 'Your table assignment, round scores, live standings, check-in status',
    path: '/app/tournament',
    icon: Users,
    category: 'Tournament View',
    tip: 'Shows real-time tournament data'
  },
  {
    id: 4,
    title: 'Leaderboard',
    description: 'Tournament standings, rankings, prize breakdown',
    path: '/app/leaderboard',
    icon: BarChart3,
    category: 'Competition',
    tip: 'After scores are entered'
  },
  {
    id: 5,
    title: 'My Tournaments',
    description: 'All your registrations: confirmed, upcoming, past events',
    path: '/app/my-tournaments',
    icon: Calendar,
    category: 'Core Experience',
    tip: 'Shows complete tournament history'
  },
  {
    id: 6,
    title: 'Player Profile',
    description: 'Your stats, achievements, tournament history',
    path: '/app/profile',
    icon: Users,
    category: 'Player Profile',
    tip: 'Personal statistics and settings'
  }
];

export default function Screenshots() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', ...new Set(screenshotGuide.map(s => s.category))];
  const filteredGuide = selectedCategory === 'All' 
    ? screenshotGuide 
    : screenshotGuide.filter(s => s.category === selectedCategory);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pb-4 shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="font-heading font-bold text-xl leading-tight">App Screenshots Guide</h1>
            <p className="text-primary-foreground/60 text-xs mt-0.5">Capture these screens for Apple Store</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-muted/50 px-4 py-3 border-b border-border">
        <p className="text-sm text-foreground">
          <strong>Step 1:</strong> Log in to your app<br/>
          <strong>Step 2:</strong> Navigate to each screen below<br/>
          <strong>Step 3:</strong> Use your device screenshot (Cmd+Shift+4 on Mac, or mobile buttons)
        </p>
      </div>

      {/* Category Filter */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <Badge
              key={cat}
              className={`cursor-pointer whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Screenshot Checklist */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {filteredGuide.map((screen) => {
          const Icon = screen.icon;
          return (
            <Card key={screen.id} className="active:scale-[0.98] transition-transform">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{screen.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{screen.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{screen.category}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {screen.tip}
                      </span>
                    </div>
                    <a
                      href={screen.path}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = screen.path;
                      }}
                    >
                      Open this screen <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          For best results: use iPhone 15 Pro frame (393x852px), capture during active tournament
        </p>
      </div>
    </div>
  );
}