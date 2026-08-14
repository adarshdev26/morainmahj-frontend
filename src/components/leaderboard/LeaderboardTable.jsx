import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award } from 'lucide-react';

function rankIcon(rank) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-mono w-4 text-center">{rank}</span>;
}

/**
 * Reusable leaderboard display.
 * Props:
 *   tournament  – tournament object (for flights, num_rounds)
 *   players     – array of Player records
 *   scorecards  – array of ScoreCard records (filters to verified internally)
 *   currentUserId – highlight this player's row (optional)
 */
export default function LeaderboardTable({ tournament, players, scorecards, currentUserId }) {
  const flights = tournament?.flights || [];
  const numRounds = tournament?.num_rounds || 4;
  const hasFlight = flights.length > 0;

  const [activeFlight, setActiveFlight] = useState('all');

  const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
  const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

  // Build score map
  const playerScores = {};
  players.forEach(p => {
    playerScores[p.id] = { name: p.name, flight: p.flight || '', totalScore: 0, roundScores: {}, roundsPlayed: 0 };
  });

  const verifiedCards = scorecards.filter(s => s.status === 'verified');
  verifiedCards.forEach(sc => {
    playerIdKeys.forEach((idKey, idx) => {
      const pid = sc[idKey];
      const sKey = scoreKeys[idx];
      if (pid && playerScores[pid] && sc[sKey]) {
        const roundTotal = sc[sKey].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
        playerScores[pid].totalScore += roundTotal;
        playerScores[pid].roundScores[sc.round_number] = roundTotal;
        playerScores[pid].roundsPlayed += 1;
      }
    });
  });

  const rankings = Object.entries(playerScores)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const filteredRankings = activeFlight === 'all'
    ? rankings
    : rankings.filter(r => r.flight === activeFlight);

  if (filteredRankings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Trophy className="h-9 w-9 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No verified scores yet. Standings appear once scores are verified.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {hasFlight && (
        <Tabs value={activeFlight} onValueChange={setActiveFlight} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All Flights</TabsTrigger>
            {flights.map(f => (
              <TabsTrigger key={f} value={f}>Flight {f}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">
            {activeFlight === 'all' ? 'Overall Rankings' : `Flight ${activeFlight} Rankings`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Player</TableHead>
                  {hasFlight && <TableHead>Flight</TableHead>}
                  {Array.from({ length: numRounds }, (_, i) => (
                    <TableHead key={i} className="text-center w-16">R{i + 1}</TableHead>
                  ))}
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRankings.map((player, idx) => {
                  const isMe = player.id === currentUserId;
                  return (
                    <TableRow key={player.id} className={isMe ? 'bg-primary/8 font-semibold' : idx < 3 ? 'bg-muted/30' : ''}>
                      <TableCell>
                        <div className="flex items-center justify-center">{rankIcon(idx + 1)}</div>
                      </TableCell>
                      <TableCell className={isMe ? 'font-bold' : 'font-medium'}>
                        {player.name}{isMe && <span className="text-primary ml-1 text-xs">(you)</span>}
                      </TableCell>
                      {hasFlight && (
                        <TableCell>
                          {player.flight && <Badge variant="outline" className="text-xs">{player.flight}</Badge>}
                        </TableCell>
                      )}
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
    </div>
  );
}