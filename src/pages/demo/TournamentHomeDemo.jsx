import React, { useState } from 'react';
import { MapPin, Calendar, Users, ChevronLeft, QrCode, Map, Trophy, ChevronRight } from 'lucide-react';
import DemoBottomNav from '@/components/layout/DemoBottomNav';

const tournament = {
  name: 'Spring Invitational 2026',
  date: 'Sat, May 24, 2026',
  location: 'Westside Community Center',
  players: 48,
  tables: 12,
};

const rounds = [
  { round: 1, table: 3, seat: 'East',  status: 'completed' },
  { round: 2, table: 7, seat: 'South', status: 'completed' },
  { round: 3, table: 3, seat: 'West',  status: 'active'    },
  { round: 4, table: 5, seat: 'North', status: 'upcoming'  },
];

const seatColors = { East: 'bg-red-100 text-red-700', South: 'bg-green-100 text-green-700', West: 'bg-blue-100 text-blue-700', North: 'bg-amber-100 text-amber-700' };

export default function TournamentHomeDemo() {
  const [tab, setTab] = useState('assignments');

  return (
    <div className="relative w-full min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <ChevronLeft className="w-5 h-5 text-primary-foreground/60" />
          <span className="text-primary-foreground/60 text-sm">My Tournaments</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold">{tournament.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-primary-foreground/70 text-xs">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{tournament.date}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tournament.location}</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-primary-foreground/70"><Users className="w-3 h-3" />{tournament.players} players</span>
          <span className="bg-green-400/20 text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">Round 3 Active</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-card border-b border-border">
        {[
          { icon: QrCode,  label: 'Check In'  },
          { icon: Map,     label: 'Room Map'  },
          { icon: Trophy,  label: 'Scores'    },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-muted transition-colors">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card px-4">
        {['assignments', 'leaderboard'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
            }`}
          >
            {t === 'assignments' ? 'My Assignments' : 'Standings'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {tab === 'assignments' && rounds.map((r) => (
          <div key={r.round}
            className={`bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between ${
              r.status === 'active' ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">Round {r.round}</span>
                {r.status === 'active' && <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Live</span>}
                {r.status === 'completed' && <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Done</span>}
              </div>
              <div className="text-sm font-medium text-foreground">Table {r.table}</div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${seatColors[r.seat]}`}>{r.seat}</span>
            </div>
            {r.status === 'active' && (
              <button className="bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg">
                Enter Scores
              </button>
            )}
            {r.status === 'completed' && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}

        {tab === 'leaderboard' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground flex gap-2">
              <span className="w-6">#</span>
              <span className="flex-1">Player</span>
              <span className="w-12 text-right">Total</span>
            </div>
            {[
              { rank: 1, name: 'Sandra K.', total: '+248' },
              { rank: 2, name: 'Ruth M.',   total: '+196' },
              { rank: 3, name: 'Gloria N.', total: '+184' },
              { rank: 4, name: 'Barbara W.', total: '+142' },
              { rank: 5, name: 'Phyllis T.', total: '+80', you: true },
            ].map((p) => (
              <div key={p.rank} className={`px-4 py-3 flex items-center gap-2 text-sm border-b border-border last:border-0 ${p.you ? 'bg-primary/5 font-bold' : ''}`}>
                <span className="w-6 text-muted-foreground text-xs">{p.rank}</span>
                <span className="flex-1 text-foreground">{p.name}{p.you && ' (you)'}</span>
                <span className="w-12 text-right text-green-600 font-semibold">{p.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DemoBottomNav activeTab="Tournaments" />
    </div>
  );
}