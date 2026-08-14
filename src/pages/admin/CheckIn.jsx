import React, { useState, useEffect } from 'react';
import { registrations as registrationsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Circle, Search, Users, UserCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { isTournamentCheckInAllowed } from '@/lib/tournament-status';
import NameTagPrintButton from '@/components/print/NameTagPrintButton';

export default function CheckIn() {
  const queryClient = useQueryClient();
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [search, setSearch] = useState('');

  const { data: tournaments = [] } = useQuery({
    queryKey: ['checkin-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-date' }),
  });

  // Default to first active tournament
  React.useEffect(() => {
    if (!selectedTournamentId && tournaments.length > 0) {
      const active = tournaments.find(t => t.status === 'active');
      setSelectedTournamentId((active || tournaments[0]).id);
    }
  }, [tournaments, selectedTournamentId]);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['checkin-registrations', selectedTournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: selectedTournamentId }),
    enabled: !!selectedTournamentId,
    refetchInterval: 10000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['checkin-assignments', selectedTournamentId],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: selectedTournamentId }),
    enabled: !!selectedTournamentId,
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, checked_in }) =>
      registrationsApi.update(id, {
        checked_in,
        checked_in_at: checked_in ? new Date().toISOString() : null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkin-registrations', selectedTournamentId] }),
  });

  const confirmed = registrations.filter(r => r.status === 'confirmed');
  const checkedInCount = confirmed.filter(r => r.checked_in).length;
  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
  const canModifyCheckIn = isTournamentCheckInAllowed(selectedTournament);

  const getTableForPlayer = (playerId) => {
    // Get the first-round assignment for the player
    const assignment = assignments.find(
      a => a.round_number === 1 && (
        a.player1_id === playerId ||
        a.player2_id === playerId ||
        a.player3_id === playerId ||
        a.player4_id === playerId
      )
    );
    return assignment?.table_number ?? null;
  };

  const filtered = confirmed.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.player_name || '').toLowerCase().includes(q) ||
      (r.player_email || '').toLowerCase().includes(q)
    );
  });

  // Sort: not checked in first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.checked_in !== b.checked_in) return a.checked_in ? 1 : -1;
    return (a.player_name || '').localeCompare(b.player_name || '');
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Player Check-In</h1>
          <p className="text-slate-500 text-sm mt-1">Mark players as present when they arrive</p>
        </div>
        <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
          <SelectTrigger className="w-64 bg-white shadow-sm">
            <SelectValue placeholder="Select tournament…" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!canModifyCheckIn && selectedTournament && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
          Check-in can be modified only while the tournament is <strong>active</strong>.
          <span className="block text-xs text-amber-700 mt-1 capitalize">
            Current status: {selectedTournament.status.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Check-in progress</span>
            <span>{checkedInCount} / {confirmed.length} ({Math.round((checkedInCount / confirmed.length) * 100)}%)</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${confirmed.length > 0 ? (checkedInCount / confirmed.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search players…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Player list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No confirmed players found</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sorted.map(reg => {
                const table = getTableForPlayer(reg.player_id);
                return (
                  <div
                    key={reg.id}
                    className={`flex items-center justify-between px-5 py-4 transition-colors ${
                      reg.checked_in ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
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
                        <div className="flex items-center gap-2 mt-0.5">
                          {reg.flight && (
                            <span className="text-[11px] text-slate-400">Flight {reg.flight}</span>
                          )}
                          {table && (
                            <span className="text-[11px] text-slate-400">· Table {table} (R1)</span>
                          )}
                          {reg.checked_in && reg.checked_in_at && (
                            <span className="text-[11px] text-emerald-600">
                              · Checked in {format(new Date(reg.checked_in_at), 'h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <NameTagPrintButton
                        playerName={reg.player_name}
                        table={table}
                        flight={reg.flight}
                        donatedSetTable={reg.borrowed_set_table_number}
                        tournamentName={selectedTournament?.name}
                      />
                      <Button
                        size="sm"
                        variant={reg.checked_in ? 'default' : 'outline'}
                        className={`gap-2 ${
                          reg.checked_in
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0'
                            : 'border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
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