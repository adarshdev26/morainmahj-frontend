import React, { useState } from 'react';
import { players as playersApi, roomMaps as roomMapsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Grid3X3, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, List, Map } from 'lucide-react';
import RoomMapDisplay from '@/components/roommap/RoomMapDisplay';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

const WINDS = ['East', 'South', 'West', 'North'];

export default function AdminTables() {
   const queryClient = useQueryClient();
   const navigate = useNavigate();
   const urlParams = new URLSearchParams(window.location.search);
   const urlTournamentId = urlParams.get('tournament');
   const [filterTournament, setFilterTournament] = useState(urlTournamentId || 'all');
  const [filterRound, setFilterRound] = useState('all');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterWind, setFilterWind] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [mapRound, setMapRound] = useState(1);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 ml-1 text-slate-400" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => playersApi.list({}, { sort: 'name', limit: 500 }),
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['admin-assignments'],
    queryFn: () => tableAssignmentsApi.list({}, { sort: '-created_date', limit: 500 }),
  });

  const activeTournamentId = filterTournament !== 'all' ? filterTournament : null;

  const { data: roomMap, isLoading: roomMapLoading } = useQuery({
    queryKey: ['admin-room-map', activeTournamentId],
    queryFn: () => roomMapsApi.filter({ tournament_id: activeTournamentId }).then(r => r[0] || null),
    enabled: !!activeTournamentId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tableAssignmentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-assignments'] }),
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async ({ tournamentId, round }) => {
      const toDelete = assignments.filter(a => a.tournament_id === tournamentId && a.round_number === round);
      for (const a of toDelete) await tableAssignmentsApi.remove(a.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-assignments'] }),
  });

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '—';
  const getTournamentName = (id) => tournaments.find(t => t.id === id)?.name || '—';

  const getLastName = (fullName) => {
    if (!fullName) return null;
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1];
  };

  const mapRounds = [...new Set(assignments.filter(a => activeTournamentId ? a.tournament_id === activeTournamentId : true).map(a => a.round_number))].sort((a, b) => a - b);

  const tablePlayerData = (() => {
    if (!activeTournamentId) return null;
    const activeRound = mapRounds.includes(mapRound) ? mapRound : (mapRounds[0] || 1);
    const roundAssignments = assignments.filter(a => a.tournament_id === activeTournamentId && a.round_number === activeRound);
    if (roundAssignments.length === 0) return null;
    const data = {};
    roundAssignments.forEach(a => {
      const seats = [
        { wind: 'East',  name: getLastName(getPlayerName(a.player1_id)) },
        { wind: 'South', name: getLastName(getPlayerName(a.player2_id)) },
        { wind: 'West',  name: getLastName(getPlayerName(a.player3_id)) },
        { wind: 'North', name: getLastName(getPlayerName(a.player4_id)) },
      ].filter(s => s.name);
      if (seats.length > 0) data[a.table_number] = seats;
    });
    return data;
  })();

  const filtered = assignments.filter(a => {
    const matchT = filterTournament === 'all' || a.tournament_id === filterTournament;
    const matchR = filterRound === 'all' || String(a.round_number) === filterRound;
    const q = search.toLowerCase();
    const matchS = !q || [a.player1_id, a.player2_id, a.player3_id, a.player4_id]
      .some(id => getPlayerName(id).toLowerCase().includes(q));
    return matchT && matchR && matchS;
  });

  const rounds = [...new Set(assignments.map(a => a.round_number))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Table Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage all table assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Map className="h-4 w-4" /> Room Map
            </button>
          </div>
          {urlTournamentId && (
            <button onClick={() => navigate(`/admin/tournament/${urlTournamentId}`)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Tournament
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className="w-56 bg-white">
            <SelectValue placeholder="All Tournaments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRound} onValueChange={setFilterRound}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Rounds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rounds</SelectItem>
            {rounds.map(r => <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by player name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 w-56 bg-white"
          />
        </div>
        <Select value={filterWind} onValueChange={setFilterWind}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All Winds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Winds</SelectItem>
            <SelectItem value="east">East only</SelectItem>
            <SelectItem value="south">South only</SelectItem>
            <SelectItem value="west">West only</SelectItem>
            <SelectItem value="north">North only</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center px-3 py-1.5 text-sm">{filtered.length} assignments</Badge>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div>
          {!activeTournamentId ? (
            <div className="text-center py-16 text-slate-400">
              <Map className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Select a specific tournament above to view the room map.</p>
            </div>
          ) : roomMapLoading ? (
            <div className="text-center py-16 text-slate-400">Loading map...</div>
          ) : !roomMap ? (
            <div className="text-center py-16 text-slate-400">
              <Map className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No room map configured for this tournament.</p>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                {mapRounds.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {mapRounds.map(r => {
                      const activeRound = mapRounds.includes(mapRound) ? mapRound : mapRounds[0];
                      return (
                        <button
                          key={r}
                          onClick={() => setMapRound(r)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${activeRound === r ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-slate-600 hover:border-slate-400'}`}
                        >
                          Round {r}
                        </button>
                      );
                    })}
                  </div>
                )}
                <RoomMapDisplay mapData={roomMap} tablePlayerData={tablePlayerData} fullscreen={true} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'table' && <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {[['tournament','Tournament'],['round','Round'],['table','Table'],['east','East'],['south','South'],['west','West'],['north','North']].filter(([col]) => {
                    if (['tournament','round','table'].includes(col)) return true;
                    return filterWind === 'all' || filterWind === col;
                  }).map(([col, label]) => (
                    <TableHead key={col} className="cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort(col)}>
                      <span className="inline-flex items-center">{label}<SortIcon col={col} /></span>
                    </TableHead>
                  ))}
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={filterWind === 'all' ? 8 : 5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>}
                 {!isLoading && filtered.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={filterWind === 'all' ? 8 : 5} className="text-center py-12">
                      <Grid3X3 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">No table assignments found.</p>
                    </TableCell>
                  </TableRow>
                )}
                {[...filtered].sort((a, b) => {
                  if (!sortCol) return a.round_number - b.round_number || a.table_number - b.table_number;
                  let aVal, bVal;
                  if (sortCol === 'tournament') { aVal = getTournamentName(a.tournament_id); bVal = getTournamentName(b.tournament_id); }
                  else if (sortCol === 'round') { aVal = a.round_number; bVal = b.round_number; }
                  else if (sortCol === 'table') { aVal = a.table_number; bVal = b.table_number; }
                  else if (sortCol === 'east') { aVal = getPlayerName(a.player1_id); bVal = getPlayerName(b.player1_id); }
                  else if (sortCol === 'south') { aVal = getPlayerName(a.player2_id); bVal = getPlayerName(b.player2_id); }
                  else if (sortCol === 'west') { aVal = getPlayerName(a.player3_id); bVal = getPlayerName(b.player3_id); }
                  else if (sortCol === 'north') { aVal = getPlayerName(a.player4_id); bVal = getPlayerName(b.player4_id); }
                  const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                  return sortDir === 'asc' ? cmp : -cmp;
                }).map(a => (
                  <TableRow key={a.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600 max-w-[160px] truncate">{getTournamentName(a.tournament_id)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">R{a.round_number}</Badge></TableCell>
                    <TableCell className="font-semibold text-slate-700">#{a.table_number}</TableCell>
                    {[[a.player1_id,'E','east'],[a.player2_id,'S','south'],[a.player3_id,'W','west'],[a.player4_id,'N','north']].filter(([,,key]) => filterWind === 'all' || filterWind === key).map(([id, wind, key]) => (
                      <TableCell key={key} className="text-sm text-slate-600">
                        {getPlayerName(id)} <span className="text-xs font-bold text-slate-400">{wind}</span>
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                        if (confirm('Delete this assignment?')) deleteMutation.mutate(a.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}