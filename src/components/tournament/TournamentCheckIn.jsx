import React, { useState } from 'react';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Circle, Search, Users, UserCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { isTournamentCheckInAllowed } from '@/lib/tournament-status';

export default function TournamentCheckIn({ tournamentId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'checked_in' | 'not_yet'

  const { data: tournament } = useQuery({
    queryKey: ['checkin-tournament', tournamentId],
    queryFn: () => tournamentsApi.filter({ id: tournamentId }).then(r => r[0]),
    enabled: !!tournamentId,
  });

  const canModifyCheckIn = isTournamentCheckInAllowed(tournament);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['checkin-registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 10000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['checkin-assignments', tournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, checked_in }) =>
      registrationsApi.update(id, {
        checked_in,
        checked_in_at: checked_in ? new Date().toISOString() : null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkin-registrations', tournamentId] }),
  });

  const confirmed = registrations.filter(r => r.status === 'confirmed');
  const checkedInCount = confirmed.filter(r => r.checked_in).length;

  const WINDS = ['E', 'S', 'W', 'N']; // player1=East, player2=South, player3=West, player4=North

  const getAssignmentsForPlayer = (playerId) => {
    const rounds = {};
    assignments.forEach(a => {
      const seatIndex = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].indexOf(playerId);
      if (seatIndex !== -1) {
        rounds[a.round_number] = { table: a.table_number, wind: WINDS[seatIndex] };
      }
    });
    return rounds; // { 1: {table, wind}, 2: {table, wind}, ... }
  };

  const filtered = confirmed.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      (r.player_name || '').toLowerCase().includes(q) ||
      (r.player_email || '').toLowerCase().includes(q);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'checked_in' && r.checked_in) ||
      (filter === 'not_yet' && !r.checked_in);
    return matchesSearch && matchesFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.checked_in !== b.checked_in) return a.checked_in ? 1 : -1;
    return (a.player_name || '').localeCompare(b.player_name || '');
  });

  return (
    <div className="space-y-5">
      {!canModifyCheckIn && tournament && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Check-in can be modified only while the tournament is <strong>active</strong>.
          {tournament.status !== 'active' && (
            <span className="block text-xs text-amber-700 mt-1 capitalize">
              Current status: {tournament.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{confirmed.length}</p>
                <p className="text-xs text-slate-500">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{checkedInCount}</p>
                <p className="text-xs text-slate-500">Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{confirmed.length - checkedInCount}</p>
                <p className="text-xs text-slate-500">Not Yet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {confirmed.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Check-in progress</span>
            <span>{checkedInCount} / {confirmed.length} ({Math.round((checkedInCount / confirmed.length) * 100)}%)</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(checkedInCount / confirmed.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search players by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="not_yet">Not Yet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Player list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {search || filter !== 'all' ? 'No players match your filters' : 'No confirmed players yet'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sorted.map(reg => {
                const roundAssignments = getAssignmentsForPlayer(reg.player_id);
                const roundNums = Object.keys(roundAssignments).map(Number).sort();
                return (
                  <div
                    key={reg.id}
                    className={`flex items-center justify-between px-5 py-4 transition-colors ${
                      reg.checked_in ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                        reg.checked_in ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {(reg.player_name || reg.player_email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{reg.player_name || reg.player_email}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {roundNums.map(r => (
                            <span key={r} className="flex-shrink-0 text-[11px] font-semibold bg-slate-800 text-white px-1.5 py-0.5 rounded">
                              R{r}: T{roundAssignments[r].table} ({roundAssignments[r].wind})
                            </span>
                          ))}
                          {roundNums.length === 0 && (
                            <span className="text-[11px] text-slate-400">No table assigned</span>
                          )}
                          {reg.flight && (
                            <span className="text-[11px] text-slate-400 ml-1">· Flight {reg.flight}</span>
                          )}
                          {reg.checked_in && reg.checked_in_at && (
                            <span className="text-[11px] text-emerald-600">
                              · ✓ {format(new Date(reg.checked_in_at), 'h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className={`gap-1.5 flex-shrink-0 ml-3 ${
                        reg.checked_in
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0'
                          : 'bg-white border border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                      onClick={() => canModifyCheckIn && checkInMutation.mutate({ id: reg.id, checked_in: !reg.checked_in })}
                      disabled={checkInMutation.isPending || !canModifyCheckIn}
                    >
                      {reg.checked_in ? (
                        <><CheckCircle2 className="h-4 w-4" /> Checked In</>
                      ) : (
                        <><Circle className="h-4 w-4" /> Check In</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}