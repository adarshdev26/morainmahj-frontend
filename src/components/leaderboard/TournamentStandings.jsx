import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award } from 'lucide-react';
import { computeTournamentRankings } from '@/lib/tournament-leaderboard';

function rankIcon(rank) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-mono">{rank}</span>;
}

/**
 * Shows tournament standings using scorecards (User IDs) + player name map.
 * Props: tournament, scorecards, nameMap, currentUserId
 */
export default function TournamentStandings({ tournament, scorecards, nameMap = {}, currentUserId }) {
  const numRounds = tournament?.num_rounds || 4;

  const rankings = useMemo(
    () => computeTournamentRankings(scorecards, nameMap).rankings,
    [scorecards, nameMap],
  );

  if (rankings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground text-sm">No verified scores yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Player</TableHead>
                {Array.from({ length: numRounds }, (_, i) => (
                  <TableHead key={i} className="text-center w-14">R{i + 1}</TableHead>
                ))}
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((player, idx) => {
                const isMe = player.id === currentUserId;
                return (
                  <TableRow key={player.id} className={isMe ? 'bg-primary/8' : idx < 3 ? 'bg-muted/30' : ''}>
                    <TableCell>
                      <div className="flex items-center justify-center">{rankIcon(idx + 1)}</div>
                    </TableCell>
                    <TableCell className={isMe ? 'font-bold' : 'font-medium'}>
                      {player.name}{isMe && <span className="text-primary ml-1 text-xs">(you)</span>}
                    </TableCell>
                    {Array.from({ length: numRounds }, (_, i) => (
                      <TableCell key={i} className={`text-center text-sm ${(player.roundScores[i + 1] || 0) < 0 ? 'text-destructive' : ''}`}>
                        {player.roundScores[i + 1] !== undefined ? player.roundScores[i + 1] : '—'}
                      </TableCell>
                    ))}
                    <TableCell className={`text-center font-bold ${player.totalScore < 0 ? 'text-destructive' : ''}`}>
                      {player.totalScore}
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
}
