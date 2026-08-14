import React, { useState, useMemo } from 'react';
import { registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Trophy, Medal, Award, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportPermission } from '@/hooks/useExportPermission';
import ExportButton from '@/components/shared/ExportButton';
import { appParams } from '@/lib/app-params';
import { isCapacitorNative } from '@/lib/capacitor-utils';

const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

function SortHeader({ label, field, sortField, sortDir, onSort, className = '' }) {
  const isActive = sortField === field;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-slate-800 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive
          ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </TableHead>
  );
}

function rankIcon(rank) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
  return <span className="text-sm text-slate-400 font-mono">{rank}</span>;
}

export default function AdminLeaderboard() {
   const navigate = useNavigate();
   const urlParams = new URLSearchParams(window.location.search);
   const urlTournamentId = urlParams.get('tournament');
   const [filterTournament, setFilterTournament] = useState(urlTournamentId || 'all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [activeFlight, setActiveFlight] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('totalScore');
  const [sortDir, setSortDir] = useState('desc');

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['admin-registrations-lb'],
    queryFn: () => registrationsApi.list({}, { sort: '-created_date', limit: 1000 }),
  });

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['admin-scorecards-lb'],
    queryFn: () => scoreCardsApi.list({}, { sort: '-created_date', limit: 1000 }),
  });

  const tournament = filterTournament !== 'all' ? tournaments.find(t => t.id === filterTournament) : null;
  const flights = tournament?.flights || [];
  const numRounds = tournament?.num_rounds || 4;

  // Build name + flight lookup from registrations (player_id = User ID)
  const regMap = useMemo(() => {
    const map = {};
    registrations.forEach(r => {
      // For per-tournament, prefer that tournament's registration data
      if (!map[r.player_id] || r.tournament_id === filterTournament) {
        map[r.player_id] = {
          name: r.player_name || r.player_email || r.player_id,
          flight: r.flight || '',
          tournament_id: r.tournament_id,
        };
      }
    });
    return map;
  }, [registrations, filterTournament]);

  // Set of player IDs registered for the selected tournament
  const tournamentPlayerIds = useMemo(() => {
    if (filterTournament === 'all') return null;
    return new Set(registrations.filter(r => r.tournament_id === filterTournament).map(r => r.player_id));
  }, [registrations, filterTournament]);

  // Filter scorecards by tournament and score status
  const relevantCards = useMemo(() => {
    return scorecards.filter(s => {
      const matchT = filterTournament === 'all' || s.tournament_id === filterTournament;
      const matchSt = scoreFilter === 'all' || s.status === scoreFilter;
      return matchT && matchSt;
    });
  }, [scorecards, filterTournament, scoreFilter]);

  // Build player score map keyed by User ID
  const playerMap = useMemo(() => {
    const map = {};

    relevantCards.forEach(sc => {
      playerIdKeys.forEach((idKey, idx) => {
        const uid = sc[idKey];
        if (!uid) return;
        // For per-tournament view, skip players not registered for that tournament
        if (tournamentPlayerIds && !tournamentPlayerIds.has(uid)) return;

        const sKey = scoreKeys[idx];
        const roundTotal = (sc[sKey] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

        if (!map[uid]) {
          const info = regMap[uid] || { name: `Player ${uid.slice(-4)}`, flight: '' };
          map[uid] = { id: uid, name: info.name, flight: info.flight, totalScore: 0, roundScores: {}, roundsPlayed: 0 };
        }
        map[uid].totalScore += roundTotal;
        map[uid].roundScores[sc.round_number] = (map[uid].roundScores[sc.round_number] || 0) + roundTotal;
        map[uid].roundsPlayed += 1;
      });
    });

    return map;
  }, [relevantCards, tournamentPlayerIds, regMap]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const rankings = useMemo(() => {
    let rows = Object.values(playerMap);

    if (activeFlight !== 'all') {
      rows = rows.filter(r => r.flight === activeFlight);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      if (sortField === 'name') {
        return sortDir === 'asc'
          ? a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          : b.name.toLowerCase().localeCompare(a.name.toLowerCase());
      }
      const aVal = sortField.startsWith('round_')
        ? (a.roundScores[Number(sortField.replace('round_', ''))] ?? -Infinity)
        : (a[sortField] ?? 0);
      const bVal = sortField.startsWith('round_')
        ? (b.roundScores[Number(sortField.replace('round_', ''))] ?? -Infinity)
        : (b[sortField] ?? 0);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return rows;
  }, [playerMap, activeFlight, search, sortField, sortDir]);

  // Absolute ranks based on total score
  const rankedById = useMemo(() => {
    const all = Object.values(playerMap).sort((a, b) => b.totalScore - a.totalScore);
    const map = {};
    all.forEach((p, i) => { map[p.id] = i + 1; });
    return map;
  }, [playerMap]);

  const statusCounts = useMemo(() => {
    const t = filterTournament === 'all' ? scorecards : scorecards.filter(s => s.tournament_id === filterTournament);
    return {
      pending: t.filter(s => s.status === 'pending').length,
      submitted: t.filter(s => s.status === 'submitted').length,
      verified: t.filter(s => s.status === 'verified').length,
    };
  }, [scorecards, filterTournament]);

  const handleExport = () => {
    const headers = ['Rank', 'Player', 'Total Score'];
    const rows = rankings.map((p, idx) => [
      String(idx + 1),
      p.name,
      String(p.totalScore),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
     <div>
       <div className="flex items-center justify-between mb-8">
         <div>
           <h1 className="text-2xl font-heading font-bold text-slate-800">Leaderboard</h1>
           <p className="text-slate-500 text-sm mt-1">View and sort all player standings — admins see all scores</p>
         </div>
         <div className="flex gap-2">
           <ExportButton onClick={handleExport} label="Export CSV" variant="outline" />
           {filterTournament !== 'all' && (
             <button
               onClick={async () => {
                 const baseUrl = (appParams.appBaseUrl || window.location.origin).replace(/\/$/, '');
                 const url = `${baseUrl}/public/leaderboard/${filterTournament}`;
                 if (isCapacitorNative()) {
                   const { Browser } = await import('@capacitor/browser');
                   await Browser.open({ url });
                 } else {
                   window.open(url, '_blank');
                 }
               }}
               className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
             >
               <ExternalLink className="h-4 w-4" /> Leaderboard Public URL
             </button>
           )}
           {urlTournamentId && (
             <button onClick={() => navigate(`/admin/tournament/${urlTournamentId}`)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
               <ChevronLeft className="h-4 w-4" /> Back to Tournament
             </button>
           )}
         </div>
       </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={filterTournament} onValueChange={v => { setFilterTournament(v); setActiveFlight('all'); }}>
          <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="All Tournaments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Scores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="verified">Verified only</SelectItem>
            <SelectItem value="submitted">Submitted only</SelectItem>
            <SelectItem value="pending">Pending only</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 w-52 bg-white"
            placeholder="Search player…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Score status summary */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Badge
          variant={scoreFilter === 'verified' ? 'default' : 'outline'}
          className="cursor-pointer gap-1 py-1 px-3"
          onClick={() => setScoreFilter(f => f === 'verified' ? 'all' : 'verified')}
        >
          ✓ {statusCounts.verified} verified
        </Badge>
        <Badge
          variant={scoreFilter === 'submitted' ? 'default' : 'outline'}
          className="cursor-pointer gap-1 py-1 px-3"
          onClick={() => setScoreFilter(f => f === 'submitted' ? 'all' : 'submitted')}
        >
          ↑ {statusCounts.submitted} submitted
        </Badge>
        <Badge
          variant={scoreFilter === 'pending' ? 'default' : 'outline'}
          className="cursor-pointer gap-1 py-1 px-3"
          onClick={() => setScoreFilter(f => f === 'pending' ? 'all' : 'pending')}
        >
          ○ {statusCounts.pending} pending
        </Badge>
        <Badge variant="secondary" className="py-1 px-3">{rankings.length} players shown</Badge>
      </div>

      {/* Flight tabs — only shown for a specific tournament with flights */}
      {flights.length > 0 && (
        <Tabs value={activeFlight} onValueChange={setActiveFlight} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All Flights</TabsTrigger>
            {flights.map(f => <TabsTrigger key={f} value={f}>Flight {f}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : rankings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400">No player data found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10">#</TableHead>
                    <SortHeader label="Player" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    {flights.length > 0 && <TableHead>Flight</TableHead>}
                    {filterTournament !== 'all' && Array.from({ length: numRounds }, (_, i) => (
                      <SortHeader
                        key={i}
                        label={`R${i + 1}`}
                        field={`round_${i + 1}`}
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="text-center w-16"
                      />
                    ))}
                    <SortHeader
                      label="Total"
                      field="totalScore"
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="text-center w-20 font-bold"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((player, idx) => {
                    const rank = rankedById[player.id];
                    return (
                      <TableRow
                        key={player.id}
                        className={idx < 3 && sortField === 'totalScore' && sortDir === 'desc' ? 'bg-amber-50/40' : 'hover:bg-slate-50'}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {sortField === 'totalScore' && sortDir === 'desc' ? rankIcon(idx + 1) : (
                              <span className="text-xs text-slate-400 font-mono">{rank}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">{player.name}</TableCell>
                        {flights.length > 0 && (
                          <TableCell>
                            {player.flight && <Badge variant="outline" className="text-xs">{player.flight}</Badge>}
                          </TableCell>
                        )}
                        {filterTournament !== 'all' && Array.from({ length: numRounds }, (_, i) => (
                          <TableCell key={i} className={`text-center text-sm ${(player.roundScores[i + 1] ?? 0) < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                            {player.roundScores[i + 1] !== undefined ? player.roundScores[i + 1] : '—'}
                          </TableCell>
                        ))}
                        <TableCell className={`text-center font-bold text-base ${player.totalScore < 0 ? 'text-red-500' : 'text-slate-900'}`}>
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
      )}
    </div>
  );
}