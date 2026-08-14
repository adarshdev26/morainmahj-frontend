import React, { useState, useEffect } from 'react';
import { players as playersApi, registrations as registrationsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shuffle, Save, Plus, X, GripVertical, Compass, Users, Search, Lightbulb, Wand2 } from 'lucide-react';
import TableOptionCard from '@/components/tables/TableOptionCard';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import TournamentSelector from '@/components/shared/TournamentSelector';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East: 'bg-red-100 text-red-700',
  South: 'bg-blue-100 text-blue-700',
  West: 'bg-green-100 text-green-700',
  North: 'bg-amber-100 text-amber-700',
};

// Build draft state: { unassigned: [playerId,...], tables: [{table_number, players:[id,id,id,id]}, ...] }
function buildDraft(players, assignments) {
  if (assignments.length > 0) {
    const assigned = new Set();
    const tables = assignments
      .sort((a, b) => a.table_number - b.table_number)
      .map(a => {
        const ps = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].filter(Boolean);
        ps.forEach(id => assigned.add(id));
        return { table_number: a.table_number, players: [a.player1_id || null, a.player2_id || null, a.player3_id || null, a.player4_id || null] };
      });
    const unassigned = players.filter(p => !assigned.has(p.id)).map(p => p.id);
    return { tables, unassigned };
  }
  // Default: all unassigned
  return { tables: [], unassigned: players.map(p => p.id) };
}

