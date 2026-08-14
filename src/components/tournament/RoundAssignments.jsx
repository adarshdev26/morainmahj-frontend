import React, { useState } from 'react';
import { scoreCards as scoreCardsApi, tableAssignments as tableAssignmentsApi } from '@/services/resources';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shuffle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function RoundAssignments({ tournamentId, roundNumber, assignments, registrations, players }) {
  const queryClient = useQueryClient();
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [eastStays, setEastStays] = useState(false);

  const roundAssignments = assignments
    .filter(a => a.round_number === roundNumber)
    .sort((a, b) => a.table_number - b.table_number);

  // Build a conflict map: how many times each pair has sat together in previous rounds
  const buildConflictMap = (prevAssignments) => {
    const conflicts = {}; // conflicts[pidA][pidB] = count
    const bump = (a, b) => {
      if (!a || !b || a === b) return;
      if (!conflicts[a]) conflicts[a] = {};
      if (!conflicts[b]) conflicts[b] = {};
      conflicts[a][b] = (conflicts[a][b] || 0) + 1;
      conflicts[b][a] = (conflicts[b][a] || 0) + 1;
    };
    prevAssignments.forEach(t => {
      const seats = [t.player1_id, t.player2_id, t.player3_id, t.player4_id].filter(Boolean);
      for (let i = 0; i < seats.length; i++)
        for (let j = i + 1; j < seats.length; j++)
          bump(seats[i], seats[j]);
    });
    return conflicts;
  };

  // Build a set of previous quartet keys (sorted 4-player groups) to penalize exact repeats
  const buildQuartetSet = (prevAssignments) => {
    const quartets = new Set();
    prevAssignments.forEach(t => {
      const seats = [t.player1_id, t.player2_id, t.player3_id, t.player4_id]
        .filter(Boolean)
        .sort();
      if (seats.length === 4) quartets.add(seats.join('|'));
    });
    return quartets;
  };

  // Score a proposed table group (lower = fewer repeats).
  // Pair-wise conflicts weighted normally; an exact repeated quartet incurs a high penalty.
  const tableScore = (group, conflicts, quartets) => {
    let score = 0;
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        score += (conflicts[group[i]]?.[group[j]] || 0);
    if (group.length === 4) {
      const key = [...group].sort().join('|');
      if (quartets.has(key)) score += 1000; // heavy penalty for repeated quartet
    }
    return score;
  };

  // Greedy conflict-aware seating: pick the best next player for each table.
  // Penalizes repeated quartets and preserves pair-wise conflict avoidance.
  const smartSeat = (playerIds, conflicts, quartets) => {
    const remaining = [...playerIds].sort(() => Math.random() - 0.5); // shuffle first for variety
    const tables = [];
    let tableNum = 1;

    while (remaining.length >= 4) {
      const group = [remaining.shift()];
      for (let seat = 1; seat < 4; seat++) {
        let bestIdx = 0;
        let bestScore = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const candidate = [...group, remaining[i]];
          const s = tableScore(candidate, conflicts, quartets);
          if (s < bestScore) { bestScore = s; bestIdx = i; }
        }
        group.push(remaining.splice(bestIdx, 1)[0]);
      }
      tables.push({
        tournament_id: tournamentId,
        round_number: roundNumber,
        table_number: tableNum++,
        player1_id: group[0],
        player2_id: group[1],
        player3_id: group[2],
        player4_id: group[3],
      });
    }
    return tables;
  };

  // Run smartSeat with bounded retries; keep the attempt with the lowest total score
  // (fewest repeated pairings and repeated quartets).
  const smartSeatWithRetries = (playerIds, conflicts, quartets, maxAttempts = 8) => {
    let best = null;
    let bestScore = Infinity;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tables = smartSeat(playerIds, conflicts, quartets);
      let total = 0;
      tables.forEach(t => {
        const group = [t.player1_id, t.player2_id, t.player3_id, t.player4_id].filter(Boolean);
        total += tableScore(group, conflicts, quartets);
      });
      if (total < bestScore) { bestScore = total; best = tables; }
      if (total === 0) break; // optimal found
    }
    return best;
  };

  const randomizeMutation = useMutation({
    mutationFn: async () => {
      const confirmedRegs = registrations.filter(r => r.status === 'confirmed');
      const playerIds = confirmedRegs.map(r => r.player_id);
      if (playerIds.length < 4) throw new Error('Need at least 4 confirmed players');

      // Delete existing round assignments
      const existing = assignments.filter(a => a.round_number === roundNumber);
      if (existing.length > 0) {
        await Promise.allSettled(existing.map(a => tableAssignmentsApi.remove(a.id)));
      }

      let tables = [];
      const prevAssignments = assignments.filter(a => a.round_number < roundNumber);

      if (eastStays && roundNumber > 1) {
        // Deterministic rotation: East stays, South +1, West +2, North -1 (all mod N tables)
        const prevRound = assignments.filter(a => a.round_number === roundNumber - 1)
          .sort((a, b) => a.table_number - b.table_number);

        if (prevRound.length > 0) {
          const N = prevRound.length;
          let tableNum = 1;
          for (let i = 0; i < N; i++) {
            const eastTable = prevRound[i];
            const southTable = prevRound[(i + 1) % N];
            const westTable = prevRound[(i + 2) % N];
            const northTable = prevRound[(i + N - 1) % N];
            tables.push({
              tournament_id: tournamentId,
              round_number: roundNumber,
              table_number: tableNum++,
              player1_id: eastTable.player1_id,
              player2_id: southTable.player2_id,
              player3_id: westTable.player3_id,
              player4_id: northTable.player4_id,
            });
          }
        } else {
          // No previous round — use smart seating
          const conflicts = buildConflictMap(prevAssignments);
          const quartets = buildQuartetSet(prevAssignments);
          tables = smartSeatWithRetries(playerIds, conflicts, quartets);
        }
      } else {
        // Smart conflict-aware seating
        const conflicts = buildConflictMap(prevAssignments);
        const quartets = buildQuartetSet(prevAssignments);
        tables = smartSeatWithRetries(playerIds, conflicts, quartets);
      }

      // Create assignments individually and auto-create ScoreCards directly.
      // The admin generating assignments has admin role, so ScoreCard.create
      // is allowed by RLS — no dependency on automation or function invocation.
      for (const t of tables) {
        const created = await tableAssignmentsApi.create(t);

        // Check if a scorecard already exists for this round/table (dedup)
        const existing = await scoreCardsApi.filter({
          tournament_id: t.tournament_id,
          round_number: t.round_number,
          table_number: t.table_number,
        });

        if (existing.length === 0) {
          await scoreCardsApi.create({
            tournament_id: t.tournament_id,
            table_assignment_id: created.id,
            round_number: t.round_number,
            table_number: t.table_number,
            player1_id: t.player1_id || null,
            player2_id: t.player2_id || null,
            player3_id: t.player3_id || null,
            player4_id: t.player4_id || null,
            player1_scores: [0, 0, 0, 0],
            player2_scores: [0, 0, 0, 0],
            player3_scores: [0, 0, 0, 0],
            player4_scores: [0, 0, 0, 0],
            status: 'pending',
            east_verified: false,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-assignments', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['scorecards'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(updates.map(u => tableAssignmentsApi.update(u.tableId, u.data)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament-assignments', tournamentId] }),
  });

  const handleSeatClick = (tableId, seatKey, playerId) => {
    if (!selectedSeat) {
      setSelectedSeat({ tableId, seatKey, playerId });
    } else {
      if (selectedSeat.tableId === tableId && selectedSeat.seatKey === seatKey) {
        setSelectedSeat(null);
        return;
      }
      const updates = [];
      if (selectedSeat.tableId === tableId) {
        updates.push({ tableId, data: { [selectedSeat.seatKey]: playerId, [seatKey]: selectedSeat.playerId } });
      } else {
        updates.push({ tableId: selectedSeat.tableId, data: { [selectedSeat.seatKey]: playerId } });
        updates.push({ tableId, data: { [seatKey]: selectedSeat.playerId } });
      }
      updateMutation.mutate(updates);
      setSelectedSeat(null);
    }
  };

  const getPlayerName = (playerId) =>
    players.find(pl => pl.id === playerId)?.name
    || registrations.find(r => r.player_id === playerId)?.player_name
    || '?';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">
          {roundAssignments.length > 0
            ? `${roundAssignments.length} table${roundAssignments.length !== 1 ? 's' : ''} assigned`
            : 'No assignments yet'}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="east-stays"
              checked={eastStays}
              onCheckedChange={setEastStays}
            />
            <Label htmlFor="east-stays" className="text-sm cursor-pointer select-none">
              East stays, others rotate
            </Label>
          </div>
          <Button
            onClick={() => randomizeMutation.mutate()}
            disabled={randomizeMutation.isPending}
            className="gap-2"
            size="sm"
          >
            <Shuffle className="h-4 w-4" />
            {randomizeMutation.isPending ? 'Generating...' : eastStays ? 'Apply Rotation' : 'Generate Seating'}
          </Button>
        </div>
      </div>

      {selectedSeat && (
        <p className="text-xs text-amber-600 font-medium mb-3 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Player selected — click another seat to swap, or click the same player to cancel.
        </p>
      )}

      {roundAssignments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roundAssignments.map((table) => {
            const seats = [
              { key: 'player1_id', id: table.player1_id, wind: 'E' },
              { key: 'player2_id', id: table.player2_id, wind: 'S' },
              { key: 'player3_id', id: table.player3_id, wind: 'W' },
              { key: 'player4_id', id: table.player4_id, wind: 'N' },
            ];
            return (
              <Card key={table.id} className="bg-card/50">
                <CardContent className="pt-4">
                  <p className="font-semibold text-sm mb-3">Table {table.table_number}</p>
                  <div className="space-y-1.5">
                    {seats.map(seat => {
                      const isSelected = selectedSeat?.tableId === table.id && selectedSeat?.seatKey === seat.key;
                      return (
                        <button
                          key={seat.key}
                          onClick={() => handleSeatClick(table.id, seat.key, seat.id)}
                          className={`w-full flex justify-between items-center text-xs px-2 py-1.5 rounded transition-colors
                            ${isSelected
                              ? 'bg-amber-100 border border-amber-400 text-amber-800 font-semibold'
                              : selectedSeat
                                ? 'bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                : 'bg-slate-50 border border-transparent hover:bg-slate-100 cursor-pointer'
                            }`}
                        >
                          <span>{getPlayerName(seat.id)}</span>
                          <Badge variant="outline" className="text-[10px] ml-2">{seat.wind}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Click "Randomize Seating" to generate table assignments for this round.</p>
      )}
    </div>
  );
}