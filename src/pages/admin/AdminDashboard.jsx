import React, { useState } from 'react';
import { leagueRsvps as leagueRsvpsApi, leagueSessions as leagueSessionsApi, leagues as leaguesApi, players as playersApi, registrations as registrationsApi, scoreCards as scoreCardsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Grid3X3, ClipboardList,
  Clock, CheckCircle2, AlertCircle, ArrowRight, Activity,
  DollarSign, CreditCard, Hourglass, ListOrdered, ChevronDown,
  MapPin, CalendarDays, BarChart3, Layers, Star, Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/lib/AuthContext';
import SubscriptionInfoBar from '@/components/admin/SubscriptionInfoBar';

const statusColors = {
  setup: 'bg-slate-100 text-slate-600',
  registration_open: 'bg-blue-100 text-blue-700',
  registration_closed: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedTournamentId, setSelectedTournamentId] = useState('__all__');
  const { orgFilter } = useOrganization();
  const { user } = useAuth();

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => tournamentsApi.filter(orgFilter(), '-created_date'),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['admin-registrations-dashboard'],
    queryFn: () => registrationsApi.filter(orgFilter(), '-created_date', 500),
    refetchInterval: 30000,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['admin-scorecards'],
    queryFn: () => scoreCardsApi.filter(orgFilter(), '-created_date', 200),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['admin-assignments'],
    queryFn: () => tableAssignmentsApi.filter(orgFilter(), '-created_date', 200),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['admin-players-dashboard'],
    queryFn: () => playersApi.filter(orgFilter(), '-created_date', 200),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-leagues-dashboard'],
    queryFn: () => leaguesApi.filter(orgFilter(), '-created_date'),
  });

  const { data: leagueSessions = [] } = useQuery({
    queryKey: ['admin-league-sessions-dashboard'],
    queryFn: () => leagueSessionsApi.filter(orgFilter(), '-date', 50),
  });

  const { data: leagueRsvps = [] } = useQuery({
    queryKey: ['admin-league-rsvps-dashboard'],
    queryFn: () => leagueRsvpsApi.filter(orgFilter(), '-created_date', 200),
  });

  const selectedTournament = selectedTournamentId === '__all__'
    ? null
    : tournaments.find(t => t.id === selectedTournamentId);

  // Scoped data
  const scopedRegistrations = selectedTournamentId === '__all__'
    ? registrations
    : registrations.filter(r => r.tournament_id === selectedTournamentId);

  const scopedScorecards = selectedTournamentId === '__all__'
    ? scorecards
    : scorecards.filter(s => s.tournament_id === selectedTournamentId);

  const scopedAssignments = selectedTournamentId === '__all__'
    ? assignments
    : assignments.filter(a => a.tournament_id === selectedTournamentId);

  // Registration stats
  const confirmedCount = scopedRegistrations.filter(r => r.status === 'confirmed').length;
  const waitlistedCount = scopedRegistrations.filter(r => r.status === 'waitlisted').length;
  const pendingRegCount = scopedRegistrations.filter(r => r.status === 'pending').length;
  const paidCount = scopedRegistrations.filter(r => r.payment_status === 'paid').length;
  const paymentPendingCount = scopedRegistrations.filter(r => r.payment_status === 'pending').length;
  const totalRevenueCents = scopedRegistrations
    .filter(r => r.payment_status === 'paid')
    .reduce((sum, r) => sum + (Number(r.payment_amount) || 0), 0);

  // Scorecard stats
  const pendingScores = scopedScorecards.filter(s => s.status === 'pending').length;
  const submittedScores = scopedScorecards.filter(s => s.status === 'submitted').length;
  const verifiedScores = scopedScorecards.filter(s => s.status === 'verified').length;

  const paymentChartData = [
    { name: 'Paid', value: paidCount, color: '#16a34a' },
    { name: 'Pending', value: paymentPendingCount, color: '#6ee7b7' },
    { name: 'No Payment', value: scopedRegistrations.filter(r => r.payment_status === 'not_required').length, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const scoreProgress = scopedScorecards.length > 0
    ? Math.round((verifiedScores / scopedScorecards.length) * 100)
    : 0;

  // For leaderboard in tournament-scoped view
  const scopedPlayers = selectedTournament
    ? players.filter(p => {
        const reg = registrations.find(r => r.tournament_id === selectedTournamentId && r.player_id === p.id);
        return !!reg;
      })
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">
            {selectedTournament ? selectedTournament.name : 'Admin Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {selectedTournament
              ? `${selectedTournament.date ? format(new Date(selectedTournament.date), 'MMM d, yyyy') : ''} ${selectedTournament.location ? '· ' + selectedTournament.location : ''}`
              : 'Analytics across all tournaments'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SubscriptionInfoBar user={user} />
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
            <SelectTrigger className="w-64 bg-white shadow-sm">
              <SelectValue placeholder="Select tournament…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" /> All Tournaments
                </span>
              </SelectItem>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTournament && (
            <Link
              to={`/admin/tournament/${selectedTournamentId}`}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 whitespace-nowrap"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Tournament status banner (when one selected) */}
      {selectedTournament && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Badge className={`${statusColors[selectedTournament.status] || statusColors.setup} text-sm px-3 py-1`}>
            {selectedTournament.status?.replace(/_/g, ' ') || 'setup'}
          </Badge>
          {selectedTournament.num_rounds && (
            <Badge variant="outline" className="text-sm px-3 py-1">{selectedTournament.num_rounds} rounds</Badge>
          )}
          {(selectedTournament.flights || []).map(f => (
            <Badge key={f} variant="outline" className="text-sm px-3 py-1">Flight {f}</Badge>
          ))}
          {selectedTournament.player_cap && (
            <Badge variant="outline" className="text-sm px-3 py-1">{confirmedCount} / {selectedTournament.player_cap} capacity</Badge>
          )}
        </div>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {selectedTournamentId === '__all__' ? (
          <>
            <Link to="/admin/tournaments">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                    <Trophy className="h-5 w-5 text-emerald-700" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{tournaments.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Total Tournaments</p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 group-hover:text-slate-600">Manage <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/admin/registrations">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{confirmedCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Confirmed Players</p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 group-hover:text-slate-600">Manage <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/admin/tables">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                    <Grid3X3 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{scopedAssignments.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Table Assignments</p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 group-hover:text-slate-600">Manage <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/admin/scores">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                    <ClipboardList className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{scopedScorecards.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Score Cards</p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 group-hover:text-slate-600">Manage <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            </Link>
          </>
        ) : (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/registrations?tournament=${selectedTournamentId}`)}>
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{confirmedCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Confirmed Players</p>
                <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 group-hover:text-slate-600">View registrations <ArrowRight className="h-3 w-3" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                  <ListOrdered className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{waitlistedCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">On Waitlist</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/tables?tournament=${selectedTournamentId}`)}>
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <Grid3X3 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{scopedAssignments.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Table Assignments</p>
                <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">View tables <ArrowRight className="h-3 w-3" /></div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/scores?tournament=${selectedTournamentId}`)}>
              <CardContent className="pt-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{scopedScorecards.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Score Cards</p>
                <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">View scores <ArrowRight className="h-3 w-3" /></div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue & Score Progress */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800">${(totalRevenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-0.5">Revenue Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{paidCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Payments Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <Hourglass className="h-5 w-5 text-emerald-700" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{paymentPendingCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Payments Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{scoreProgress}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Scores Verified</p>
            {scopedScorecards.length > 0 && (
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${scoreProgress}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scopedRegistrations.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No registrations yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={paymentChartData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={38}>
                      {paymentChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {paymentChartData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-slate-600 flex-1">{d.name}</span>
                      <span className="text-xs font-semibold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                    <span className="text-slate-500">Confirmed players</span>
                    <span className="font-semibold text-slate-700">{confirmedCount}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Card Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4" /> Score Card Status
              </CardTitle>
              <Link
                to={selectedTournamentId !== '__all__' ? `/admin/scores?tournament=${selectedTournamentId}` : '/admin/scores'}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pending', value: pendingScores, icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100' },
                { label: 'Awaiting Verify', value: submittedScores, icon: AlertCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Verified', value: verifiedScores, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-tournament capacity (all view) or registrations detail (scoped view) */}
      {selectedTournamentId === '__all__' ? (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Capacity by Tournament */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Capacity by Tournament
                </CardTitle>
                <Link to="/admin/registrations" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No tournaments yet</p>
              ) : (
                <div className="space-y-3">
                  {tournaments.slice(0, 6).map(t => {
                    const tRegs = registrations.filter(r => r.tournament_id === t.id);
                    const active = tRegs.filter(r => ['pending', 'confirmed'].includes(r.status)).length;
                    const waitlisted = tRegs.filter(r => r.status === 'waitlisted').length;
                    const cap = t.player_cap;
                    const fillPct = cap ? Math.min(100, Math.round((active / cap) * 100)) : null;
                    const tRevenue = tRegs.filter(r => r.payment_status === 'paid').reduce((s, r) => s + (Number(r.payment_amount) || 0), 0);
                    return (
                      <div
                        key={t.id}
                        className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setSelectedTournamentId(t.id)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-slate-700 truncate flex-1">{t.name}</p>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {tRevenue > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-600">${(tRevenue / 100).toFixed(0)}</span>
                            )}
                            {waitlisted > 0 && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{waitlisted} waitlisted</span>
                            )}
                            <Badge className={`text-[10px] ${statusColors[t.status] || statusColors.setup}`}>
                              {t.status || 'setup'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cap ? (
                            <>
                              <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-red-500' : fillPct >= 75 ? 'bg-green-400' : 'bg-emerald-500'}`}
                                  style={{ width: `${fillPct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-500 flex-shrink-0">{active}/{cap}</span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500">{active} registered · no cap</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Tournaments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Active Tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournaments.filter(t => t.status === 'active').length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No active tournaments</p>
              ) : (
                <div className="space-y-3">
                  {tournaments.filter(t => t.status === 'active').map(t => {
                    const tScores = scorecards.filter(s => s.tournament_id === t.id);
                    const verified = tScores.filter(s => s.status === 'verified').length;
                    const tRegs = registrations.filter(r => r.tournament_id === t.id && r.status === 'confirmed').length;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setSelectedTournamentId(t.id)}
                      >
                        <div>
                          <p className="font-semibold text-sm text-slate-700">{t.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {t.date && format(new Date(t.date), 'MMM d, yyyy')} · {tRegs} players
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>
                          <p className="text-[10px] text-slate-400 mt-1">{verified}/{tScores.length} verified</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Tournament-scoped: Registration breakdown + quick actions */
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4" /> Registration Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {[
                  { label: 'Confirmed', value: confirmedCount, color: 'bg-emerald-100 text-emerald-700' },
                  { label: 'Pending', value: pendingRegCount, color: 'bg-slate-100 text-slate-600' },
                  { label: 'Waitlisted', value: waitlistedCount, color: 'bg-emerald-100 text-emerald-700' },
                  { label: 'Declined', value: scopedRegistrations.filter(r => r.status === 'declined').length, color: 'bg-red-100 text-red-600' },
                  { label: 'Cancelled', value: scopedRegistrations.filter(r => r.status === 'cancelled').length, color: 'bg-slate-100 text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{s.label}</span>
                    <Badge className={s.color}>{s.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Manage Registrations', icon: Users, to: `/admin/registrations?tournament=${selectedTournamentId}`, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { label: 'Table Assignments', icon: Grid3X3, to: `/admin/tables?tournament=${selectedTournamentId}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { label: 'Score Administration', icon: ClipboardList, to: `/admin/scores?tournament=${selectedTournamentId}`, color: 'bg-purple-50 text-purple-700 border-purple-100' },
                  { label: 'Tournament Settings', icon: Trophy, to: `/admin/tournament/${selectedTournamentId}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                ].map(action => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={`flex items-center gap-3 p-4 rounded-xl border ${action.color} hover:opacity-80 transition-opacity`}
                  >
                    <action.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard (only in tournament-scoped view and only if there are verified scores) */}
      {selectedTournament && verifiedScores > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600" /> Current Standings
            </h2>
            <Link
              to={`/leaderboard?tournament=${selectedTournamentId}`}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              Full leaderboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <LeaderboardTable
            tournament={selectedTournament}
            players={scopedPlayers}
            scorecards={scopedScorecards}
          />
        </div>
      )}

      {/* Leagues Section (all view only) */}
      {selectedTournamentId === '__all__' && leagues.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Active Leagues
              </CardTitle>
              <Link to="/admin/leagues" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leagues.filter(l => l.status === 'active').map(league => {
                const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const today = new Date();
                const upcomingSessions = leagueSessions
                  .filter(s => s.league_id === league.id && new Date(s.date + 'T12:00:00') >= today)
                  .sort((a, b) => new Date(a.date) - new Date(b.date));
                const nextSession = upcomingSessions[0];
                const members = leagueRsvps.filter(r => r.league_id === league.id);
                const nextRsvps = nextSession ? leagueRsvps.filter(r => r.session_id === nextSession.id) : [];
                const attending = nextRsvps.filter(r => r.status === 'yes').length;
                const waitlisted = nextRsvps.filter(r => r.status === 'waitlist').length;

                return (
                  <Link key={league.id} to={`/admin/leagues/${league.id}`} className="block">
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-slate-800">{league.name}</p>
                          {league.day_of_week != null && (
                            <span className="text-xs text-slate-400">{DAY_NAMES[league.day_of_week]}s · {league.start_time}</span>
                          )}
                        </div>
                        {nextSession ? (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Next: {format(new Date(nextSession.date + 'T12:00:00'), 'MMM d')}
                            {nextSession.invite_sent ? ` · ${attending} attending` : ' · Invites not sent'}
                            {waitlisted > 0 && <span className="text-amber-600"> · {waitlisted} waitlisted</span>}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">No upcoming sessions</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {league.player_cap && nextSession && (
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.round((attending / league.player_cap) * 100))}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">{attending}/{league.player_cap}</span>
                          </div>
                        )}
                        <ArrowRight className="h-4 w-4 text-slate-300 ml-auto mt-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tournaments table (all view only) */}
      {selectedTournamentId === '__all__' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">All Tournaments</CardTitle>
              <Link to="/admin/tournaments" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Players</th>
                    <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map(t => {
                    const tRegs = registrations.filter(r => r.tournament_id === t.id && r.status === 'confirmed').length;
                    const tScores = scorecards.filter(s => s.tournament_id === t.id);
                    const tVerified = tScores.filter(s => s.status === 'verified').length;
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTournamentId(t.id)}
                      >
                        <td className="py-3 font-medium text-slate-700">{t.name}</td>
                        <td className="py-3 text-slate-500">{t.date ? format(new Date(t.date), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3">
                          <Badge className={statusColors[t.status] || statusColors.setup}>
                            {t.status?.replace(/_/g, ' ') || 'setup'}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-500">{tRegs} confirmed</td>
                        <td className="py-3 text-slate-500">
                          {tScores.length > 0 ? `${tVerified}/${tScores.length} verified` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {tournaments.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No tournaments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}