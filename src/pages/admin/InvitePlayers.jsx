import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { players as playersApi, registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, User, Trophy, Check, Copy, UserPlus, MapPin } from 'lucide-react';
import InviteStatsPanel from '@/components/tournament/InviteStatsPanel';
import InviteAnalyticsCharts from '@/components/tournament/InviteAnalyticsCharts';
import InviteBatchPreview from '@/components/tournament/InviteBatchPreview';
import InviteWaves from '@/components/tournament/InviteWaves';

export default function InvitePlayers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterTournament, setFilterTournament] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');
  const [selected, setSelected] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [waves, setWaves] = useState(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualInviting, setManualInviting] = useState(false);

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.list().then(ts => ts.find(t => t.id === id)),
    enabled: !!id,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['tournament-registrations', id],
    queryFn: () => registrationsApi.filter({ tournament_id: id }),
    enabled: !!id,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-roster'],
    queryFn: () => playersApi.list({}, { sort: '-created_date', limit: 500 }),
  });

  const { data: allTournaments = [] } = useQuery({
    queryKey: ['all-tournaments-list'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date' }),
  });

  // All confirmed registrations across all tournaments
  const { data: allRegistrations = [] } = useQuery({
    queryKey: ['all-registrations-for-invite'],
    queryFn: () => registrationsApi.list(),
  });

  // All verified scorecards (to compute finishing ranks)
  const { data: allScoreCards = [] } = useQuery({
    queryKey: ['all-scorecards-for-invite'],
    queryFn: () => scoreCardsApi.filter({ status: 'verified' }),
  });

  // Build per-player stats keyed by player_id
  const playerStats = useMemo(() => {
    const stats = {}; // { playerId: { tournamentsPlayed, tournamentIds: Set, scores: { [tid]: total } } }

    allRegistrations.forEach(r => {
      if (!r.player_id || !['confirmed', 'pending'].includes(r.status)) return;
      if (!stats[r.player_id]) stats[r.player_id] = { tournamentsPlayed: 0, tournamentIds: new Set(), scores: {} };
      if (!stats[r.player_id].tournamentIds.has(r.tournament_id)) {
        stats[r.player_id].tournamentIds.add(r.tournament_id);
        stats[r.player_id].tournamentsPlayed += 1;
      }
    });

    // Sum verified scorecard totals per player per tournament
    const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
    const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
    allScoreCards.forEach(sc => {
      playerIdKeys.forEach((key, idx) => {
        const pid = sc[key];
        if (!pid) return;
        if (!stats[pid]) stats[pid] = { tournamentsPlayed: 0, tournamentIds: new Set(), scores: {} };
        const scores = sc[scoreKeys[idx]] || [];
        const total = scores.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
        stats[pid].scores[sc.tournament_id] = (stats[pid].scores[sc.tournament_id] || 0) + total;
      });
    });

    return stats;
  }, [allRegistrations, allScoreCards]);

  // Compute leaderboard ranks per tournament (higher score = better rank)
  const tournamentRanks = useMemo(() => {
    // { tournamentId: { playerId: rank } }
    const ranks = {};
    // Group all score totals by tournament
    const byTournament = {};
    Object.entries(playerStats).forEach(([pid, s]) => {
      Object.entries(s.scores).forEach(([tid, total]) => {
        if (!byTournament[tid]) byTournament[tid] = [];
        byTournament[tid].push({ pid, total });
      });
    });
    Object.entries(byTournament).forEach(([tid, entries]) => {
      const sorted = [...entries].sort((a, b) => b.total - a.total);
      ranks[tid] = {};
      sorted.forEach((e, i) => { ranks[tid][e.pid] = i + 1; });
    });
    return ranks;
  }, [playerStats]);

  // Best rank a player has achieved (lowest rank number)
  const getBestRank = (playerId) => {
    let best = Infinity;
    Object.values(tournamentRanks).forEach(tRanks => {
      if (tRanks[playerId] !== undefined && tRanks[playerId] < best) best = tRanks[playerId];
    });
    return best === Infinity ? null : best;
  };

  // Average rank across all tournaments a player has ranked in
  const getAvgRank = (playerId) => {
    const allRanks = Object.values(tournamentRanks)
      .map(tRanks => tRanks[playerId])
      .filter(r => r !== undefined);
    if (!allRanks.length) return null;
    return allRanks.reduce((s, r) => s + r, 0) / allRanks.length;
  };

  // Rank in a specific tournament
  const getRankInTournament = (playerId, tournamentId) => {
    return tournamentRanks[tournamentId]?.[playerId] ?? null;
  };

  // Registered emails for this tournament
  const registeredEmails = new Set(registrations.map(r => r.player_email));

  // Filter & sort
  const availablePlayers = useMemo(() => {
    return allPlayers
      .filter(p => {
        if (registeredEmails.has(p.email)) return false;
        if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.email?.toLowerCase().includes(search.toLowerCase()) && !p.city_state?.toLowerCase().includes(search.toLowerCase())) return false;
        
        // Filter by activity level
        if (filterActivity === 'registered') {
          const pStats = playerStats[p.id];
          if (!pStats || pStats.tournamentsPlayed === 0) return false;
        }
        if (filterActivity === 'confirmed') {
          const confirmed = allRegistrations.some(r => r.player_id === p.id && r.status === 'confirmed');
          if (!confirmed) return false;
        }
        if (filterActivity === 'played') {
          const pStats = playerStats[p.id];
          if (!pStats || pStats.tournamentsPlayed === 0) return false;
          const hasVerifiedScores = allScoreCards.some(sc => 
            [sc.player1_id, sc.player2_id, sc.player3_id, sc.player4_id].includes(p.id)
          );
          if (!hasVerifiedScores) return false;
        }
        
        // Filter by tournament they played in
        if (filterTournament !== 'all') {
          const pStats = playerStats[p.id];
          if (!pStats || !pStats.tournamentIds.has(filterTournament)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'num_tournaments') {
          return (playerStats[b.id]?.tournamentsPlayed || 0) - (playerStats[a.id]?.tournamentsPlayed || 0);
        }
        if (sortBy === 'best_rank') {
          return (getBestRank(a.id) ?? 9999) - (getBestRank(b.id) ?? 9999);
        }
        if (sortBy === 'avg_rank') {
          return (getAvgRank(a.id) ?? 9999) - (getAvgRank(b.id) ?? 9999);
        }
        // sort by rank in the filtered tournament
        if (sortBy === 'tournament_rank' && filterTournament !== 'all') {
          return (getRankInTournament(a.id, filterTournament) ?? 9999) - (getRankInTournament(b.id, filterTournament) ?? 9999);
        }
        return 0;
      });
  }, [allPlayers, search, filterTournament, filterActivity, sortBy, playerStats, registeredEmails, allRegistrations, allScoreCards]);

  const togglePlayer = (p) => {
    setSelected(prev =>
      prev.find(s => s.id === p.id) ? prev.filter(s => s.id !== p.id) : [...prev, p]
    );
  };

  const toggleAll = () => {
    if (selected.length === availablePlayers.length) setSelected([]);
    else setSelected(availablePlayers);
  };

  const handleInvite = async () => {
    const playersToInvite = waves ? waves.flatMap(w => w.players) : selected;
    if (!playersToInvite.length) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const emails = playersToInvite.map(p => p.email);
      const res = await callAction('invitePlayer', { tournament_id: id, emails });
      setInviteResult(res?.results || []);
      setSelected([]);
      setWaves(null);
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', id] });
    } finally {
      setInviting(false);
    }
  };

  const handleManualInvite = async () => {
    if (!manualEmail.trim()) return;
    setManualInviting(true);
    setInviteResult(null);
    try {
      const res = await callAction('invitePlayer', { tournament_id: id, emails: [manualEmail.trim()] });
      setInviteResult(res?.results || []);
      setManualEmail('');
    } finally {
      setManualInviting(false);
    }
  };

  const signupLink = `${window.location.origin}/player-signup?tournament_id=${id}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(signupLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tournaments available for the filter (those that aren't this one)
  const filterableTournaments = allTournaments.filter(t => t.id !== id);

  const activeSelection = waves ? waves.flatMap(w => w.players) : selected;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/tournament/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-slate-800">Invite Players</h1>
          <p className="text-slate-500 text-sm mt-1">{tournament?.name}</p>
        </div>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2"
          onClick={handleInvite}
          disabled={!activeSelection.length || inviting}
        >
          <UserPlus className="h-4 w-4" />
          {inviting ? 'Sending...' : `Invite ${activeSelection.length || ''} Player${activeSelection.length !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {/* Stats and analytics */}
      <InviteStatsPanel 
        allPlayers={allPlayers}
        allRegistrations={allRegistrations}
        allScoreCards={allScoreCards}
        allTournaments={allTournaments}
        playerStats={playerStats}
      />

      <InviteAnalyticsCharts
        allPlayers={allPlayers}
        allRegistrations={allRegistrations}
        allTournaments={allTournaments}
        allScoreCards={allScoreCards}
        playerStats={playerStats}
      />

      {/* Batch preview */}
      <InviteBatchPreview
        selected={activeSelection}
        availablePlayers={availablePlayers}
        search={search}
        filterActivity={filterActivity}
        filterTournament={filterTournament}
        allTournaments={allTournaments}
      />

      {/* Signup link bar */}
      <Card className="mb-6 border-dashed">
        <CardContent className="py-3 flex items-center gap-3">
          <p className="text-sm text-slate-500 shrink-0">Public signup link:</p>
          <span className="text-xs font-mono text-slate-600 truncate flex-1">{signupLink}</span>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </CardContent>
      </Card>

      {/* Invitation waves */}
      {availablePlayers.length > 0 && (
        <InviteWaves
          selected={selected}
          onWavesChange={setWaves}
        />
      )}

      {/* Invite results */}
      {inviteResult && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <CardContent className="py-3 space-y-1">
            {inviteResult.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={r.status === 'already_registered' ? 'outline' : 'default'} className="text-xs">
                  {r.status === 'already_registered' ? 'Already registered' : r.status}
                </Badge>
                <span className="text-slate-600">{r.email}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or location..."
            className="pl-9 bg-white"
          />
        </div>

        {/* Filter: Activity level */}
        <Select value={filterActivity} onValueChange={setFilterActivity}>
          <SelectTrigger className="w-56 bg-white shrink-0">
            <SelectValue placeholder="Filter by activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All players</SelectItem>
            <SelectItem value="registered">Ever registered</SelectItem>
            <SelectItem value="confirmed">Ever confirmed</SelectItem>
            <SelectItem value="played">Ever played</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: played in tournament */}
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className="w-52 bg-white shrink-0">
            <SelectValue placeholder="Filter by tournament" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tournaments</SelectItem>
            {filterableTournaments.map(t => (
              <SelectItem key={t.id} value={t.id}>Played: {t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-56 bg-white shrink-0">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="num_tournaments">Number of Tournaments</SelectItem>
            <SelectItem value="avg_rank">Overall Avg. Ranking</SelectItem>
            <SelectItem value="best_rank">Highest (Best) Ranking</SelectItem>
            {filterTournament !== 'all' && (
              <SelectItem value="tournament_rank">
                {allTournaments.find(t => t.id === filterTournament)?.name ?? 'Tournament'} – Final Ranking
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="px-3 py-1.5 text-sm self-center">
            {availablePlayers.length} available
          </Badge>
          {selected.length > 0 && (
            <Badge className="bg-primary/10 text-primary border-0 px-3 py-1.5 text-sm">
              {selected.length} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Select all / clear */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={toggleAll} className="text-xs text-primary hover:underline font-medium">
          {selected.length === availablePlayers.length && availablePlayers.length > 0 ? 'Deselect all' : 'Select all'}
        </button>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="text-xs text-slate-400 hover:text-slate-600">
            Clear selection
          </button>
        )}
      </div>

      {/* Manual email invite */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="py-4 flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-600 font-medium block mb-1">Invite by email</label>
            <Input
              value={manualEmail}
              onChange={e => setManualEmail(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleManualInvite()}
              placeholder="support@morainmahj.com"
              className="bg-white"
            />
          </div>
          <Button
            onClick={handleManualInvite}
            disabled={!manualEmail.trim() || manualInviting}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            {manualInviting ? 'Sending...' : 'Send'}
          </Button>
        </CardContent>
      </Card>

      {/* Player list */}
      <Card>
        <CardContent className="pt-0 divide-y">
          {availablePlayers.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-12">
              {search || filterTournament !== 'all' ? 'No players match your filters.' : 'All roster players are already invited to this tournament.'}
            </p>
          )}
          {availablePlayers.map(p => {
            const isSelected = !!selected.find(s => s.id === p.id);
            const tCount = playerStats[p.id]?.tournamentsPlayed || 0;
            const bestRank = getBestRank(p.id);
            const avgRank = getAvgRank(p.id);
            const tRank = filterTournament !== 'all' ? getRankInTournament(p.id, filterTournament) : null;

            // Stat label shown on the right, based on sort
            let statLabel = null;
            if (sortBy === 'num_tournaments') {
              statLabel = tCount > 0 ? <span className="text-amber-600 font-medium flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{tCount}</span> : null;
            } else if (sortBy === 'best_rank') {
              statLabel = bestRank !== null ? <span className="text-slate-600">Best <strong>#{bestRank}</strong></span> : null;
            } else if (sortBy === 'avg_rank') {
              statLabel = avgRank !== null ? <span className="text-slate-600">Avg <strong>#{avgRank.toFixed(1)}</strong></span> : null;
            } else if (sortBy === 'tournament_rank') {
              statLabel = tRank !== null ? <span className="text-slate-600">Rank <strong>#{tRank}</strong></span> : null;
            } else {
              // default: show tournament count
              statLabel = tCount > 0 ? <span className="text-amber-600 font-medium flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{tCount}</span> : null;
            }

            return (
              <button
                key={p.id}
                onClick={() => togglePlayer(p)}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-primary/5' : ''}`}
              >
                {/* Avatar */}
                {p.photo_url
                  ? <img src={p.photo_url} alt={p.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                  : <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-5 w-5 text-primary" /></div>
                }

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 truncate">{p.city_state || p.email}</p>
                </div>

                {/* Dynamic stat */}
                {statLabel && (
                  <span className="hidden sm:flex items-center gap-1 text-xs shrink-0">{statLabel}</span>
                )}

                {/* Checkbox */}
                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Sticky bottom bar when players selected */}
      {activeSelection.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg flex items-center justify-between gap-4 z-40">
          <p className="text-sm font-medium text-slate-700">{activeSelection.length} player{activeSelection.length !== 1 ? 's' : ''} ready to invite</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSelected([]); setWaves(null); }}>Clear</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2"
              onClick={handleInvite}
              disabled={inviting}
            >
              <UserPlus className="h-4 w-4" />
              {inviting ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>
        </div>
      )}
      {activeSelection.length > 0 && <div className="h-20" />}
    </div>
  );
}