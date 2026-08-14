import React, { useState, useMemo } from 'react';
import { leagueScoreCards as leagueScoreCardsApi, leagueSessions as leagueSessionsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const SEATS = ['east', 'south', 'west', 'north'];

export default function LeagueLeaderboard({ league }) {
  const [expandedSession, setExpandedSession] = useState(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['league-sessions', league.id],
    queryFn: () => leagueSessionsApi.filter({ league_id: league.id }),
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['league-all-scorecards', league.id],
    queryFn: () => leagueScoreCardsApi.filter({ league_id: league.id }),
    enabled: !!league.scoring_enabled,
  });

  const { overallRanked, sessionTallies } = useMemo(() => {
    const sTallies = {};
    const overall = {};

    scorecards.forEach((sc) => {
      const sid = sc.session_id;
      if (!sTallies[sid]) sTallies[sid] = {};

      SEATS.forEach((seat) => {
        const email = sc[`${seat}_player_email`];
        const name = sc[`${seat}_player_name`];
        const score = sc[`${seat}_score`];
        if (!email) return;

        if (!overall[email]) overall[email] = { name, email, points: 0, sessions: new Set() };
        if (score != null) {
          overall[email].points += score;
          overall[email].sessions.add(sid);
        }

        if (!sTallies[sid][email]) sTallies[sid][email] = { name, email, points: 0, tables: 0 };
        if (score != null) {
          sTallies[sid][email].points += score;
          sTallies[sid][email].tables += 1;
        }
      });
    });

    const ranked = Object.values(overall)
      .map(p => ({ ...p, sessions: p.sessions.size }))
      .sort((a, b) => b.points - a.points || b.sessions - a.sessions);

    return { overallRanked: ranked, sessionTallies: sTallies };
  }, [scorecards]);

  if (!league.scoring_enabled) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Scoring isn't enabled for this league.</p>
        <p className="text-xs mt-1">Enable scoring in league settings to see the leaderboard.</p>
      </div>
    );
  }

  if (overallRanked.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No scores recorded yet.</p>
        <p className="text-xs mt-1">Scores will appear here after sessions are played.</p>
      </div>
    );
  }

  const completedSessions = sessions
    .filter(s => s.status === 'completed' || s.assignments_generated)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];

  return (
    <div className="space-y-6">
      {/* Overall Leaderboard */}
      <div>
        <h3 className="text-lg font-heading font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" /> Overall Standings
        </h3>
        <div className="space-y-2">
          {overallRanked.map((player, i) => (
            <div
              key={player.email}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${i === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-border'}`}
            >
              <div className={`w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0 ${i < 3 ? medalColors[i] : 'text-muted-foreground'}`}>
                {i < 3 ? <Medal className="h-5 w-5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{player.name}</p>
                <p className="text-xs text-slate-400">{player.sessions} session{player.sessions === 1 ? '' : 's'} played</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-800">{player.points}</p>
                <p className="text-xs text-slate-400">points</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Session Breakdown */}
      {completedSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-heading font-bold text-slate-800 mb-3">Session Breakdown</h3>
          <div className="space-y-2">
            {completedSessions.map(session => {
              const tallies = sessionTallies[session.id] || {};
              const ranked = Object.values(tallies).sort((a, b) => b.points - a.points);
              const isExpanded = expandedSession === session.id;
              const hasScores = ranked.length > 0;

              return (
                <div key={session.id} className="bg-white border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className="font-semibold text-sm text-slate-800 flex-1 text-left">
                      {format(new Date(session.date + 'T12:00:00'), 'MMM d, yyyy')}
                    </span>
                    <Badge variant="outline" className="text-xs">{session.status}</Badge>
                    {hasScores && <span className="text-xs text-slate-400">{ranked.length} players</span>}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 space-y-1">
                      {hasScores ? ranked.map((player, i) => (
                        <div key={player.email} className="flex items-center gap-3 py-1.5">
                          <span className={`w-5 h-5 flex items-center justify-center text-xs font-bold ${i < 3 ? medalColors[i] : 'text-slate-400'}`}>
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-700 flex-1 truncate">{player.name}</span>
                          <span className="text-sm font-semibold text-slate-800">{player.points}</span>
                          <span className="text-xs text-slate-400">{player.tables} table{player.tables === 1 ? '' : 's'}</span>
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 py-2">No scores recorded for this session.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}