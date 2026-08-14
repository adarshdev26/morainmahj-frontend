import React, { useMemo, useState } from 'react';
import { scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { useAuth } from '@/lib/AuthContext';
import { useTournamentPlayers } from '@/lib/useTournamentPlayers';
import { computeTournamentRankings } from '@/lib/tournament-leaderboard';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import { Trophy, Medal, Award, RefreshCw, ShieldCheck, Download, ChevronLeft } from 'lucide-react';
import ExportButton from '@/components/shared/ExportButton';
import { useNavigate } from 'react-router-dom';

const fmt = (score) => {
  if (score === undefined || score === null) return '—';
  return score > 0 ? `+${score}` : String(score);
};

function rankIcon(rank) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-mono w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedTournament, setSelectedTournament] = useState('');
  const urlParams = new URLSearchParams(window.location.search);
  const fromTournamentId = urlParams.get('tournamentId');
  const fromTournament = urlParams.get('from') === 'tournament';

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const activeTournament = tournaments.find(t => t.status === 'active');
  const tournamentId =
    selectedTournament ||
    (fromTournament && fromTournamentId ? fromTournamentId : '') ||
    activeTournament?.id ||
    tournaments[0]?.id;
  const tournament = tournaments.find(t => t.id === tournamentId);

  const { nameMap } = useTournamentPlayers(tournamentId, { enabled: !!tournamentId && !!user });

  const { data: scorecards = [], dataUpdatedAt } = useQuery({
    queryKey: ['leaderboard-scorecards', tournamentId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 15000,
  });

  const numRounds = tournament?.num_rounds || 4;

  const { rankings, verifiedCount, totalCount } = useMemo(
    () => computeTournamentRankings(scorecards, nameMap),
    [scorecards, nameMap],
  );

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leaderboard-scorecards', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['tournament-players', tournamentId] }),
    ]);
  };

  const isNative = isCapacitorNative();

  const headerBlock = (
    <>
      <div>
        <button
          onClick={() => fromTournament && fromTournamentId ? navigate(`/app/tournament-home/${fromTournamentId}`) : navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tournament
        </button>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-400" /> Leaderboard
        </h1>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Updated {lastUpdated} · auto-refreshes every 15s
          </p>
        )}
      </div>
      {tournament && (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            {verifiedCount}/{totalCount} tables verified
          </Badge>
          <Badge variant="outline">{rankings.length} players ranked</Badge>
          {tournament.status === 'active' && (
            <Badge className="bg-primary/15 text-primary">Live</Badge>
          )}
        </div>
      )}
    </>
  );

  const tableBlock = rankings.length === 0 ? (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground/20 mb-3" />
        <p className="text-muted-foreground">No verified scores yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Scores appear here once East players verify them.</p>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10 text-center pl-4">#</TableHead>
                <TableHead>Player</TableHead>
                {Array.from({ length: numRounds }, (_, i) => (
                  <TableHead key={i} className="text-center w-16">R{i + 1}</TableHead>
                ))}
                <TableHead className="text-center font-bold pr-4">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((player, idx) => {
                const isMe = player.id === user?.id;
                const rank = idx + 1;
                return (
                  <TableRow
                    key={player.id}
                    className={`transition-colors ${isMe ? 'bg-primary/10 border-l-2 border-primary' : rank <= 3 ? 'bg-amber-50/10' : ''}`}
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center justify-center">{rankIcon(rank)}</div>
                    </TableCell>
                    <TableCell className={isMe ? 'font-bold' : 'font-medium'}>
                      {player.name}
                      {isMe && <span className="text-primary ml-1.5 text-xs font-normal">(you)</span>}
                    </TableCell>
                    {Array.from({ length: numRounds }, (_, i) => {
                      const s = player.roundScores[i + 1];
                      return (
                        <TableCell key={i} className={`text-center text-sm ${s !== undefined && s < 0 ? 'text-destructive' : s > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {fmt(s)}
                        </TableCell>
                      );
                    })}
                    <TableCell className={`text-center font-bold text-base pr-4 ${player.totalScore < 0 ? 'text-destructive' : player.totalScore > 0 ? 'text-primary' : ''}`}>
                      {fmt(player.totalScore)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (isNative) {
    return (
      <div className="h-full flex flex-col native-app-shell">
        <div className="native-app-header shrink-0 px-4 pt-4 pb-3 bg-background border-b border-border">
          {headerBlock}
        </div>
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 min-h-0">
          <div className="px-4 py-4 native-bottom-scroll-pad">
            {tableBlock}
          </div>
        </PullToRefresh>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        {headerBlock}
      </div>
      {tableBlock}
    </div>
    </PullToRefresh>
  );
}