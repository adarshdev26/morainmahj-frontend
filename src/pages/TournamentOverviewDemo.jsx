import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, ClipboardList, MapPin, Users, Gift, AlertCircle, ChevronRight } from 'lucide-react';

const TOURNAMENT = {
  name: 'Spring Invitational 2026',
  date: 'May 10, 2026',
  location: 'Chicago, IL',
  status: 'active',
  rounds: 4,
};

const WIND_COLORS = {
  East: 'bg-red-100 text-red-700 border-red-200',
  South: 'bg-blue-100 text-blue-700 border-blue-200',
  West: 'bg-green-100 text-green-700 border-green-200',
  North: 'bg-amber-100 text-amber-700 border-amber-200',
};

const WIND_TEXT = {
  East: 'text-red-700',
  South: 'text-blue-700',
  West: 'text-green-700',
  North: 'text-amber-700',
};

const ASSIGNMENTS = [
  { round: 1, table: 3, wind: 'East', others: ['David C.', 'Susan T.', 'Robert K.'] },
  { round: 2, table: 5, wind: 'South', others: ['Linda M.', 'James P.', 'Patricia K.'] },
  { round: 3, table: 2, wind: 'West', others: ['Michael R.', 'Carol V.', 'Thomas A.'] },
  { round: 4, table: 4, wind: 'North', others: ['Jennifer W.', 'Paul D.', 'Barbara S.'] },
];

export default function TournamentOverviewDemo() {
  const [showBorrowedSets, setShowBorrowedSets] = useState(true);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0f1b35' }}>
      {/* Demo banner */}
      <div className="sticky top-0 z-30 bg-[#d4547a] px-4 py-2.5 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-white shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Tournament Overview Demo</p>
          <p className="text-[11px] text-pink-100 truncate">View your tournament details and assignments</p>
        </div>
      </div>

      {/* Mobile header */}
      <div className="bg-[#1a2744] px-4 py-3 flex items-center justify-between">
        <span className="font-heading font-bold text-lg text-white">Morain Mahj</span>
        <div className="flex items-center gap-2">
          <a href="/demo/player" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <Home className="h-4 w-4 text-white" />
          </a>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 max-w-lg mx-auto text-white space-y-4">
        {/* Tournament header */}
        <div>
          <h1 className="text-2xl font-heading font-bold">{TOURNAMENT.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-blue-200/70 mt-1">
            <MapPin className="h-4 w-4" /> {TOURNAMENT.location}
          </div>
          <Badge className="mt-2 bg-[#d4547a] border-0 text-white">Active</Badge>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 border border-white/20 rounded-xl p-3">
            <p className="text-xs text-blue-200/60 mb-1">Registered</p>
            <p className="text-2xl font-bold font-heading">28</p>
            <p className="text-[10px] text-blue-200/50 mt-0.5">players</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-3">
            <p className="text-xs text-blue-200/60 mb-1">Rounds</p>
            <p className="text-2xl font-bold font-heading">{TOURNAMENT.rounds}</p>
            <p className="text-[10px] text-blue-200/50 mt-0.5">total</p>
          </div>
        </div>

        {/* Borrowed sets banner */}
        {showBorrowedSets && (
          <div className="bg-amber-400/15 border border-amber-400/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <Gift className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200">You volunteered to bring a borrowed set</p>
              <p className="text-xs text-amber-200/70 mt-0.5">It's assigned to Table 7 for the entire tournament</p>
            </div>
            <button onClick={() => setShowBorrowedSets(false)} className="text-amber-300 hover:text-amber-100">
              <span className="text-xs">✕</span>
            </button>
          </div>
        )}

        {/* Round assignments */}
        <div>
          <h2 className="text-lg font-heading font-bold mb-3">Your Assignments</h2>
          <div className="space-y-2">
            {ASSIGNMENTS.map((a) => (
              <div key={a.round} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#1a2744]">Round {a.round}</p>
                    <p className="text-xs text-slate-500">Table {a.table}</p>
                  </div>
                  <div className={`rounded-xl px-3 py-1.5 border font-semibold text-sm ${WIND_COLORS[a.wind]}`}>
                    {a.wind[0]}
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Seating with {a.others.join(', ')}
                </p>
                <a href="/demo/scorecard" className="mt-2 text-xs font-medium text-[#d4547a] hover:underline flex items-center gap-1">
                  View scorecard <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Help section */}
        <div className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm">
          <p className="font-semibold text-white mb-2">How table assignments work</p>
          <ul className="text-xs text-blue-200/70 space-y-1 list-disc ml-4">
            <li>You're assigned a different table and wind position each round</li>
            <li>East seat (marked red) has special verification responsibilities</li>
            <li>All scores must be verified by the East player before the round is final</li>
          </ul>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a2744] border-t border-[#2a3a5e] px-4 py-3 pb-safe">
        <a href="/demo/scorecard">
          <Button className="w-full h-12 gap-2 bg-[#d4547a] hover:bg-[#c04470] text-white">
            <ClipboardList className="h-5 w-5" />
            Enter Scores
          </Button>
        </a>
      </div>
    </div>
  );
}