export default function Tables() {
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState('');
  const [activeRound, setActiveRound] = useState('1');
  const [draft, setDraft] = useState(null); // null = not editing
  const [isDirty, setIsDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [windMode, setWindMode] = useState('keep'); // 'keep' or 'randomize'
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const tournament = tournaments.find(t => t.id === selectedTournament);

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', selectedTournament],
    queryFn: () => registrationsApi.filter({ tournament_id: selectedTournament, status: 'confirmed' }),
    enabled: !!selectedTournament,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', selectedTournament, registrations.length],
    queryFn: async () => {
      if (!registrations.length) return [];
      const playerIds = [...new Set(registrations.map(r => r.player_id))];
      const allPlayers = await playersApi.list();
      return playerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    },
    enabled: !!selectedTournament && registrations.length > 0,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', selectedTournament],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: selectedTournament }),
    enabled: !!selectedTournament,
    refetchInterval: 2000,
  });

  const roundAssignments = assignments.filter(a => a.round_number === Number(activeRound));

  // Load draft from saved assignments when round/tournament changes
  useEffect(() => {
    if (players.length > 0) {
      setDraft(buildDraft(players, roundAssignments));
      setIsDirty(false);
    }
  }, [selectedTournament, activeRound, assignments.length, players.length]);

  const saveMutation = useMutation({
    mutationFn: async (draftData) => {
      const existing = assignments.filter(a => a.round_number === Number(activeRound));
      for (const a of existing) await tableAssignmentsApi.remove(a.id);

      const toCreate = draftData.tables.map(t => ({
        tournament_id: selectedTournament,
        round_number: Number(activeRound),
        table_number: t.table_number,
        player1_id: t.players[0] || '',
        player2_id: t.players[1] || '',
        player3_id: t.players[2] || '',
        player4_id: t.players[3] || '',
      }));
      if (toCreate.length > 0) await tableAssignmentsApi.bulkCreate(toCreate);
      // Scorecards are created when the tournament is activated, not during planning
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setIsDirty(false);
    },
  });

  const getPlayer = (id) => players.find(p => p.id === id);
  const getPlayerName = (id) => getPlayer(id)?.name || '?';

  const updateDraft = (newDraft) => { setDraft(newDraft); setIsDirty(true); };

  const randomize = () => {
    // Build a map of past pairings from previous rounds
    const currentRound = Number(activeRound);
    const pastPairings = {}; // playerId -> Set of playerIds they've sat with
    assignments
      .filter(a => a.round_number < currentRound)
      .forEach(a => {
        const seats = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].filter(Boolean);
        seats.forEach(pid => {
          if (!pastPairings[pid]) pastPairings[pid] = new Set();
          seats.forEach(other => { if (other !== pid) pastPairings[pid].add(other); });
        });
      });

    // Score a proposed table (lower = better, i.e. fewer repeats)
    const tableScore = (group) => {
      let repeats = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (pastPairings[group[i]]?.has(group[j])) repeats++;
        }
      }
      return repeats;
    };

    // Shuffle and try to minimize repeat pairings with a greedy approach
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const playerIds = shuffled.map(p => p.id);
    const assigned = [];
    const remaining = [...playerIds];
    const tables = [];

    while (remaining.length >= 4) {
      // Pick first player, then greedily pick 3 others with fewest past pairings
      const first = remaining.shift();
      let best = null;
      let bestScore = Infinity;

      // Try a few random combinations to find a good one
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidates = [...remaining].sort(() => Math.random() - 0.5).slice(0, 3);
        const group = [first, ...candidates];
        const score = tableScore(group);
        if (score < bestScore) { bestScore = score; best = candidates; }
        if (bestScore === 0) break;
      }

      best.forEach(id => remaining.splice(remaining.indexOf(id), 1));
      const group = [first, ...best];
      tables.push({ table_number: tables.length + 1, players: group });
      assigned.push(...group);
    }

    updateDraft({ tables, unassigned: remaining });
  };

  const buildOption = () => {
    const currentRound = Number(activeRound);
    const pastPairings = {};
    assignments
      .filter(a => a.round_number < currentRound)
      .forEach(a => {
        const seats = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].filter(Boolean);
        seats.forEach(pid => {
          if (!pastPairings[pid]) pastPairings[pid] = new Set();
          seats.forEach(other => { if (other !== pid) pastPairings[pid].add(other); });
        });
      });

    const tableScore = (group) => {
      let repeats = 0;
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++)
          if (pastPairings[group[i]]?.has(group[j])) repeats++;
      return repeats;
    };

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const remaining = shuffled.map(p => p.id);
    const tables = [];
    let totalRepeats = 0;

    while (remaining.length >= 4) {
      const first = remaining.shift();
      let best = null;
      let bestScore = Infinity;
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidates = [...remaining].sort(() => Math.random() - 0.5).slice(0, 3);
        const score = tableScore([first, ...candidates]);
        if (score < bestScore) { bestScore = score; best = candidates; }
        if (bestScore === 0) break;
      }
      best.forEach(id => remaining.splice(remaining.indexOf(id), 1));
      const group = [first, ...best];
      totalRepeats += tableScore(group);
      tables.push({ table_number: tables.length + 1, players: group });
    }
    return { tables, unassigned: remaining, repeatCount: totalRepeats };
  };

  const generateOptions = () => {
    const options = Array.from({ length: 3 }, () => buildOption());
    setGeneratedOptions(options);
    setShowOptions(true);
  };

  const selectOption = (option) => {
    updateDraft({ tables: option.tables, unassigned: option.unassigned });
    setShowOptions(false);
  };

  // Generate rounds 2..N from round 1 assignments using East-stays logic
  const generateAllRounds = async () => {
    setIsGeneratingAll(true);
    const round1 = assignments.filter(a => a.round_number === 1);
    if (round1.length === 0) { setIsGeneratingAll(false); return; }

    // WINDS indexed: 0=East,1=South,2=West,3=North
    // player slot: player1=East(0), player2=South(1), player3=West(2), player4=North(3)
    const WIND_IDX = ['East', 'South', 'West', 'North'];

    // Build pastPairings tracker
    const pastPairings = {};
    const addPairings = (tableArr) => {
      tableArr.forEach(t => {
        const seats = [t.player1_id, t.player2_id, t.player3_id, t.player4_id].filter(Boolean);
        seats.forEach(pid => {
          if (!pastPairings[pid]) pastPairings[pid] = new Set();
          seats.forEach(other => { if (other !== pid) pastPairings[pid].add(other); });
        });
      });
    };
    addPairings(round1);

    let prevRound = round1.map(t => ({
      table_number: t.table_number,
      players: [t.player1_id, t.player2_id, t.player3_id, t.player4_id], // idx = wind idx
    }));

    const allNewRounds = []; // array of arrays of table objects per round

    for (let r = 2; r <= numRounds; r++) {
      // East players stay; collect movers (S/W/N) with their wind idx
      const movers = []; // { playerId, windIdx }
      prevRound.forEach(t => {
        // South(1), West(2), North(3) move
        [1, 2, 3].forEach(wIdx => {
          if (t.players[wIdx]) movers.push({ playerId: t.players[wIdx], windIdx: wIdx });
        });
      });

      // Shuffle movers
      movers.sort(() => Math.random() - 0.5);

      // Build new tables: each table keeps its East, needs S/W/N filled
      const newTables = prevRound.map(t => ({
        table_number: t.table_number,
        players: [t.players[0], null, null, null], // East stays
      }));

      // For each table we need to fill wind slots 1,2,3
      // Assign movers to tables avoiding: same table as before, repeat pairings
      // Strategy: for each table slot, pick best available mover
      const usedMovers = new Set();

      for (const tbl of newTables) {
        const eastId = tbl.players[0];
        const slotsToFill = windMode === 'keep'
          ? [1, 2, 3] // keep wind designations
          : [1, 2, 3]; // same slots, but we'll assign any mover regardless of their prev wind

        if (windMode === 'keep') {
          // Each mover keeps their wind idx, assign by wind group
          [1, 2, 3].forEach(wIdx => {
            const available = movers.filter(m =>
              !usedMovers.has(m.playerId) &&
              m.windIdx === wIdx &&
              m.playerId !== eastId
            );
            if (available.length === 0) return;
            // Pick one that minimizes repeats with current table occupants
            const current = tbl.players.filter(Boolean);
            available.sort((a, b) => {
              const scoreA = current.filter(p => pastPairings[a.playerId]?.has(p)).length;
              const scoreB = current.filter(p => pastPairings[b.playerId]?.has(p)).length;
              return scoreA - scoreB;
            });
            const chosen = available[0];
            tbl.players[wIdx] = chosen.playerId;
            usedMovers.add(chosen.playerId);
          });
        } else {
          // Randomize: assign any mover to any S/W/N slot
          const available = movers.filter(m =>
            !usedMovers.has(m.playerId) && m.playerId !== eastId
          );
          const current = tbl.players.filter(Boolean);
          available.sort((a, b) => {
            const scoreA = current.filter(p => pastPairings[a.playerId]?.has(p)).length;
            const scoreB = current.filter(p => pastPairings[b.playerId]?.has(p)).length;
            return scoreA - scoreB;
          });
          const shuffledWinds = [1, 2, 3].sort(() => Math.random() - 0.5);
          shuffledWinds.forEach((wIdx, i) => {
            if (available[i]) {
              tbl.players[wIdx] = available[i].playerId;
              usedMovers.add(available[i].playerId);
            }
          });
        }
      }

      allNewRounds.push(newTables);
      addPairings(newTables.map(t => ({
        player1_id: t.players[0], player2_id: t.players[1],
        player3_id: t.players[2], player4_id: t.players[3],
      })));
      prevRound = newTables;
    }

    // Save all generated rounds
    for (let i = 0; i < allNewRounds.length; i++) {
      const roundNum = i + 2;
      const existing = assignments.filter(a => a.round_number === roundNum);
      for (const a of existing) await tableAssignmentsApi.remove(a.id);

      const toCreate = allNewRounds[i].map(t => ({
        tournament_id: selectedTournament,
        round_number: roundNum,
        table_number: t.table_number,
        player1_id: t.players[0] || '',
        player2_id: t.players[1] || '',
        player3_id: t.players[2] || '',
        player4_id: t.players[3] || '',
      }));
      if (toCreate.length > 0) await tableAssignmentsApi.bulkCreate(toCreate);
      // Scorecards are created when the tournament is activated, not during planning
    }

    queryClient.invalidateQueries({ queryKey: ['assignments'] });
    setIsGeneratingAll(false);
  };

  const addTable = () => {
    const nextNum = (draft?.tables.length ? Math.max(...draft.tables.map(t => t.table_number)) : 0) + 1;
    updateDraft({ ...draft, tables: [...(draft?.tables || []), { table_number: nextNum, players: [null, null, null, null] }] });
  };

  const removeTable = (tableNum) => {
    const table = draft.tables.find(t => t.table_number === tableNum);
    const freed = (table?.players || []).filter(Boolean);
    updateDraft({
      tables: draft.tables.filter(t => t.table_number !== tableNum),
      unassigned: [...draft.unassigned, ...freed],
    });
  };

  const removePlayerFromSeat = (tableNum, seatIdx) => {
    const newTables = draft.tables.map(t => {
      if (t.table_number !== tableNum) return t;
      const players = [...t.players];
      const removed = players[seatIdx];
      players[seatIdx] = null;
      return { ...t, players };
    });
    const removed = draft.tables.find(t => t.table_number === tableNum)?.players[seatIdx];
    updateDraft({ tables: newTables, unassigned: removed ? [...draft.unassigned, removed] : draft.unassigned });
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const playerId = draggableId;
    const newDraft = JSON.parse(JSON.stringify(draft)); // deep clone

    // Remove from source
    if (source.droppableId === 'unassigned') {
      newDraft.unassigned.splice(source.index, 1);
    } else {
      // source is table-X-seat-Y
      const [, tableNum, , seatIdx] = source.droppableId.split('-');
      const table = newDraft.tables.find(t => t.table_number === Number(tableNum));
      const displaced = table.players[Number(seatIdx)];
      table.players[Number(seatIdx)] = null;
      if (displaced && displaced !== playerId) {
        newDraft.unassigned.push(displaced);
      }
    }

    // Place in destination
    if (destination.droppableId === 'unassigned') {
      newDraft.unassigned.splice(destination.index, 0, playerId);
    } else {
      const [, tableNum, , seatIdx] = destination.droppableId.split('-');
      const table = newDraft.tables.find(t => t.table_number === Number(tableNum));
      const displaced = table.players[Number(seatIdx)];
      table.players[Number(seatIdx)] = playerId;
      if (displaced && displaced !== playerId) {
        newDraft.unassigned.push(displaced);
      }
    }

    updateDraft(newDraft);
  };

  const numRounds = tournament?.num_rounds || 4;
  const round1Assignments = assignments.filter(a => a.round_number === 1);
  const hasRound1 = round1Assignments.length > 0;
  const unassignedPlayers = (draft?.unassigned || []).map(id => getPlayer(id)).filter(Boolean);
  const filteredUnassigned = search.trim()
    ? unassignedPlayers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : unassignedPlayers;

  return (
    <div>
      <PageHeader
        title="Table Pairings"
        subtitle="Drag players into seats or randomize — 4 players per table"
        actions={
          selectedTournament && players.length >= 4 && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="gap-2" onClick={generateOptions}>
                <Lightbulb className="h-4 w-4" /> Generate Options
              </Button>
              <Button variant="outline" className="gap-2" onClick={randomize}>
                <Shuffle className="h-4 w-4" /> Randomize
              </Button>
              <Button variant="outline" className="gap-2" onClick={addTable}>
                <Plus className="h-4 w-4" /> Add Table
              </Button>
              {isDirty && (
                <Button className="gap-2" onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : `Save Round ${activeRound}`}
                </Button>
              )}
            </div>
          )
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <TournamentSelector
          tournaments={tournaments}
          selectedId={selectedTournament}
          onSelect={(id) => { setSelectedTournament(id); setDraft(null); setIsDirty(false); setSearch(''); }}
        />
      </div>

      {selectedTournament && (
        <Tabs value={activeRound} onValueChange={(r) => { setActiveRound(r); setIsDirty(false); setSearch(''); }} className="mb-6">
          <TabsList>
            {Array.from({ length: numRounds }, (_, i) => (
              <TabsTrigger key={i + 1} value={String(i + 1)}>Round {i + 1}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Generate All Rounds Panel */}
      {selectedTournament && hasRound1 && numRounds > 1 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4 px-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Wand2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Auto-generate Rounds 2–{numRounds}</p>
                <p className="text-xs text-muted-foreground">East stays at their table. S/W/N scatter to new tables.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                <button
                  onClick={() => setWindMode('keep')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${windMode === 'keep' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Keep Winds
                </button>
                <button
                  onClick={() => setWindMode('randomize')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${windMode === 'randomize' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Randomize Winds
                </button>
              </div>
              <Button onClick={generateAllRounds} disabled={isGeneratingAll} className="gap-2 text-sm">
                <Wand2 className="h-4 w-4" />
                {isGeneratingAll ? 'Generating...' : `Generate Rounds 2–${numRounds}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedTournament ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-muted-foreground">Select a tournament to manage pairings.</p>
          </CardContent>
        </Card>
      ) : players.length < 4 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-muted-foreground">You need at least 4 players to create pairings.</p>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Generated Options Panel */}
        {showOptions && generatedOptions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                <h3 className="font-semibold text-sm">Choose a seating arrangement for Round {activeRound}</h3>
              </div>
              <button onClick={() => setShowOptions(false)} className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1">
                <X className="h-3.5 w-3.5" /> Dismiss
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {generatedOptions.map((option, idx) => (
                <TableOptionCard
                  key={idx}
                  option={option}
                  optionIndex={idx}
                  players={players}
                  onSelect={selectOption}
                  isSelected={false}
                />
              ))}
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Unassigned player pool */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="sticky top-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Unassigned</h3>
                  <Badge variant="outline" className="text-xs ml-auto">{unassignedPlayers.length}</Badge>
                </div>
                {unassignedPlayers.length >= 8 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-7 h-8 text-sm"
                    />
                  </div>
                )}
                <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[80px] rounded-xl border-2 border-dashed p-2 space-y-1.5 transition-colors ${
                        snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                      }`}
                    >
                      {filteredUnassigned.map((player, index) => (
                        <Draggable key={player.id} draggableId={player.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-card border text-sm font-medium cursor-grab active:cursor-grabbing transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-1 border-primary' : 'shadow-sm hover:shadow-md'
                              }`}
                            >
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{player.name}</span>
                              {player.flight && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 ml-auto flex-shrink-0">{player.flight}</Badge>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {unassignedPlayers.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-3">All assigned!</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            {/* Tables grid */}
            <div className="flex-1">
              {draft?.tables.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <Compass className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground mb-4">No tables yet.</p>
                    <div className="flex gap-2 flex-wrap justify-center">
                      <Button onClick={generateOptions} variant="outline" className="gap-2"><Lightbulb className="h-4 w-4" /> Generate Options</Button>
                      <Button onClick={randomize} variant="outline" className="gap-2"><Shuffle className="h-4 w-4" /> Randomize</Button>
                      <Button onClick={addTable} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Table</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {draft.tables.map((table) => (
                    <Card key={table.table_number} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-heading text-base">Table {table.table_number}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {table.players.filter(Boolean).length}/4
                            </Badge>
                            <button
                              onClick={() => removeTable(table.table_number)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="space-y-2">
                          {WINDS.map((wind, seatIdx) => {
                            const droppableId = `table-${table.table_number}-seat-${seatIdx}`;
                            const playerId = table.players[seatIdx];
                            const player = playerId ? getPlayer(playerId) : null;

                            return (
                              <div key={wind} className="flex items-center gap-2">
                                <Badge className={`text-[10px] px-1.5 py-0.5 w-14 justify-center flex-shrink-0 ${WIND_COLORS[wind]}`}>
                                  {wind}
                                </Badge>
                                <Droppable droppableId={droppableId} isDropDisabled={false}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`flex-1 min-h-[36px] rounded-lg border transition-colors flex items-center ${
                                        snapshot.isDraggingOver
                                          ? 'border-primary bg-primary/10'
                                          : player ? 'border-border bg-muted/40' : 'border-dashed border-muted-foreground/30 bg-muted/20'
                                      }`}
                                    >
                                      {player ? (
                                        <Draggable draggableId={player.id} index={0}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`flex items-center gap-2 px-2.5 py-1.5 w-full rounded-lg cursor-grab active:cursor-grabbing ${
                                                snapshot.isDragging ? 'shadow-lg bg-card' : ''
                                              }`}
                                            >
                                              <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                              <span className="text-sm font-medium flex-1 truncate">{player.name}</span>
                                              {wind === 'East' && <Badge className="bg-red-500/10 text-red-600 text-[9px] px-1 py-0 flex-shrink-0">Verifier</Badge>}
                                              <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={() => removePlayerFromSeat(table.table_number, seatIdx)}
                                                className="text-muted-foreground hover:text-destructive flex-shrink-0"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </div>
                                          )}
                                        </Draggable>
                                      ) : (
                                        <span className="text-xs text-muted-foreground px-3 py-1.5">Drop player here</span>
                                      )}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DragDropContext>
        </>
      )}
    </div>
  );
}