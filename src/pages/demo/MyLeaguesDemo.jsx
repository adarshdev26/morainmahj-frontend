import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, Users, ChevronRight, ChevronLeft, Trophy } from 'lucide-react';
import DemoBottomNav from '@/components/layout/DemoBottomNav';

const MOCK_LEAGUES = [
  {
    id: '1',
    name: 'Tuesday Morning Mahj',
    location: 'Westside Community Center',
    day_of_week: 2,
    start_time: '10:00 AM',
    nextSession: '2026-05-26',
    rsvpStatus: 'yes',
    memberCount: 24,
    isRegular: true,
  },
  {
    id: '2',
    name: 'Thursday Evening League',
    location: 'Riverview Club',
    day_of_week: 4,
    start_time: '6:30 PM',
    nextSession: '2026-05-29',
    rsvpStatus: null,
    memberCount: 18,
    isRegular: false,
  },
  {
    id: '3',
    name: 'Weekend Warriors',
    location: 'Sunrise Recreation Center',
    day_of_week: 6,
    start_time: '1:00 PM',
    nextSession: '2026-05-24',
    rsvpStatus: 'no',
    memberCount: 32,
    isRegular: false,
  },
];

const MOCK_SESSIONS = [
  { id: 's1', date: '2026-05-26', start_time: '10:00 AM', end_time: '1:00 PM', attendees: ['Sandra K.', 'Ruth M.', 'Phyllis T.', 'Barbara W.', 'Gloria N.', 'Doris L.', 'Helen R.', 'Alice P.'] },
  { id: 's2', date: '2026-06-02', start_time: '10:00 AM', end_time: '1:00 PM', attendees: [] },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statusBadge(status) {
  if (status === 'yes') return { label: 'Going ✓', cls: 'bg-green-100 text-green-700' };
  if (status === 'no') return { label: "Can't go", cls: 'bg-red-100 text-red-600' };
  if (status === 'waitlist') return { label: 'Waitlisted', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'No response', cls: 'bg-slate-100 text-slate-500' };
}

function LeagueListView({ onSelect }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-4 pt-12 pb-4">
        <h1 className="font-heading font-bold text-xl">My Leagues</h1>
        <p className="text-primary-foreground/60 text-xs mt-0.5">Your league memberships</p>
      </div>
      <div className="flex-1 px-4 pb-32 pt-4 space-y-3 overflow-y-auto">
        {MOCK_LEAGUES.map(league => {
          const badge = statusBadge(league.rsvpStatus);
          return (
            <Card key={league.id} className="cursor-pointer active:scale-[0.99] transition-transform" onClick={() => onSelect(league)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-base">{league.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />{league.location}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        Every {DAY_NAMES[league.day_of_week]}s · {league.start_time}
                      </span>
                      {league.isRegular && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Regular</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Next session</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(league.nextSession + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <Badge className={badge.cls}>{badge.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LeagueDetailView({ league, onBack }) {
  const [rsvp, setRsvp] = useState({ s1: 'yes', s2: null });
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-xl truncate">{league.name}</h1>
            <p className="text-primary-foreground/60 text-xs truncate">{league.location}</p>
          </div>
        </div>
        <div className="flex gap-1 bg-primary-foreground/10 rounded-xl p-1">
          {['sessions', 'leaderboard', 'members'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${activeTab === tab ? 'bg-primary-foreground text-primary shadow-sm' : 'text-primary-foreground/70'}`}>
              {tab === 'leaderboard' ? <span className="flex items-center justify-center gap-1"><Trophy className="h-3 w-3" />Board</span> : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 pt-4 space-y-4 overflow-y-auto">
        {activeTab === 'sessions' && MOCK_SESSIONS.map(session => {
          const myRsvp = rsvp[session.id];
          const badge = statusBadge(myRsvp);
          const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          return (
            <Card key={session.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{dateStr}</p>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{session.start_time}–{session.end_time}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{league.location}</span>
                    </div>
                  </div>
                  <Badge className={badge.cls}>{badge.label}</Badge>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRsvp(r => ({ ...r, [session.id]: 'yes' }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${myRsvp === 'yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'}`}>
                    <CheckCircle2 className="h-4 w-4" /> Going
                  </button>
                  <button onClick={() => setRsvp(r => ({ ...r, [session.id]: 'no' }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${myRsvp === 'no' ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500'}`}>
                    <XCircle className="h-4 w-4" /> Can't go
                  </button>
                </div>
                {session.attendees.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Who's going ({session.attendees.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {session.attendees.map(name => (
                        <span key={name} className="bg-muted rounded-full px-2.5 py-1 text-xs text-foreground">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {activeTab === 'leaderboard' && (
          <div className="space-y-2">
            {[
              { name: 'Sandra K.', total: 248, rounds: [+82, +64, +56, +46] },
              { name: 'Ruth M.', total: 196, rounds: [+48, +72, +38, +38] },
              { name: 'Gloria N.', total: 184, rounds: [+56, +44, +52, +32] },
              { name: 'Barbara W.', total: 142, rounds: [+36, +32, +44, +30] },
              { name: 'Phyllis T.', total: -24, rounds: [-8, -12, -4, 0] },
            ].map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${i === 0 ? 'border-amber-300 bg-amber-50/30' : 'border-border bg-card'}`}>
                <span className="text-sm font-bold w-6 text-center text-muted-foreground">{i + 1}</span>
                <p className="flex-1 font-medium text-sm">{p.name}</p>
                <span className={`font-bold text-base ${p.total > 0 ? 'text-primary' : 'text-destructive'}`}>{p.total > 0 ? '+' : ''}{p.total}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-2">
            {['Sandra K.', 'Ruth M.', 'Gloria N.', 'Barbara W.', 'Phyllis T.', 'Doris L.', 'Helen R.', 'Alice P.', 'Margaret S.', 'Frances J.'].map((name, i) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{name.charAt(0)}</span>
                </div>
                <p className="font-medium text-sm text-foreground flex-1">{name}</p>
                {i < 3 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Regular</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyLeaguesDemo() {
  const [selectedLeague, setSelectedLeague] = useState(null);

  return (
    <div className="relative w-full min-h-screen">
      {selectedLeague
        ? <LeagueDetailView league={selectedLeague} onBack={() => setSelectedLeague(null)} />
        : <LeagueListView onSelect={setSelectedLeague} />
      }
      <DemoBottomNav activeTab="Leagues" />
    </div>
  );
}