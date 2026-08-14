import { useMemo } from 'react';
import { players as playersApi, registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Trophy, Users, BarChart2, Star, TrendingUp } from 'lucide-react';

export default function TournamentAnalytics() {
  const { data: allTournaments = [] } = useQuery({
    queryKey: ['analytics-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date' }),
  });

  const { data: allRegistrations = [] } = useQuery({
    queryKey: ['analytics-registrations'],
    queryFn: () => registrationsApi.list(),
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['analytics-players'],
    queryFn: () => playersApi.list({}, { sort: '-created_date', limit: 500 }),
  });

  const { data: allScoreCards = [] } = useQuery({
    queryKey: ['analytics-scorecards'],
    queryFn: () => scoreCardsApi.filter({ status: 'verified' }),
  });

  const playerMap = useMemo(() => {
    const m = {};
    allPlayers.forEach(p => { m[p.id] = p; });
    return m;
  }, [allPlayers]);

  const completedTournaments = useMemo(
    () => allTournaments.filter(t => t.status === 'completed'),
    [allTournaments]
  );

  // ── Per-player score totals per tournament ──────────────────────────────
  const { playerTournamentScores, tournamentPlayerCounts } = useMemo(() => {
    // playerTournamentScores[pid][tid] = totalScore
    const pts = {};
    const tpc = {}; // tournamentId -> Set of playerIds with scores

    const pidKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
    const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

    allScoreCards.forEach(sc => {
      pidKeys.forEach((key, idx) => {
        const pid = sc[key];
        if (!pid) return;
        const total = (sc[scoreKeys[idx]] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
        if (!pts[pid]) pts[pid] = {};
        pts[pid][sc.tournament_id] = (pts[pid][sc.tournament_id] || 0) + total;
        if (!tpc[sc.tournament_id]) tpc[sc.tournament_id] = new Set();
        tpc[sc.tournament_id].add(pid);
      });
    });

    return { playerTournamentScores: pts, tournamentPlayerCounts: tpc };
  }, [allScoreCards]);

  // ── Ranks per tournament ────────────────────────────────────────────────
  const tournamentRanks = useMemo(() => {
    const ranks = {};
    Object.entries(tournamentPlayerCounts).forEach(([tid, pids]) => {
      const entries = [...pids].map(pid => ({ pid, total: playerTournamentScores[pid]?.[tid] || 0 }));
      entries.sort((a, b) => b.total - a.total);
      ranks[tid] = {};
      entries.forEach((e, i) => { ranks[tid][e.pid] = i + 1; });
    });
    return ranks;
  }, [playerTournamentScores, tournamentPlayerCounts]);

  // ── Attendance per tournament ───────────────────────────────────────────
  const attendanceData = useMemo(() => {
    return completedTournaments.map(t => {
      const confirmed = allRegistrations.filter(r => r.tournament_id === t.id && r.status === 'confirmed').length;
      return { name: t.name.length > 18 ? t.name.slice(0, 18) + '…' : t.name, fullName: t.name, players: confirmed, date: t.date };
    }).sort((a, b) => a.date?.localeCompare(b.date));
  }, [completedTournaments, allRegistrations]);

  // ── Average score per tournament ────────────────────────────────────────
  const avgScoreData = useMemo(() => {
    return completedTournaments.map(t => {
      const pids = tournamentPlayerCounts[t.id] ? [...tournamentPlayerCounts[t.id]] : [];
      const scores = pids.map(pid => playerTournamentScores[pid]?.[t.id] || 0);
      const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      return { name: t.name.length > 18 ? t.name.slice(0, 18) + '…' : t.name, fullName: t.name, avg: Math.round(avg), date: t.date };
    }).sort((a, b) => a.date?.localeCompare(b.date));
  }, [completedTournaments, playerTournamentScores, tournamentPlayerCounts]);

  // ── Overall top players (by avg rank across tournaments) ────────────────
  const topPlayers = useMemo(() => {
    const stats = {};
    Object.entries(tournamentRanks).forEach(([tid, tRanks]) => {
      Object.entries(tRanks).forEach(([pid, rank]) => {
        if (!stats[pid]) stats[pid] = { ranks: [], totalScore: 0, tournaments: 0 };
        stats[pid].ranks.push(rank);
        stats[pid].totalScore += playerTournamentScores[pid]?.[tid] || 0;
        stats[pid].tournaments += 1;
      });
    });

    return Object.entries(stats)
      .map(([pid, s]) => ({
        pid,
        name: playerMap[pid]?.name || 'Unknown',
        city: playerMap[pid]?.city_state || '',
        photo: playerMap[pid]?.photo_url || null,
        avgRank: s.ranks.reduce((a, b) => a + b, 0) / s.ranks.length,
        bestRank: Math.min(...s.ranks),
        tournaments: s.tournaments,
        avgScore: Math.round(s.totalScore / s.tournaments),
      }))
      .sort((a, b) => a.avgRank - b.avgRank)
      .slice(0, 10);
  }, [tournamentRanks, playerTournamentScores, playerMap]);

  // ── Player attendance frequency ─────────────────────────────────────────
  const attendanceFreq = useMemo(() => {
    const freq = {};
    allRegistrations.forEach(r => {
      if (!r.player_id || r.status !== 'confirmed') return;
      freq[r.player_id] = (freq[r.player_id] || 0) + 1;
    });

    const buckets = { '1': 0, '2': 0, '3-5': 0, '6+': 0 };
    Object.values(freq).forEach(count => {
      if (count === 1) buckets['1']++;
      else if (count === 2) buckets['2']++;
      else if (count <= 5) buckets['3-5']++;
      else buckets['6+']++;
    });

    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [allRegistrations]);

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalUniquePlayers = useMemo(() => {
    const ids = new Set(allRegistrations.filter(r => r.status === 'confirmed').map(r => r.player_id));
    return ids.size;
  }, [allRegistrations]);

  const avgAttendancePerT = useMemo(() => {
    if (!completedTournaments.length) return 0;
    const total = completedTournaments.reduce((s, t) => {
      return s + allRegistrations.filter(r => r.tournament_id === t.id && r.status === 'confirmed').length;
    }, 0);
    return Math.round(total / completedTournaments.length);
  }, [completedTournaments, allRegistrations]);

  const summaryCards = [
    { label: 'Tournaments Completed', value: completedTournaments.length, icon: Trophy, color: 'text-amber-500' },
    { label: 'Unique Players', value: totalUniquePlayers, icon: Users, color: 'text-primary' },
    { label: 'Avg Players / Tournament', value: avgAttendancePerT, icon: BarChart2, color: 'text-blue-500' },
    { label: 'Top Ranked Player', value: topPlayers[0]?.name || '—', icon: Star, color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-800">Tournament Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Performance metrics across all completed tournaments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{c.label}</p>
                  <p className="text-2xl font-bold text-slate-800 truncate">{c.value}</p>
                </div>
                <c.icon className={`h-5 w-5 mt-0.5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance per tournament */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Player Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceData.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">No completed tournament data yet.</p>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={attendanceData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Players']} labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                    <Bar dataKey="players" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        {/* Avg score per tournament */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-500" />Avg Score per Tournament</CardTitle>
          </CardHeader>
          <CardContent>
            {avgScoreData.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">No verified scorecard data yet.</p>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={avgScoreData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [v, 'Avg Score']} labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance frequency breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-blue-500" />Player Attendance Frequency</CardTitle>
          <p className="text-xs text-slate-400">How many tournaments each player has attended</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {attendanceFreq.map(({ label, count }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500 mt-1">{label} tournament{label === '1' ? '' : 's'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top players leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Top Ranked Players Overall</CardTitle>
          <p className="text-xs text-slate-400">Sorted by average finishing rank across all tournaments</p>
        </CardHeader>
        <CardContent>
          {topPlayers.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">No scorecard data yet.</p>
            : (
              <div className="divide-y">
                {topPlayers.map((p, i) => (
                  <div key={p.pid} className="flex items-center gap-4 py-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {i + 1}
                    </span>
                    {p.photo
                      ? <img src={p.photo} alt={p.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                      : <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">{p.name[0]}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.city || '—'}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-xs text-slate-500 shrink-0">
                      <div className="text-center">
                        <p className="font-semibold text-slate-700">{p.tournaments}</p>
                        <p>Tournaments</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-700">#{p.bestRank}</p>
                        <p>Best Rank</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-700">#{p.avgRank.toFixed(1)}</p>
                        <p>Avg Rank</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-700">{p.avgScore}</p>
                        <p>Avg Score</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">Avg #{p.avgRank.toFixed(1)}</Badge>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}