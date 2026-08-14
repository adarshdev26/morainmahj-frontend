import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callAction } from '@/services/actions';
import { cardHands as cardHandsApi, matchResults as matchResultsApi, registrations as registrationsApi, tableAssignments as tableAssignmentsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import { ShieldCheck, Clock, AlertTriangle, Check, Send, Loader2, Grid3x3, ClipboardList, Gavel } from 'lucide-react';
import { CATEGORIES, WIN_TYPES, lineLabel } from '@/lib/card-constants';

const STATUS_CONFIG = {
  pending_approval: { label: 'Pending', className: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700', icon: Check },
  disputed: { label: 'Disputed', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
  finalized: { label: 'Finalized', className: 'bg-primary/15 text-primary', icon: ShieldCheck },
  auto_approved: { label: 'Auto-Approved', className: 'bg-blue-100 text-blue-700', icon: Clock },
};

export default function MatchResults() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterTournament, setFilterTournament] = useState('all');
  const [filterRound, setFilterRound] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [finalizing, setFinalizing] = useState(null);

  // Bulk entry state
  const [bulkTournament, setBulkTournament] = useState('all');
  const [bulkRound, setBulkRound] = useState('1');
  const [bulkRows, setBulkRows] = useState({});

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments-mr'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: matchResults = [], isLoading } = useQuery({
    queryKey: ['admin-match-results'],
    queryFn: () => matchResultsApi.list({}, { sort: '-submitted_at', limit: 500 }),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['admin-assignments-mr', bulkTournament],
    queryFn: () => tableAssignmentsApi.filter({ tournament_id: bulkTournament }),
    enabled: bulkTournament !== 'all',
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['admin-regs-mr', bulkTournament],
    queryFn: () => registrationsApi.filter({ tournament_id: bulkTournament }),
    enabled: bulkTournament !== 'all',
  });

  const { data: cardHands = [] } = useQuery({
    queryKey: ['admin-card-hands-mr'],
    queryFn: () => cardHandsApi.list({}, { sort: 'position', limit: 500 }),
  });

  const nameFor = (pid) => registrations.find((r) => r.player_id === pid)?.player_name || '—';
  const tourName = (id) => tournaments.find((t) => t.id === id)?.name || '—';

  const filtered = matchResults.filter((r) => {
    const mt = filterTournament === 'all' || r.tournament_id === filterTournament;
    const mr = filterRound === 'all' || String(r.round_number) === filterRound;
    const ms = filterStatus === 'all' || r.status === filterStatus;
    return mt && mr && ms;
  });

  const rounds = [...new Set(matchResults.map((r) => r.round_number))].sort();

  const finalizeMutation = useMutation({
    mutationFn: ({ id }) => callAction('finalizeMatchResult', { match_result_id: id }),
    onSuccess: (data) => {
      if (data?.error) {
        toast({ title: 'Cannot finalize', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: '✅ Result Finalized', description: 'The match result is now final.' });
      queryClient.invalidateQueries({ queryKey: ['admin-match-results'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  const handleFinalize = (r) => {
    setFinalizing(r.id);
    finalizeMutation.mutate({ id: r.id }, { onSettled: () => setFinalizing(null) });
  };

  // Bulk entry helpers
  const bulkAssignments = useMemo(
    () => assignments.filter((a) => String(a.round_number) === String(bulkRound)).sort((a, b) => a.table_number - b.table_number),
    [assignments, bulkRound]
  );

  const setRow = (tableNumber, field, value) => {
    setBulkRows((prev) => ({ ...prev, [tableNumber]: { ...prev[tableNumber], [field]: value } }));
  };

  const handleBulkSubmit = async () => {
    const tournament = tournaments.find((t) => t.id === bulkTournament);
    if (!tournament) {
      toast({ title: 'Select a tournament', variant: 'destructive' });
      return;
    }
    const rows = Object.entries(bulkRows).filter(([, v]) => v.winner_id && v.win_type);
    if (rows.length === 0) {
      toast({ title: 'Nothing to submit', description: 'Fill in at least one table with a winner and win type.', variant: 'destructive' });
      return;
    }
    let created = 0;
    let skipped = 0;
    for (const [tableNumber, v] of rows) {
      const tn = Number(tableNumber);
      const assignment = bulkAssignments.find((a) => a.table_number === tn);
      const playerIds = assignment
        ? [assignment.player1_id, assignment.player2_id, assignment.player3_id, assignment.player4_id].filter(Boolean)
        : [];
      // skip if a result already exists for this table/round
      const existing = matchResults.find(
        (r) => r.tournament_id === bulkTournament && r.round_number === Number(bulkRound) && r.table_number === tn
      );
      if (existing) { skipped++; continue; }

      const hand = v.hand_id ? cardHands.find((h) => h.id === v.hand_id) : null;
      const lineStr = hand ? lineLabel(hand) : v.line_text || '';
      const category = hand ? hand.category : v.category || '';
      const fullLabel = `${category}${lineStr ? ' > Line ' + lineStr : ''}`;

      try {
        await matchResultsApi.create({
          organization_id: tournament.organization_id || '',
          tournament_id: bulkTournament,
          tournament_name: tournament.name || '',
          round_number: Number(bulkRound),
          table_number: tn,
          table_assignment_id: assignment?.id || '',
          player1_id: assignment?.player1_id || '',
          player2_id: assignment?.player2_id || '',
          player3_id: assignment?.player3_id || '',
          player4_id: assignment?.player4_id || '',
          submitted_by_id: '',
          submitted_by_name: 'Organizer (bulk entry)',
          winner_id: v.winner_id,
          winner_name: nameFor(v.winner_id),
          winning_hand_category: category,
          winning_hand_line: lineStr,
          winning_hand_label: fullLabel,
          win_type: v.win_type,
          status: 'finalized',
          finalized_at: new Date().toISOString(),
          finalized_by_name: 'Organizer (bulk entry)',
          auto_finalized: false,
        });
        created++;
      } catch (e) {
        toast({ title: `Table ${tn} failed`, description: e?.message, variant: 'destructive' });
      }
    }
    setBulkRows({});
    queryClient.invalidateQueries({ queryKey: ['admin-match-results'] });
    toast({
      title: 'Bulk entry complete',
      description: `${created} result(s) finalized${skipped ? ` · ${skipped} skipped (already existed)` : ''}.`,
    });
  };

  const bulkTournamentObj = tournaments.find((t) => t.id === bulkTournament);
  const canBulkFinalize = bulkTournamentObj?.trusted_organizer_enabled === true || bulkTournamentObj === undefined;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Gavel className="h-7 w-7 text-foreground" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Match Results</h1>
          <p className="text-muted-foreground text-sm mt-1">East-submitted results, approvals, and trusted-organizer finalization</p>
        </div>
      </div>

      <Tabs defaultValue="results">
        <TabsList className="mb-6">
          <TabsTrigger value="results" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Results</TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1.5"><Grid3x3 className="h-4 w-4" /> Bulk Entry</TabsTrigger>
        </TabsList>

        {/* ── Results list ── */}
        <TabsContent value="results">
          <div className="flex flex-wrap gap-3 mb-6">
            <ResponsiveSelect
              value={filterTournament}
              onValueChange={setFilterTournament}
              triggerClassName="w-52"
              placeholder="All Tournaments"
              title="Filter by Tournament"
              options={[{ value: 'all', label: 'All Tournaments' }, ...tournaments.map((t) => ({ value: t.id, label: t.name }))]}
            />
            <ResponsiveSelect
              value={filterRound}
              onValueChange={setFilterRound}
              triggerClassName="w-36"
              placeholder="All Rounds"
              title="Filter by Round"
              options={[{ value: 'all', label: 'All Rounds' }, ...rounds.map((r) => ({ value: String(r), label: `Round ${r}` }))]}
            />
            <ResponsiveSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              triggerClassName="w-44"
              placeholder="All Status"
              title="Filter by Status"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending_approval', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'disputed', label: 'Disputed' },
                { value: 'finalized', label: 'Finalized' },
                { value: 'auto_approved', label: 'Auto-Approved' },
              ]}
            />
            <Badge variant="outline" className="self-center px-3 py-1.5 text-sm">{filtered.length} results</Badge>
          </div>

          {isLoading && <div className="text-center py-16 text-muted-foreground">Loading…</div>}

          {!isLoading && filtered.length === 0 && (
            <Card><CardContent className="py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No match results found.</p>
            </CardContent></Card>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending_approval;
                const tour = tournaments.find((t) => t.id === r.tournament_id);
                const canFinalize = tour?.trusted_organizer_enabled === true || r.status === 'approved' || r.status === 'disputed';
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Round {r.round_number}</Badge>
                          <Badge variant="outline">Table {r.table_number}</Badge>
                          <Badge className={sc.className + ' gap-1'}><sc.icon className="w-3 h-3" /> {sc.label}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{tourName(r.tournament_id)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Winner:</span> <span className="font-semibold">{r.winner_name || '—'}</span></div>
                        <div><span className="text-muted-foreground">How won:</span> <span className="font-medium">{r.win_type}</span></div>
                        <div className="col-span-2"><span className="text-muted-foreground">Winning hand:</span> <span className="font-medium">{r.winning_hand_label || '—'}</span></div>
                        <div><span className="text-muted-foreground">Submitted by:</span> <span className="font-medium">{r.submitted_by_name || '—'}</span></div>
                        <div className="flex gap-3">
                          <span className="text-emerald-700 text-xs">✓ {(r.approvals || []).length}</span>
                          <span className="text-red-600 text-xs">⚠ {(r.disputes || []).length}</span>
                        </div>
                      </div>

                      {r.disputed && (r.disputes || []).length > 0 && (
                        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                          {(r.disputes || []).map((d, i) => (
                            <div key={i}>{d.player_name}: {d.reason || 'No reason given'}</div>
                          ))}
                        </div>
                      )}

                      {r.status !== 'finalized' && r.status !== 'auto_approved' && (
                        <Button
                          size="sm"
                          className="gap-1 w-full"
                          disabled={finalizing === r.id || !canFinalize}
                          onClick={() => handleFinalize(r)}
                          title={!canFinalize ? 'Enable Trusted Organizer on this tournament to finalize' : ''}
                        >
                          {finalizing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          Finalize {canFinalize ? '' : '(disabled)'}
                        </Button>
                      )}
                      {r.status === 'finalized' && r.finalized_by_name && (
                        <p className="text-xs text-muted-foreground">Finalized by {r.finalized_by_name}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Bulk table entry ── */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2"><Grid3x3 className="h-5 w-5" /> Bulk Table Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-64">
                  <Label className="text-xs text-muted-foreground">Tournament</Label>
                  <Select value={bulkTournament} onValueChange={setBulkTournament}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select tournament" /></SelectTrigger>
                    <SelectContent>
                      {tournaments.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label className="text-xs text-muted-foreground">Round</Label>
                  <Input type="number" min="1" value={bulkRound} onChange={(e) => setBulkRound(e.target.value)} className="mt-1" />
                </div>
                {bulkTournamentObj && (
                  <Badge className={bulkTournamentObj.trusted_organizer_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                    {bulkTournamentObj.trusted_organizer_enabled ? 'Trusted Organizer: ON' : 'Trusted Organizer: OFF'}
                  </Badge>
                )}
                <Button onClick={handleBulkSubmit} className="gap-1 ml-auto">
                  <Send className="h-4 w-4" /> Submit All
                </Button>
              </div>

              {!canBulkFinalize && bulkTournament !== 'all' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Trusted Organizer is off for this tournament. Enable it in the tournament's Approval Workflow settings to finalize bulk entries.
                </p>
              )}

              {bulkTournament === 'all' ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Select a tournament to load its tables.</p>
              ) : bulkAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No table assignments found for Round {bulkRound}.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-16">Table</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead className="w-44">Category</TableHead>
                        <TableHead className="w-28">Line</TableHead>
                        <TableHead className="w-40">How Won</TableHead>
                        <TableHead className="w-20">Exists</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkAssignments.map((a) => {
                        const row = bulkRows[a.table_number] || {};
                        const playerIds = [a.player1_id, a.player2_id, a.player3_id, a.player4_id].filter(Boolean);
                        const hand = row.hand_id ? cardHands.find((h) => h.id === row.hand_id) : null;
                        const handsForCategory = cardHands.filter((h) => h.category === row.category);
                        const existing = matchResults.find(
                          (r) => r.tournament_id === bulkTournament && r.round_number === Number(bulkRound) && r.table_number === a.table_number
                        );
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-bold text-center">#{a.table_number}</TableCell>
                            <TableCell>
                              <Select value={row.winner_id || ''} onValueChange={(v) => setRow(a.table_number, 'winner_id', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                  {playerIds.map((pid) => (
                                    <SelectItem key={pid} value={pid}>{nameFor(pid)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.category || ''}
                                onValueChange={(v) => setRow(a.table_number, 'category', v)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {row.category && handsForCategory.length > 0 ? (
                                <Select value={row.hand_id || ''} onValueChange={(v) => setRow(a.table_number, 'hand_id', v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                  <SelectContent>
                                    {handsForCategory.map((h) => (
                                      <SelectItem key={h.id} value={h.id}>Line {lineLabel(h)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="1A"
                                  value={row.line_text || ''}
                                  onChange={(e) => setRow(a.table_number, 'line_text', e.target.value)}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Select value={row.win_type || ''} onValueChange={(v) => setRow(a.table_number, 'win_type', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                  {WIN_TYPES.map((w) => (
                                    <SelectItem key={w} value={w}>{w}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{existing ? <Badge className="bg-emerald-100 text-emerald-700">✓</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}