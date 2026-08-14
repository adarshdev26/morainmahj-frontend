import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribe } from '@/services/realtime';
import { handLogs as handLogsApi, leagueScoreCards as leagueScoreCardsApi } from '@/services/resources';
import { Trophy, Medal } from 'lucide-react';

const SEATS = ['east', 'south', 'west', 'north'];

export default function LeagueSessionLeaderboard({ session, league }) {
  const queryClient = useQueryClient();
  const scoringEnabled = league?.scoring_enabled;

  const { data: scoreCards = [], isLoading } = useQuery({
    queryKey: ['session-scorecards', session?.id],
    queryFn: () => leagueScoreCardsApi.filter({ session_id: session.id }),
    enabled: !!session?.id && scoringEnabled,
  });

  // Special-hand wins logged for this session — added to player point totals
  const { data: specialHandLogs = [] } = useQuery({
    queryKey: ['session-special-hand-logs', session?.id],
    queryFn: () => handLogsApi.filter({ session_id: session.id, hand_status: 'Won' }),
    enabled: !!session?.id && scoringEnabled,
  });

  useEffect(() => {
    if (!session?.id) return;
    const unsubscribe = subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['session-scorecards', session.id] });
    });
    return unsubscribe;
  }, [session?.id, queryClient]);

  if (!scoringEnabled) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Scoring isn't enabled for this league, so there's no session leaderboard.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tally = {};
  scoreCards.forEach((sc) => {
    SEATS.forEach((seat) => {
      const email = sc[`${seat}_player_email`];
      const name = sc[`${seat}_player_name`];
      const score = sc[`${seat}_score`];
      if (!email) return;
      if (!tally[email]) tally[email] = { name, email, points: 0, tables: 0 };
      if (score != null) {
        tally[email].points += score;
        tally[email].tables += 1;
      }
    });
  });

  // Add special-hand points (positive or negative) to each player's session total
  specialHandLogs.forEach((log) => {
    if (!log.special_hand_id) return;
    const email = log.player_email;
    if (!email) return;
    if (!tally[email]) tally[email] = { name: log.player_name || email, email, points: 0, tables: 0 };
    tally[email].points += Number(log.points || 0);
  });

  const ranked = Object.values(tally).sort((a, b) => b.points - a.points || b.tables - a.tables);

  if (ranked.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No scores entered yet for this session.</p>
      </div>
    );
  }

  const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1 mb-3">
        Session standings · {scoreCards.length} scorecard{scoreCards.length === 1 ? '' : 's'} · ranked by total points
      </p>
      {ranked.map((player, i) => (
        <div
          key={player.email}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${i === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-card border-border'}`}
        >
          <div className={`w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0 ${i < 3 ? medalColors[i] : 'text-muted-foreground'}`}>
            {i < 3 ? <Medal className="h-5 w-5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{player.name}</p>
            <p className="text-xs text-muted-foreground">{player.tables} table{player.tables === 1 ? '' : 's'} played</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-foreground">{player.points}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
      ))}
    </div>
  );
}