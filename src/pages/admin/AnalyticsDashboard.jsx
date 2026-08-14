import React, { useMemo } from 'react';
import { leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi, leagues as leaguesApi, registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import { format, subDays, parseISO, startOfWeek, isAfter } from 'date-fns';
import { TrendingUp, Users, Trophy, Calendar, DollarSign, BarChart3, CheckCircle2, Activity } from 'lucide-react';

const COLORS = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) { // eslint-disable-line
  const bg = { emerald: 'bg-emerald-50', blue: 'bg-blue-50', purple: 'bg-purple-50', amber: 'bg-amber-50' };
  const text = { emerald: 'text-emerald-700', blue: 'text-blue-600', purple: 'text-purple-600', amber: 'text-amber-600' };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className={`w-10 h-10 rounded-xl ${bg[color]} flex items-center justify-center mb-3`}>
          <Icon className={`h-5 w-5 ${text[color]}`} />
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const { data: tournaments = [] } = useQuery({
    queryKey: ['analytics-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date', limit: 100 }),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['analytics-registrations'],
    queryFn: () => registrationsApi.list({}, { sort: '-created_date', limit: 1000 }),
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['analytics-scorecards'],
    queryFn: () => scoreCardsApi.list({}, { sort: '-created_date', limit: 500 }),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['analytics-leagues'],
    queryFn: () => leaguesApi.list({}, { sort: '-created_date' }),
  });

  const { data: leagueSessions = [] } = useQuery({
    queryKey: ['analytics-league-sessions'],
    queryFn: () => leagueSessionsApi.list({}, { sort: '-date', limit: 200 }),
  });

  const { data: leagueRsvps = [] } = useQuery({
    queryKey: ['analytics-league-rsvps'],
    queryFn: () => leagueRsvpsApi.list({}, { sort: '-created_date', limit: 1000 }),
  });

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const totalRevenue = registrations
    .filter(r => r.payment_status === 'paid')
    .reduce((s, r) => s + (Number(r.payment_amount) || 0), 0) / 100;

  const confirmedPlayers = registrations.filter(r => r.status === 'confirmed').length;
  const verifiedScores = scorecards.filter(s => s.status === 'verified').length;
  const activeTournaments = tournaments.filter(t => ['active', 'registration_open'].includes(t.status)).length;

  // ── Registration trend (last 30 days by week) ────────────────────────────────
  const regTrend = useMemo(() => {
    const weeks = [];
    for (let i = 4; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = subDays(startOfWeek(subDays(new Date(), (i - 1) * 7)), 1);
      const label = format(weekStart, 'MMM d');
      const count = registrations.filter(r => {
        if (!r.created_date) return false;
        const d = parseISO(r.created_date);
        return isAfter(d, weekStart) && !isAfter(d, weekEnd);
      }).length;
      weeks.push({ week: label, registrations: count });
    }
    return weeks;
  }, [registrations]);

  // ── Tournament status breakdown ──────────────────────────────────────────────
  const tournamentStatusData = useMemo(() => {
    const counts = {};
    tournaments.forEach(t => {
      const s = t.status || 'setup';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [tournaments]);

  // ── Score verification funnel per tournament ─────────────────────────────────
  const scoreFunnelData = useMemo(() => {
    return tournaments
      .filter(t => scorecards.some(s => s.tournament_id === t.id))
      .slice(0, 6)
      .map(t => {
        const tc = scorecards.filter(s => s.tournament_id === t.id);
        return {
          name: t.name.length > 16 ? t.name.slice(0, 14) + '…' : t.name,
          Pending: tc.filter(s => s.status === 'pending').length,
          Submitted: tc.filter(s => s.status === 'submitted').length,
          Verified: tc.filter(s => s.status === 'verified').length,
        };
      });
  }, [tournaments, scorecards]);

  // ── Scorecard completion % ────────────────────────────────────────────────────
  const scorecardCompletion = useMemo(() => {
    const total = scorecards.length;
    if (!total) return null;
    const submitted = scorecards.filter(s => s.status === 'submitted').length;
    const verified = scorecards.filter(s => s.status === 'verified').length;
    const completedCount = submitted + verified;
    const pct = Math.round((completedCount / total) * 100);
    const verifiedPct = Math.round((verified / total) * 100);
    return { total, submitted, verified, completedCount, pct, verifiedPct };
  }, [scorecards]);

  // ── Per-round verification lag (awaiting East sign-off) ────────────────────
  const verificationLag = useMemo(() => {
    // Group submitted (awaiting verification) scorecards by round
    const submitted = scorecards.filter(s => s.status === 'submitted');
    const byRound = {};
    submitted.forEach(sc => {
      const key = `Round ${sc.round_number || '?'}`;
      byRound[key] = (byRound[key] || 0) + 1;
    });
    return Object.entries(byRound)
      .map(([round, count]) => ({ round, count }))
      .sort((a, b) => {
        const na = parseInt(a.round.replace('Round ', '')) || 0;
        const nb = parseInt(b.round.replace('Round ', '')) || 0;
        return na - nb;
      });
  }, [scorecards]);

  // ── Payment breakdown (pie) ──────────────────────────────────────────────────
  const paymentData = useMemo(() => {
    const paid = registrations.filter(r => r.payment_status === 'paid').length;
    const pending = registrations.filter(r => r.payment_status === 'pending').length;
    const notRequired = registrations.filter(r => r.payment_status === 'not_required').length;
    return [
      { name: 'Paid', value: paid },
      { name: 'Pending', value: pending },
      { name: 'No Fee', value: notRequired },
    ].filter(d => d.value > 0);
  }, [registrations]);

  // ── Revenue by tournament ────────────────────────────────────────────────────
  const revenueByTournament = useMemo(() => {
    return tournaments
      .map(t => ({
        name: t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name,
        revenue: registrations
          .filter(r => r.tournament_id === t.id && r.payment_status === 'paid')
          .reduce((s, r) => s + (Number(r.payment_amount) || 0), 0) / 100,
      }))
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [tournaments, registrations]);

  // ── League RSVP rates ────────────────────────────────────────────────────────
  const leagueRsvpData = useMemo(() => {
    return leagues.slice(0, 6).map(l => {
      const sessions = leagueSessions.filter(s => s.league_id === l.id);
      const totalRsvps = leagueRsvps.filter(r => r.league_id === l.id && r.status === 'yes').length;
      const avgPerSession = sessions.length > 0 ? (totalRsvps / sessions.length).toFixed(1) : 0;
      return {
        name: l.name.length > 14 ? l.name.slice(0, 12) + '…' : l.name,
        sessions: sessions.length,
        avgAttendance: Number(avgPerSession),
      };
    }).filter(d => d.sessions > 0);
  }, [leagues, leagueSessions, leagueRsvps]);

  // ── Players per tournament (capacity utilization) ────────────────────────────
  const capacityData = useMemo(() => {
    return tournaments
      .filter(t => t.player_cap)
      .slice(0, 8)
      .map(t => {
        const confirmed = registrations.filter(r => r.tournament_id === t.id && r.status === 'confirmed').length;
        const cap = t.player_cap;
        return {
          name: t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name,
          Filled: confirmed,
          Remaining: Math.max(0, cap - confirmed),
        };
      });
  }, [tournaments, registrations]);

  const isLoading = !tournaments.length && !registrations.length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-emerald-700" /> Analytics
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Performance metrics and activity insights across all events</p>
        </div>
        <Link to="/admin" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
          ← Dashboard
        </Link>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Trophy} label="Total Tournaments" value={tournaments.length} sub={`${activeTournaments} currently active`} color="emerald" />
        <StatCard icon={Users} label="Confirmed Players" value={confirmedPlayers} sub={`${registrations.length} total registrations`} color="blue" />
        <StatCard icon={CheckCircle2} label="Verified Scorecards" value={verifiedScores} sub={`of ${scorecards.length} total`} color="purple" />
        <StatCard icon={DollarSign} label="Revenue Collected" value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub="from paid registrations" color="amber" />
      </div>

      {/* Score Health Row */}
      {scorecardCompletion && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Scorecard Completion % */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Scorecard Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-bold text-slate-800">{scorecardCompletion.pct}%</span>
                <span className="text-sm text-slate-500 mb-1">submitted or verified</span>
              </div>
              {/* Progress bar: pending / submitted / verified */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-3">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${scorecardCompletion.verifiedPct}%` }}
                  title={`Verified: ${scorecardCompletion.verified}`}
                />
                <div
                  className="bg-lime-300 h-full transition-all"
                  style={{ width: `${scorecardCompletion.pct - scorecardCompletion.verifiedPct}%` }}
                  title={`Submitted: ${scorecardCompletion.submitted}`}
                />
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Verified: {scorecardCompletion.verified}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-300 inline-block" />Submitted: {scorecardCompletion.submitted}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />Pending: {scorecardCompletion.total - scorecardCompletion.completedCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Per-round verification lag */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" /> Awaiting East Sign-Off (by Round)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationLag.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No scorecards awaiting verification.</p>
              ) : (
                <div className="space-y-2">
                  {verificationLag.map(({ round, count }) => (
                    <div key={round} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-16 shrink-0">{round}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (count / (verificationLag.reduce((m, r) => Math.max(m, r.count), 1))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-8 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 pt-1">Cards submitted by players but not yet verified by East seat</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 1: Registration trend + Tournament status */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Registration Trend (Last 5 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No registrations yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={regTrend}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="registrations" stroke="#16a34a" strokeWidth={2} fill="url(#regGrad)" dot={{ r: 3, fill: '#16a34a' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Tournament Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentStatusData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No tournaments yet</p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={tournamentStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={58} innerRadius={30}>
                      {tournamentStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {tournamentStatusData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-600 capitalize">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Score verification funnel + Payment breakdown */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Score Verification by Tournament
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreFunnelData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No scorecard data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreFunnelData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Pending" stackId="a" fill="#e2e8f0" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Submitted" stackId="a" fill="#86efac" />
                  <Bar dataKey="Verified" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No payment data</p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" cx="50%" cy="50%" outerRadius={58} innerRadius={30}>
                      {paymentData.map((_, i) => <Cell key={i} fill={['#16a34a', '#f59e0b', '#94a3b8'][i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {paymentData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: ['#16a34a', '#f59e0b', '#94a3b8'][i] }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Revenue by tournament */}
      {revenueByTournament.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Revenue by Tournament
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByTournament} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 4: Capacity utilization + League attendance */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {capacityData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4" /> Capacity Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={capacityData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Filled" stackId="a" fill="#16a34a" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Remaining" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {leagueRsvpData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> League Avg. Attendance per Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leagueRsvpData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v, n) => [v, n === 'avgAttendance' ? 'Avg. Attendance' : n]} />
                  <Bar dataKey="avgAttendance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {capacityData.length === 0 && leagueRsvpData.length === 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center text-slate-400 text-sm">
              No capacity or league session data yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}