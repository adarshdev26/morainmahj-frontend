import { useQuery } from '@tanstack/react-query';
import { registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, CalendarDays, MapPin } from 'lucide-react';
import { format } from 'date-fns';

function PlaceBadge({ place }) {
  if (place === 1) return <span className="flex items-center gap-1 text-amber-500 font-bold text-sm"><Trophy className="h-4 w-4" />1st</span>;
  if (place === 2) return <span className="flex items-center gap-1 text-slate-400 font-bold text-sm"><Medal className="h-4 w-4" />2nd</span>;
  if (place === 3) return <span className="flex items-center gap-1 text-amber-700 font-bold text-sm"><Award className="h-4 w-4" />3rd</span>;
  if (place) return <span className="text-sm font-semibold text-slate-600">{place}th</span>;
  return <span className="text-xs text-slate-400">—</span>;
}

/**
 * Shows a player's tournament history automatically derived from their registrations & scorecards.
 * playerId: the User id of the player
 */
export default function PlayerTournamentHistory({ playerId }) {
  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ['player-regs', playerId],
    queryFn: () => registrationsApi.filter({ player_id: playerId }),
    enabled: !!playerId,
  });

  const confirmedRegs = registrations.filter(r => ['confirmed', 'pending'].includes(r.status));
  const tournamentIds = [...new Set(confirmedRegs.map(r => r.tournament_id))];

  const { data: allTournaments = [], isLoading: loadingT } = useQuery({
    queryKey: ['all-tournaments-for-player'],
    queryFn: () => tournamentsApi.list(),
    enabled: tournamentIds.length > 0,
  });

  const { data: allScoreCards = [], isLoading: loadingSC } = useQuery({
    queryKey: ['player-scorecards', playerId],
    queryFn: async () => {
      // Fetch scorecards for each position
      const results = await Promise.all([
        scoreCardsApi.filter({ player1_id: playerId }),
        scoreCardsApi.filter({ player2_id: playerId }),
        scoreCardsApi.filter({ player3_id: playerId }),
        scoreCardsApi.filter({ player4_id: playerId }),
      ]);
      const seen = new Set();
      return results.flat().filter(sc => {
        if (seen.has(sc.id)) return false;
        seen.add(sc.id);
        return true;
      });
    },
    enabled: !!playerId,
  });

  const isLoading = loadingRegs || loadingT || loadingSC;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-400 text-sm">Loading history...</CardContent>
      </Card>
    );
  }

  if (confirmedRegs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament History</CardTitle>
          <CardDescription>Tournaments played and finishing positions</CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-center text-slate-400 text-sm">
          No tournament history yet.
        </CardContent>
      </Card>
    );
  }

  // Build per-tournament stats
  const tournamentStats = tournamentIds.map(tid => {
    const tournament = allTournaments.find(t => t.id === tid);
    if (!tournament) return null;

    const reg = confirmedRegs.find(r => r.tournament_id === tid);
    const mySCs = allScoreCards.filter(sc => sc.tournament_id === tid && sc.status === 'verified');

    // Compute my total score
    const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
    const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
    let myTotal = 0;
    mySCs.forEach(sc => {
      const idx = playerIdKeys.findIndex(k => sc[k] === playerId);
      if (idx >= 0 && sc[scoreKeys[idx]]) {
        myTotal += sc[scoreKeys[idx]].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      }
    });

    // To compute place, we'd need all players' scores — stored as summary on registration
    // Place is computed from the leaderboard rankings (all verified scorecards for this tournament)
    // We'll store place as undefined if tournament isn't completed
    const isCompleted = tournament.status === 'completed';

    return {
      tournament,
      reg,
      myTotal: mySCs.length > 0 ? myTotal : null,
      roundsPlayed: mySCs.length,
      isCompleted,
    };
  }).filter(Boolean).sort((a, b) => new Date(b.tournament.date) - new Date(a.tournament.date));

  const statusColors = {
    confirmed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    waitlisted: 'bg-blue-100 text-blue-700',
    declined: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament History</CardTitle>
        <CardDescription>{tournamentStats.length} tournament{tournamentStats.length !== 1 ? 's' : ''} played</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {tournamentStats.map(({ tournament, reg, myTotal, roundsPlayed, isCompleted }) => (
          <div key={tournament.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{tournament.name}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                  {tournament.date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(tournament.date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {tournament.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tournament.location}
                    </span>
                  )}
                </div>
              </div>
              <Badge className={`text-xs shrink-0 border-0 ${statusColors[reg?.status] || 'bg-slate-100 text-slate-500'}`}>
                {reg?.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 pt-1 border-t border-dashed">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Rounds</p>
                <p className="font-semibold text-slate-700">{roundsPlayed > 0 ? roundsPlayed : '—'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Score</p>
                <p className={`font-semibold ${myTotal !== null ? (myTotal < 0 ? 'text-destructive' : 'text-slate-700') : 'text-slate-400'}`}>
                  {myTotal !== null ? myTotal : '—'}
                </p>
              </div>
              {reg?.flight && (
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Flight</p>
                  <Badge variant="outline" className="text-xs">{reg.flight}</Badge>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}