import React, { useMemo, useState } from 'react';
import { registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { TrendingUp, Users, BarChart2, Trophy, Minus, Globe, Download } from 'lucide-react';
import { useExportPermission } from '@/hooks/useExportPermission';
import ExportButton from '@/components/shared/ExportButton';

const pidKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981',
];

function fmt(v) {
  if (v === undefined || v === null) return '—';
  return v > 0 ? `+${v}` : String(v);
}

function stdDev(vals) {
  if (vals.length < 2) return 0;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.round(Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length));
}

// ─── Single-tournament view ───────────────────────────────────────────────────
function SingleTournamentView({ tournament, scorecards, registrations }) {
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  const numRounds = tournament?.num_rounds || 4;

  const nameMap = useMemo(() => {
    const m = {};
    registrations.forEach(r => { m[r.player_id] = r.player_name || r.player_email || '?'; });
    return m;
  }, [registrations]);

  const { playerStats, roundAvgs } = useMemo(() => {
    const verified = scorecards.filter(s => s.status === 'verified');
    const stats = {};
    verified.forEach(sc => {
      pidKeys.forEach((idKey, idx) => {
        const pid = sc[idKey];
        if (!pid) return;
        const roundTotal = (sc[scoreKeys[idx]] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
        if (!stats[pid]) stats[pid] = { pid, name: nameMap[pid] || 'Player', rounds: {}, total: 0 };
        stats[pid].rounds[sc.round_number] = roundTotal;
        stats[pid].total += roundTotal;
      });
    });
    const arr = Object.values(stats).sort((a, b) => b.total - a.total);
    const roundAvgs = Array.from({ length: numRounds }, (_, i) => {
      const rNum = i + 1;
      const vals = arr.map(p => p.rounds[rNum]).filter(v => v !== undefined);
      return { round: `R${rNum}`, avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null };
    });
    return { playerStats: arr, roundAvgs };
  }, [scorecards, nameMap, numRounds]);

  const trendData = useMemo(() => Array.from({ length: numRounds }, (_, i) => {
    const rNum = i + 1;
    const point = { round: `R${rNum}` };
    playerStats.forEach(p => { point[p.pid] = p.rounds[rNum] ?? null; });
    return point;
  }), [playerStats, numRounds]);

  const consistencyData = useMemo(() => playerStats.map(p => {
    const vals = Object.values(p.rounds);
    return {
      name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
      pid: p.pid,
      stdDev: stdDev(vals),
      avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0,
    };
  }).sort((a, b) => a.stdDev - b.stdDev), [playerStats]);

  const playerA = playerStats.find(p => p.pid === compareA);
  const playerB = playerStats.find(p => p.pid === compareB);

  const h2hData = useMemo(() => {
    if (!playerA || !playerB) return [];
    return Array.from({ length: numRounds }, (_, i) => ({
      round: `R${i + 1}`,
      [playerA.name]: playerA.rounds[i + 1] ?? null,
      [playerB.name]: playerB.rounds[i + 1] ?? null,
    }));
  }, [compareA, compareB, playerStats, numRounds, playerA, playerB]);

  const top5 = playerStats.slice(0, 5);

  if (playerStats.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <BarChart2 className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-slate-500">No verified scores yet for this tournament.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Players Ranked', value: playerStats.length, icon: Users, color: 'text-primary' },
          { label: 'Leader', value: playerStats[0]?.name || '—', icon: Trophy, color: 'text-amber-500' },
          { label: 'Leader Score', value: fmt(playerStats[0]?.total), icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Field Avg R1', value: roundAvgs[0]?.avg !== null ? fmt(roundAvgs[0]?.avg) : '—', icon: BarChart2, color: 'text-blue-500' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{c.label}</p>
                  <p className="text-lg font-bold text-slate-800 truncate">{c.value}</p>
                </div>
                <c.icon className={`h-4 w-4 mt-0.5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Score Trends — Top 5</CardTitle>
          <p className="text-xs text-slate-400">Round-by-round verified scores</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="round" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => [fmt(v), name]} />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 2" />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {top5.map((p, i) => (
                <Line key={p.pid} type="monotone" dataKey={p.pid} name={p.name}
                  stroke={COLORS[i]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Avg/round + Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-blue-500" /> Avg Score per Round</CardTitle>
            <p className="text-xs text-slate-400">Field average across all verified players</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roundAvgs} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [fmt(v), 'Avg Score']} />
                <ReferenceLine y={0} stroke="#e2e8f0" />
                <Bar dataKey="avg" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Minus className="h-4 w-4 text-violet-500" /> Consistency (Std Dev)</CardTitle>
            <p className="text-xs text-slate-400">Lower = more consistent across rounds</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={consistencyData.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => [v, 'Std Dev']} />
                <Bar dataKey="stdDev" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Head-to-head */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-rose-500" /> Head-to-Head</CardTitle>
          <p className="text-xs text-slate-400 mb-3">Compare two players round-by-round</p>
          <div className="flex flex-wrap gap-3">
            <Select value={compareA} onValueChange={v => { setCompareA(v); if (v === compareB) setCompareB(''); }}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Player A" /></SelectTrigger>
              <SelectContent>{playerStats.map(p => <SelectItem key={p.pid} value={p.pid} disabled={p.pid === compareB}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={compareB} onValueChange={v => { setCompareB(v); if (v === compareA) setCompareA(''); }}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Player B" /></SelectTrigger>
              <SelectContent>{playerStats.map(p => <SelectItem key={p.pid} value={p.pid} disabled={p.pid === compareA}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!compareA || !compareB ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">Select two players above</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Total', a: playerA?.total, b: playerB?.total },
                  { label: 'Best Round', a: playerA ? Math.max(...Object.values(playerA.rounds)) : null, b: playerB ? Math.max(...Object.values(playerB.rounds)) : null },
                  { label: 'Worst Round', a: playerA ? Math.min(...Object.values(playerA.rounds)) : null, b: playerB ? Math.min(...Object.values(playerB.rounds)) : null },
                ].map(stat => {
                  const aWins = stat.a !== null && stat.b !== null && stat.a > stat.b;
                  const bWins = stat.a !== null && stat.b !== null && stat.b > stat.a;
                  return (
                    <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                      <div className="flex items-center justify-around">
                        <span className={`text-base font-bold ${aWins ? 'text-emerald-600' : 'text-slate-600'}`}>{fmt(stat.a)}</span>
                        <span className="text-xs text-slate-300">vs</span>
                        <span className={`text-base font-bold ${bWins ? 'text-emerald-600' : 'text-slate-600'}`}>{fmt(stat.b)}</span>
                      </div>
                      <div className="flex justify-around mt-0.5">
                        <span className="text-[10px] text-slate-400 truncate max-w-[60px]">{playerA?.name}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[60px]">{playerB?.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={h2hData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [fmt(v)]} />
                  <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 2" />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey={playerA?.name} stroke={COLORS[0]} strokeWidth={2.5} dot={{ r: 5 }} connectNulls />
                  <Line type="monotone" dataKey={playerB?.name} stroke={COLORS[3]} strokeWidth={2.5} dot={{ r: 5 }} connectNulls strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> All Players — Round Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Player</th>
                  {Array.from({ length: numRounds }, (_, i) => (
                    <th key={i} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 w-14">R{i + 1}</th>
                  ))}
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500">Total</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500">Std Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {playerStats.map((p, idx) => {
                  const sd = stdDev(Object.values(p.rounds));
                  return (
                    <tr key={p.pid} className={idx < 3 ? 'bg-amber-50/30' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                      {Array.from({ length: numRounds }, (_, i) => {
                        const s = p.rounds[i + 1];
                        return (
                          <td key={i} className={`text-center px-3 py-2.5 text-xs font-medium ${s === undefined ? 'text-slate-300' : s < 0 ? 'text-red-500' : s > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {s !== undefined ? fmt(s) : '—'}
                          </td>
                        );
                      })}
                      <td className={`text-center px-4 py-2.5 font-bold ${p.total < 0 ? 'text-red-500' : p.total > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{fmt(p.total)}</td>
                      <td className="text-center px-4 py-2.5 text-xs text-slate-400">{sd}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Community-wide (all tournaments) view ────────────────────────────────────
function CommunityView({ allScorecards, allRegistrations, tournaments }) {
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  // Build global name map from all registrations
  const nameMap = useMemo(() => {
    const m = {};
    allRegistrations.forEach(r => { m[r.player_id] = r.player_name || r.player_email || '?'; });
    return m;
  }, [allRegistrations]);

  const tournamentMap = useMemo(() => {
    const m = {};
    tournaments.forEach(t => { m[t.id] = t; });
    return m;
  }, [tournaments]);

  // Per-player aggregated stats across all verified scorecards
  const playerStats = useMemo(() => {
    const verified = allScorecards.filter(s => s.status === 'verified');
    const stats = {};
    verified.forEach(sc => {
      pidKeys.forEach((idKey, idx) => {
        const pid = sc[idKey];
        if (!pid) return;
        const roundTotal = (sc[scoreKeys[idx]] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
        if (!stats[pid]) stats[pid] = { pid, name: nameMap[pid] || 'Player', totalScore: 0, roundScores: [], tournamentIds: new Set() };
        stats[pid].totalScore += roundTotal;
        stats[pid].roundScores.push(roundTotal);
        stats[pid].tournamentIds.add(sc.tournament_id);
      });
    });
    return Object.values(stats).map(p => ({
      ...p,
      tournaments: p.tournamentIds.size,
      avgScore: p.roundScores.length ? Math.round(p.totalScore / p.roundScores.length) : 0,
      stdDev: stdDev(p.roundScores),
      best: p.roundScores.length ? Math.max(...p.roundScores) : 0,
      worst: p.roundScores.length ? Math.min(...p.roundScores) : 0,
    })).sort((a, b) => b.totalScore - a.totalScore);
  }, [allScorecards, nameMap]);

  // Avg score trend across tournaments (chronological)
  const tournamentTrendData = useMemo(() => {
    const sorted = [...tournaments].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return sorted.map(t => {
      const cards = allScorecards.filter(s => s.status === 'verified' && s.tournament_id === t.id);
      const allScores = [];
      cards.forEach(sc => {
        pidKeys.forEach((idKey, idx) => {
          if (!sc[idKey]) return;
          const rt = (sc[scoreKeys[idx]] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
          allScores.push(rt);
        });
      });
      const avg = allScores.length ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : null;
      const label = t.name.length > 14 ? t.name.slice(0, 14) + '…' : t.name;
      return { tournament: label, avg, players: new Set(cards.flatMap(sc => pidKeys.map(k => sc[k]).filter(Boolean))).size };
    });
  }, [allScorecards, tournaments]);

  const playerA = playerStats.find(p => p.pid === compareA);
  const playerB = playerStats.find(p => p.pid === compareB);

  // H2H across shared tournaments
  const h2hTournaments = useMemo(() => {
    if (!playerA || !playerB) return [];
    const sharedTIds = [...playerA.tournamentIds].filter(id => playerB.tournamentIds.has(id));
    const sorted = [...tournaments]
      .filter(t => sharedTIds.includes(t.id))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return sorted.map(t => {
      const getScore = (p) => {
        const cards = allScorecards.filter(s => s.status === 'verified' && s.tournament_id === t.id);
        let total = 0;
        cards.forEach(sc => {
          pidKeys.forEach((idKey, idx) => {
            if (sc[idKey] === p.pid) total += (sc[scoreKeys[idx]] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
          });
        });
        return total;
      };
      const label = t.name.length > 12 ? t.name.slice(0, 12) + '…' : t.name;
      return { tournament: label, [playerA.name]: getScore(playerA), [playerB.name]: getScore(playerB) };
    });
  }, [compareA, compareB, playerA, playerB, allScorecards, tournaments]);

  if (playerStats.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <Globe className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-slate-500">No verified scores across any tournament yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Players', value: playerStats.length, icon: Users, color: 'text-primary' },
          { label: 'All-Time Leader', value: playerStats[0]?.name || '—', icon: Trophy, color: 'text-amber-500' },
          { label: 'Leader Total', value: fmt(playerStats[0]?.totalScore), icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Tournaments', value: tournaments.length, icon: Globe, color: 'text-blue-500' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{c.label}</p>
                  <p className="text-lg font-bold text-slate-800 truncate">{c.value}</p>
                </div>
                <c.icon className={`h-4 w-4 mt-0.5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Avg field score per tournament */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Avg Field Score per Tournament</CardTitle>
          <p className="text-xs text-slate-400">How scores trend across the community over time</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tournamentTrendData} margin={{ top: 8, right: 16, bottom: 28, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="tournament" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [fmt(v), 'Avg Score']} />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="avg" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 5 }} connectNulls name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Consistency community-wide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Minus className="h-4 w-4 text-violet-500" /> Most Consistent Players</CardTitle>
            <p className="text-xs text-slate-400">Std deviation across all rounds played (lower = better)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={playerStats.slice(0, 10).map(p => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, stdDev: p.stdDev })).sort((a, b) => a.stdDev - b.stdDev)}
                layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => [v, 'Std Dev']} />
                <Bar dataKey="stdDev" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-blue-500" /> Avg Score per Player</CardTitle>
            <p className="text-xs text-slate-400">Top 10 by average round score across all tournaments</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={playerStats.slice(0, 10).map(p => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, avg: p.avgScore }))}
                layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => [fmt(v), 'Avg Score']} />
                <ReferenceLine x={0} stroke="#e2e8f0" />
                <Bar dataKey="avg" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* All-time H2H */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-rose-500" /> All-Time Head-to-Head</CardTitle>
          <p className="text-xs text-slate-400 mb-3">Compare two players across every tournament they've both played</p>
          <div className="flex flex-wrap gap-3">
            <Select value={compareA} onValueChange={v => { setCompareA(v); if (v === compareB) setCompareB(''); }}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Player A" /></SelectTrigger>
              <SelectContent>{playerStats.map(p => <SelectItem key={p.pid} value={p.pid} disabled={p.pid === compareB}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={compareB} onValueChange={v => { setCompareB(v); if (v === compareA) setCompareA(''); }}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Player B" /></SelectTrigger>
              <SelectContent>{playerStats.map(p => <SelectItem key={p.pid} value={p.pid} disabled={p.pid === compareA}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!compareA || !compareB ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">Select two players above</div>
          ) : h2hTournaments.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">These players haven't played in the same tournament yet.</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Total Score', a: playerA?.totalScore, b: playerB?.totalScore },
                  { label: 'Avg per Round', a: playerA?.avgScore, b: playerB?.avgScore },
                  { label: 'Shared Ts', a: [...(playerA?.tournamentIds || [])].filter(id => playerB?.tournamentIds.has(id)).length, b: null },
                ].map(stat => {
                  const aWins = stat.b !== null && stat.a !== null && stat.a > stat.b;
                  const bWins = stat.b !== null && stat.a !== null && stat.b > stat.a;
                  return (
                    <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                      <div className="flex items-center justify-around">
                        <span className={`text-base font-bold ${aWins ? 'text-emerald-600' : 'text-slate-600'}`}>{stat.b === null ? stat.a : fmt(stat.a)}</span>
                        {stat.b !== null && <><span className="text-xs text-slate-300">vs</span><span className={`text-base font-bold ${bWins ? 'text-emerald-600' : 'text-slate-600'}`}>{fmt(stat.b)}</span></>}
                      </div>
                      <div className="flex justify-around mt-0.5">
                        <span className="text-[10px] text-slate-400 truncate max-w-[60px]">{playerA?.name}</span>
                        {stat.b !== null && <span className="text-[10px] text-slate-400 truncate max-w-[60px]">{playerB?.name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={h2hTournaments} margin={{ top: 8, right: 16, bottom: 28, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="tournament" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [fmt(v)]} />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={playerA?.name} fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey={playerB?.name} fill={COLORS[3]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community leaderboard table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Community Rankings</CardTitle>
          <p className="text-xs text-slate-400">All-time stats across every tournament</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Player</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">Ts</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">Rounds</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">Avg/Round</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">Best</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">Worst</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500">Std Dev</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {playerStats.map((p, idx) => (
                  <tr key={p.pid} className={idx < 3 ? 'bg-amber-50/30' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                    <td className="text-center px-3 py-2.5 text-xs text-slate-500">{p.tournaments}</td>
                    <td className="text-center px-3 py-2.5 text-xs text-slate-500">{p.roundScores.length}</td>
                    <td className={`text-center px-3 py-2.5 text-xs font-medium ${p.avgScore < 0 ? 'text-red-500' : p.avgScore > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{fmt(p.avgScore)}</td>
                    <td className="text-center px-3 py-2.5 text-xs text-emerald-600 font-medium">{fmt(p.best)}</td>
                    <td className="text-center px-3 py-2.5 text-xs text-red-400 font-medium">{fmt(p.worst)}</td>
                    <td className="text-center px-3 py-2.5 text-xs text-slate-400">{p.stdDev}</td>
                    <td className={`text-center px-4 py-2.5 font-bold ${p.totalScore < 0 ? 'text-red-500' : p.totalScore > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{fmt(p.totalScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlayerPerformance() {
  const [mode, setMode] = useState('tournament'); // 'tournament' | 'community'
  const [tournamentId, setTournamentId] = useState('');

  const { data: tournaments = [] } = useQuery({
    queryKey: ['perf-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date' }),
  });

  const activeTournament = tournaments.find(t => t.status === 'active');
  const selectedId = tournamentId || activeTournament?.id || tournaments[0]?.id;
  const tournament = tournaments.find(t => t.id === selectedId);

  const { data: registrations = [] } = useQuery({
    queryKey: ['perf-registrations', selectedId],
    queryFn: () => registrationsApi.filter({ tournament_id: selectedId }),
    enabled: !!selectedId && mode === 'tournament',
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['perf-scorecards', selectedId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: selectedId }),
    enabled: !!selectedId && mode === 'tournament',
    refetchInterval: 30000,
  });

  const { data: allRegistrations = [] } = useQuery({
    queryKey: ['perf-all-registrations'],
    queryFn: () => registrationsApi.list(),
    enabled: mode === 'community',
  });

  const { data: allScorecards = [] } = useQuery({
    queryKey: ['perf-all-scorecards'],
    queryFn: () => scoreCardsApi.filter({ status: 'verified' }),
    enabled: mode === 'community',
    refetchInterval: 60000,
  });

  const handleExport = () => {
    const headers = ['Player Name', 'Total Score', 'Avg Score'];
    let rows = [];

    if (mode === 'tournament') {
      const verified = scorecards.filter(s => s.status === 'verified');
      const nameMap = {};
      registrations.forEach(r => {
        nameMap[r.player_id] = r.player_name || r.player_email || '?';
      });

      const stats = {};
      verified.forEach(sc => {
        const pidKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
        const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
        pidKeys.forEach((idKey, idx) => {
          const pid = sc[idKey];
          if (!pid) return;
          const roundTotal = (sc[scoreKeys[idx]] || []).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
          if (!stats[pid]) stats[pid] = { name: nameMap[pid] || 'Player', total: 0, count: 0 };
          stats[pid].total += roundTotal;
          stats[pid].count += 1;
        });
      });

      rows = Object.values(stats).map(p => [
        p.name,
        String(p.total),
        String(Math.round(p.total / p.count)),
      ]);
    }

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
     <div className="space-y-6">
       {/* Header + mode switcher */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h1 className="text-2xl font-heading font-bold text-slate-800">Player Performance</h1>
           <p className="text-slate-500 text-sm mt-0.5">Trends, consistency & head-to-head analysis</p>
         </div>
         <div className="flex items-center gap-2 flex-wrap">
           <ExportButton onClick={handleExport} label="Export CSV" variant="outline" disabled={mode !== 'tournament'} />
           <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
             <button
               onClick={() => setMode('tournament')}
               className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'tournament' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
             >
               Single Tournament
             </button>
             <button
               onClick={() => setMode('community')}
               className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${mode === 'community' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
             >
               <Globe className="h-3.5 w-3.5" /> All Tournaments
             </button>
           </div>

          {mode === 'tournament' && (
            <Select value={selectedId || ''} onValueChange={setTournamentId}>
              <SelectTrigger className="w-52 bg-white">
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.status === 'active' && <span className="ml-1 text-xs text-green-600">● Live</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {mode === 'tournament' ? (
        <SingleTournamentView
          tournament={tournament}
          scorecards={scorecards}
          registrations={registrations}
        />
      ) : (
        <CommunityView
          allScorecards={allScorecards}
          allRegistrations={allRegistrations}
          tournaments={tournaments}
        />
      )}
    </div>
  );
}