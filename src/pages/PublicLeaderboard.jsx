import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { useQuery } from '@tanstack/react-query';
import { computeTournamentRankings } from '@/lib/tournament-leaderboard';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, RefreshCw, ShieldCheck, ArrowLeft } from 'lucide-react';

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

export default function PublicLeaderboard() {
  const { tournamentId } = useParams();

  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['public-leaderboard', tournamentId],
    queryFn: async () => {
      return callAction('getPublicLeaderboard', {
        tournament_id: tournamentId,
      });
    },
    enabled: !!tournamentId,
    refetchInterval: 15000,
  });

  const tournament = data?.tournament;
  const scorecards = data?.scorecards ?? [];
  const nameMap = data?.nameMap ?? {};
  const numRounds = tournament?.num_rounds || 4;

  const { rankings, verifiedCount, totalCount } = useMemo(
    () => computeTournamentRankings(scorecards, nameMap),
    [scorecards, nameMap],
  );

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-6 md:p-10">
      {/* Back button */}
      <div className="w-full max-w-5xl mb-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </a>
      </div>

      {/* Header */}
      <div className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 md:h-10 md:w-10 text-amber-400" />
          {tournament?.name || 'Leaderboard'}
        </h1>
        {tournament?.status === 'active' && (
          <span className="inline-block mt-3 px-4 py-1 rounded-full bg-emerald-600/30 text-emerald-300 text-sm font-semibold tracking-wide uppercase">
            Live
          </span>
        )}
        {lastUpdated && (
          <p className="text-slate-400 text-sm mt-2 flex items-center justify-center gap-1">
            <RefreshCw className="h-3 w-3" /> Updated {lastUpdated} · auto-refreshes every 15s
          </p>
        )}
        {totalCount > 0 && (
          <p className="text-slate-400 text-sm mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> {verifiedCount}/{totalCount} tables verified
          </p>
        )}
      </div>

      {/* Table */}
      <div className="w-full max-w-5xl">
        {rankings.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Trophy className="h-12 w-12 text-slate-600 mb-3" />
              <p className="text-slate-400">No verified scores yet.</p>
              <p className="text-slate-500 text-sm mt-1">Scores appear here once East players verify them.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700/50 border-slate-700 hover:bg-slate-700/50">
                      <TableHead className="w-10 text-center pl-4 text-slate-300">#</TableHead>
                      <TableHead className="text-slate-300">Player</TableHead>
                      {Array.from({ length: numRounds }, (_, i) => (
                        <TableHead key={i} className="text-center w-16 text-slate-300">R{i + 1}</TableHead>
                      ))}
                      <TableHead className="text-center font-bold pr-4 text-slate-300">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.map((player, idx) => {
                      const rank = idx + 1;
                      return (
                        <TableRow
                          key={player.id}
                          className={`border-slate-700 ${rank <= 3 ? 'bg-amber-500/5' : ''}`}
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center justify-center">{rankIcon(rank)}</div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-100">{player.name}</TableCell>
                          {Array.from({ length: numRounds }, (_, i) => {
                            const s = player.roundScores[i + 1];
                            return (
                              <TableCell key={i} className={`text-center text-sm ${s !== undefined && s < 0 ? 'text-red-400' : s > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {fmt(s)}
                              </TableCell>
                            );
                          })}
                          <TableCell className={`text-center font-bold text-base pr-4 ${player.totalScore < 0 ? 'text-red-400' : player.totalScore > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
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
        )}
      </div>
    </div>
  );
}