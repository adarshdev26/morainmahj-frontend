import React from 'react';
import { Calendar, Trophy, Users, ChevronRight, MapPin, Clock, Star } from 'lucide-react';
import DemoBottomNav from '@/components/layout/DemoBottomNav';

const upcomingTournament = {
  name: 'Spring Invitational 2026',
  date: 'Sat, May 24',
  location: 'Westside Community Center',
  status: 'confirmed',
  round: null,
};

const activeLeagues = [
  { name: 'Tuesday Morning Mah Jongg', nextSession: 'Tue, May 26 · 10:00 AM', rsvp: 'Going' },
  { name: 'Thursday Evening League',   nextSession: 'Thu, May 29 · 6:30 PM',  rsvp: null },
];

export default function HomeDashboardDemo() {
  return (
    <div className="relative w-full min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-5">
        <p className="text-primary-foreground/60 text-sm font-body">Good morning,</p>
        <h1 className="font-heading text-3xl font-semibold">Phyllis T.</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-5">

        {/* Upcoming Tournament */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">Upcoming Tournament</h2>
            <span className="text-xs text-muted-foreground">View all</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Confirmed</span>
                </div>
                <h3 className="font-semibold text-foreground text-sm">{upcomingTournament.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                  <Calendar className="w-3 h-3" />
                  {upcomingTournament.date}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs">
                  <MapPin className="w-3 h-3" />
                  {upcomingTournament.location}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
            </div>
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <button className="flex-1 bg-primary text-primary-foreground text-xs font-medium py-2 rounded-lg">
                View Details
              </button>
              <button className="flex-1 border border-border text-foreground text-xs font-medium py-2 rounded-lg">
                My Scorecard
              </button>
            </div>
          </div>
        </section>

        {/* My Leagues */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">My Leagues</h2>
            <span className="text-xs text-muted-foreground">View all</span>
          </div>
          <div className="space-y-2">
            {activeLeagues.map((league) => (
              <div key={league.name} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Users className="w-3.5 h-3.5 text-primary/60" />
                    <h3 className="text-sm font-medium text-foreground">{league.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {league.nextSession}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {league.rsvp
                    ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{league.rsvp} ✓</span>
                    : <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">RSVP</span>
                  }
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Stats */}
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">My Stats</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tournaments', value: '12' },
              { label: 'Avg Score',   value: '+48' },
              { label: 'Best Finish', value: '2nd' },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
                <div className="font-heading text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <DemoBottomNav activeTab="Home" />
    </div>
  );
}