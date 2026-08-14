import { Card, CardContent } from '@/components/ui/card';
import { Users, Trophy, CheckCircle, MapPin } from 'lucide-react';

export default function InviteStatsPanel({ allPlayers, allRegistrations, allScoreCards, allTournaments, playerStats }) {
  const totalPlayers = allPlayers.length;
  const hasEverRegistered = new Set(allRegistrations.map(r => r.player_id)).size;
  const hasEverConfirmed = new Set(allRegistrations.filter(r => r.status === 'confirmed').map(r => r.player_id)).size;
  const hasEverPlayed = new Set(allScoreCards.flatMap(sc => [sc.player1_id, sc.player2_id, sc.player3_id, sc.player4_id]).filter(Boolean)).size;
  const activeTournaments = allTournaments.length;
  
  const getTopPlayers = () => {
    return Object.entries(playerStats)
      .sort((a, b) => (b[1].tournamentsPlayed || 0) - (a[1].tournamentsPlayed || 0))
      .slice(0, 3)
      .map(([pid, stats]) => {
        const player = allPlayers.find(p => p.id === pid);
        return { player, tournaments: stats.tournamentsPlayed };
      });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Players</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalPlayers}</p>
            </div>
            <Users className="h-8 w-8 text-primary/30" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Ever Registered</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{hasEverRegistered}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-amber-500/30" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Ever Confirmed</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{hasEverConfirmed}</p>
            </div>
            <Trophy className="h-8 w-8 text-emerald-500/30" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Tournaments</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{activeTournaments}</p>
            </div>
            <MapPin className="h-8 w-8 text-blue-500/30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}