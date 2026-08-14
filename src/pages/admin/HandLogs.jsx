import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { handLogs as handLogsApi, leagues as leaguesApi, tournaments as tournamentsApi } from '@/services/resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, Target, Search, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import BackButton from '@/components/shared/BackButton';
import { CATEGORIES } from '@/lib/card-constants';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Hands' },
  { value: 'Won', label: 'Won Only' },
  { value: 'Attempted', label: 'Attempted Only' },
];

export default function HandLogs() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [playerSearch, setPlayerSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['hand-logs-admin'],
    queryFn: () => handLogsApi.filter({}, '-created_date', 500),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments-for-hands'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date', limit: 100 }),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-leagues-for-hands'],
    queryFn: () => leaguesApi.list({}, { sort: '-created_date', limit: 100 }),
  });

  const tournamentMap = useMemo(() => {
    const m = new Map();
    tournaments.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [tournaments]);

  const leagueMap = useMemo(() => {
    const m = new Map();
    leagues.forEach((l) => m.set(l.id, l.name));
    return m;
  }, [leagues]);

  const availableYears = useMemo(
    () => Array.from(new Set(logs.map((l) => l.card_year).filter(Boolean))).sort((a, b) => b - a),
    [logs],
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (statusFilter !== 'all' && log.hand_status !== statusFilter) return false;
        if (yearFilter !== 'all' && String(log.card_year) !== yearFilter) return false;
        if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
        if (playerSearch.trim()) {
          const q = playerSearch.trim().toLowerCase();
          const name = (log.player_name || '').toLowerCase();
          const email = (log.player_email || '').toLowerCase();
          if (!name.includes(q) && !email.includes(q)) return false;
        }
        return true;
      }),
    [logs, statusFilter, yearFilter, categoryFilter, playerSearch],
  );

  const wonCount = filteredLogs.filter((l) => l.hand_status === 'Won').length;
  const attemptedCount = filteredLogs.filter((l) => l.hand_status === 'Attempted').length;

  return (
    <div>
      <PageHeader
        title="Hand Logs"
        subtitle="View all logged winning and attempted hands"
        actions={<BackButton fallbackPath="/admin" />}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-5 h-5 mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold">{wonCount}</p>
              <p className="text-xs text-muted-foreground">Won</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <p className="text-2xl font-bold">{attemptedCount}</p>
              <p className="text-xs text-muted-foreground">Attempted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Card Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Search Player</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Name or email"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No hand logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-3 font-medium">Player</th>
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 font-medium">Line</th>
                      <th className="p-3 font-medium">Win Type</th>
                      <th className="p-3 font-medium">Points</th>
                      <th className="p-3 font-medium">Concealed</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Context</th>
                      <th className="p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium">{log.player_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{log.player_email || ''}</p>
                        </td>
                        <td className="p-3">
                          {log.special_hand_name ? (
                            <span className="text-primary font-medium">(Special) {log.special_hand_name}</span>
                          ) : (
                            log.category || '—'
                          )}
                        </td>
                        <td className="p-3">
                          {log.special_hand_id ? '—' : log.line}
                        </td>
                        <td className="p-3">{log.win_type || '—'}</td>
                        <td className="p-3 font-semibold">{log.points ?? 0}</td>
                        <td className="p-3">
                          {log.concealed === true ? (
                            <Badge>Concealed</Badge>
                          ) : log.concealed === false ? (
                            <Badge variant="outline">Exposed</Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={log.hand_status === 'Won' ? 'default' : 'secondary'}>
                            {log.hand_status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">
                          {log.tournament_id && (log.tournament_name || tournamentMap.get(log.tournament_id)) && (
                            <span className="block truncate max-w-[120px]">🏆 {log.tournament_name || tournamentMap.get(log.tournament_id)}</span>
                          )}
                          {log.league_id && (log.league_name || leagueMap.get(log.league_id)) && (
                            <span className="block truncate max-w-[120px]">👥 {log.league_name || leagueMap.get(log.league_id)}</span>
                          )}
                          {!log.tournament_id && !log.league_id && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}