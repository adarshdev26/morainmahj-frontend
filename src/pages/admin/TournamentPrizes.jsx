import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prizeStructures as prizeStructuresApi, prizeWinners as prizeWinnersApi, registrations as registrationsApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Trophy, DollarSign, Percent, Save, UserCheck, Wand2, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import PrizeWinnerAssigner from '@/components/prizes/PrizeWinnerAssigner';
import { useExportPermission } from '@/hooks/useExportPermission';
import ExportButton from '@/components/shared/ExportButton';

const CATEGORIES = [
  { key: '1st', label: '1st Place (Overall)' },
  { key: '2nd', label: '2nd Place (Overall)' },
  { key: '3rd', label: '3rd Place (Overall)' },
  { key: 'round_1', label: 'Round 1 Winner' },
  { key: 'round_2', label: 'Round 2 Winner' },
  { key: 'round_3', label: 'Round 3 Winner' },
  { key: 'round_4', label: 'Round 4 Winner' },
];

export default function TournamentPrizes() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [autoAssignments, setAutoAssignments] = useState(null);
  const [allowDoubleWin, setAllowDoubleWin] = useState(false);

  const [form, setForm] = useState({
    player_count: '',
    entry_fee: '',
    admin_deduction_pct: '',
    payout_mode: 'percentage',
    place_1st: '',
    place_2nd: '',
    place_3rd: '',
    round_1_winner: '',
    round_2_winner: '',
    round_3_winner: '',
    round_4_winner: '',
    notes: '',
  });

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.filter({ id: tournamentId }).then(r => r[0]),
    enabled: !!tournamentId,
  });

  const { data: prizeStructures = [] } = useQuery({
    queryKey: ['prize-structure', tournamentId],
    queryFn: () => prizeStructuresApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: prizeWinners = [] } = useQuery({
    queryKey: ['prize-winners', tournamentId],
    queryFn: () => prizeWinnersApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId, status: 'confirmed' }),
    enabled: !!tournamentId,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['scorecards', tournamentId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const existing = prizeStructures[0] || null;

  // Compute leaderboard rankings from verified scorecards
  const computeRankings = () => {
    const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
    const scoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
    const verifiedCards = scorecards.filter(s => s.status === 'verified');

    const scores = {};
    registrations.forEach(r => {
      scores[r.player_id] = { name: r.player_name, email: r.player_email, totalScore: 0, roundScores: {} };
    });

    verifiedCards.forEach(sc => {
      playerIdKeys.forEach((idKey, idx) => {
        const pid = sc[idKey];
        const sKey = scoreKeys[idx];
        if (pid && scores[pid] && sc[sKey]) {
          const roundTotal = sc[sKey].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
          scores[pid].totalScore += roundTotal;
          scores[pid].roundScores[sc.round_number] = (scores[pid].roundScores[sc.round_number] || 0) + roundTotal;
        }
      });
    });

    const overall = Object.entries(scores)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // Players who won an overall prize (1st/2nd/3rd) are ineligible for round prizes (unless allowDoubleWin)
    const overallWinnerIds = allowDoubleWin ? new Set() : new Set(overall.slice(0, 3).map(p => p.id));

    // Round winners: highest scorer per round (optionally excluding overall winners)
    const numRounds = tournament?.num_rounds || 4;
    const roundWinners = {};
    for (let r = 1; r <= numRounds; r++) {
      const sorted = Object.entries(scores)
        .filter(([, d]) => d.roundScores[r] !== undefined)
        .sort(([, a], [, b]) => b.roundScores[r] - a.roundScores[r]);

      const best = sorted.find(([id]) => !overallWinnerIds.has(id));
      if (best) roundWinners[r] = { id: best[0], name: best[1].name, email: best[1].email };
    }

    return { overall, roundWinners };
  };

  useEffect(() => {
    if (existing) {
      setForm({
        player_count: existing.player_count || '',
        entry_fee: existing.entry_fee || '',
        admin_deduction_pct: existing.admin_deduction_pct || '',
        payout_mode: existing.payout_mode || 'percentage',
        place_1st: existing.place_1st || '',
        place_2nd: existing.place_2nd || '',
        place_3rd: existing.place_3rd || '',
        round_1_winner: existing.round_1_winner || '',
        round_2_winner: existing.round_2_winner || '',
        round_3_winner: existing.round_3_winner || '',
        round_4_winner: existing.round_4_winner || '',
        notes: existing.notes || '',
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (data) => existing
      ? prizeStructuresApi.update(existing.id, data)
      : prizeStructuresApi.create({ tournament_id: tournamentId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prize-structure', tournamentId] });
      toast({ title: 'Prize structure saved!' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Computed values
  const gross = (Number(form.player_count) || 0) * (Number(form.entry_fee) || 0);
  const deductionAmt = gross * ((Number(form.admin_deduction_pct) || 0) / 100);
  const net = gross - deductionAmt;

  const payoutFields = [
    { key: 'place_1st', label: '1st Place' },
    { key: 'place_2nd', label: '2nd Place' },
    { key: 'place_3rd', label: '3rd Place' },
    { key: 'round_1_winner', label: 'Round 1 Winner' },
    { key: 'round_2_winner', label: 'Round 2 Winner' },
    { key: 'round_3_winner', label: 'Round 3 Winner' },
    { key: 'round_4_winner', label: 'Round 4 Winner' },
  ];

  const totalAllocated = payoutFields.reduce((sum, f) => sum + (Number(form[f.key]) || 0), 0);
  const totalDollars = form.payout_mode === 'percentage'
    ? payoutFields.reduce((sum, f) => sum + net * ((Number(form[f.key]) || 0) / 100), 0)
    : totalAllocated;

  const handleSave = () => {
    const saveGross = (Number(form.player_count) || 0) * (Number(form.entry_fee) || 0);
    const saveDed = saveGross * ((Number(form.admin_deduction_pct) || 0) / 100);
    const saveNet = saveGross - saveDed;
    saveMutation.mutate({
      player_count: Number(form.player_count) || null,
      entry_fee: Number(form.entry_fee) || null,
      gross_pool: saveGross || null,
      admin_deduction_pct: Number(form.admin_deduction_pct) || null,
      admin_deduction_amount: saveDed || null,
      net_pool: saveNet || null,
      payout_mode: form.payout_mode,
      place_1st: Number(form.place_1st) || null,
      place_2nd: Number(form.place_2nd) || null,
      place_3rd: Number(form.place_3rd) || null,
      round_1_winner: Number(form.round_1_winner) || null,
      round_2_winner: Number(form.round_2_winner) || null,
      round_3_winner: Number(form.round_3_winner) || null,
      round_4_winner: Number(form.round_4_winner) || null,
      notes: form.notes || null,
    });
  };

  const getDollarAmount = (val) => {
    if (!val) return null;
    return form.payout_mode === 'percentage' ? net * (val / 100) : val;
  };

  const handleExport = () => {
    const headers = ['Category', 'Winner Name', 'Winner Email', 'Amount'];
    const rows = prizeWinners.map(w => [
      CATEGORIES.find(c => c.key === w.prize_category)?.label || w.prize_category,
      w.player_name || '',
      w.player_email || '',
      String(w.prize_amount || ''),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prize-winners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
     <div className="min-h-screen bg-slate-50 p-6">
       <div className="max-w-4xl mx-auto">
         <div className="flex items-center gap-3 mb-8 flex-wrap">
           <button
             onClick={() => navigate(`/admin/tournament/${tournamentId}`)}
             className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
           >
             <ChevronLeft className="h-4 w-4" /> Back
           </button>
           <ExportButton onClick={handleExport} label="Export CSV" variant="outline" />
           <div>
             <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
               <Trophy className="h-7 w-7 text-amber-500" /> Prize Structure
             </h1>
             {tournament && <p className="text-sm text-slate-500 mt-0.5">{tournament.name}</p>}
           </div>
         </div>

        {/* Pool Calculator */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Player Count</Label>
                <Input
                  type="number"
                  value={form.player_count}
                  onChange={(e) => setForm({ ...form, player_count: e.target.value })}
                  placeholder={`${registrations.length} confirmed`}
                />
                {registrations.length > 0 && (
                  <button
                    className="text-xs text-blue-600 hover:underline mt-1"
                    onClick={() => setForm({ ...form, player_count: registrations.length })}
                  >
                    Use confirmed count ({registrations.length})
                  </button>
                )}
              </div>
              <div>
                <Label>Entry Fee ($)</Label>
                <Input
                  type="number"
                  value={form.entry_fee}
                  onChange={(e) => setForm({ ...form, entry_fee: e.target.value })}
                  placeholder="50"
                />
              </div>
              <div>
                <Label>Admin Deduction (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.admin_deduction_pct}
                  onChange={(e) => setForm({ ...form, admin_deduction_pct: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            {/* Pool summary */}
            {gross > 0 && (
              <div className="grid grid-cols-3 gap-4 bg-slate-100 rounded-xl p-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Gross Pool</p>
                  <p className="text-xl font-bold font-heading">${gross.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Admin Deduction</p>
                  <p className="text-xl font-bold font-heading text-red-600">-${deductionAmt.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Net Prize Pool</p>
                  <p className="text-xl font-bold font-heading text-green-700">${net.toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payouts */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" /> Payout Breakdown
              </CardTitle>
              <Select value={form.payout_mode} onValueChange={(val) => setForm({ ...form, payout_mode: val })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">By Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Dollars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {payoutFields.map(({ key, label }) => {
                const dollarAmt = getDollarAmount(Number(form[key]));
                return (
                  <div key={key}>
                    <Label>{label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        placeholder={form.payout_mode === 'percentage' ? '0%' : '$0'}
                      />
                      {dollarAmt != null && net > 0 && form.payout_mode === 'percentage' && (
                        <span className="text-sm text-green-700 font-semibold whitespace-nowrap">
                          = ${dollarAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Allocation summary */}
            {(totalAllocated > 0 || totalDollars > 0) && (
              <div className={`mt-4 p-3 rounded-xl text-sm font-medium flex items-center justify-between ${
                form.payout_mode === 'percentage'
                  ? totalAllocated > 100 ? 'bg-red-50 text-red-700' : totalAllocated === 100 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  : totalDollars > net ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}>
                <span>Total Allocated:</span>
                <span>
                  {form.payout_mode === 'percentage'
                    ? `${totalAllocated}% = $${totalDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : `$${totalDollars.toLocaleString()}`}
                </span>
              </div>
            )}

            <div className="mt-2">
              <Label>Notes (internal)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any internal notes about this prize structure"
              />
            </div>

            <Button className="mt-4 gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" /> Save Prize Structure
            </Button>
          </CardContent>
        </Card>

        {/* Winner Assignment */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" /> Assign Winners
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Assign players to each prize category. Dollar amounts are private — visible only to admin and the individual player.</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="outline"
                  className="gap-2 shrink-0"
                  onClick={() => {
                    const { overall, roundWinners } = computeRankings();
                    const effectiveMode = form.payout_mode || existing?.payout_mode || 'percentage';
                    // Compute net from form values first, then fall back to saved net_pool
                    const formGross = (Number(form.player_count) || 0) * (Number(form.entry_fee) || 0);
                    const formDed = formGross * ((Number(form.admin_deduction_pct) || 0) / 100);
                    const formNet = formGross - formDed;
                    const effectiveNet = formNet || Number(existing?.net_pool) || 0;
                    if (effectiveMode === 'percentage' && effectiveNet <= 0) {
                      toast({
                        title: 'Entry fee required',
                        description: 'Please enter the player count and entry fee above before auto-assigning.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    const calcAmt = (fieldKey) => {
                      const val = Number(form[fieldKey]) || Number(existing?.[fieldKey]) || 0;
                      if (!val) return '';
                      if (effectiveMode === 'fixed') return Math.round(val);
                      return Math.round(effectiveNet * (val / 100));
                    };
                    const withAmounts = {
                      overall,
                      roundWinners,
                      amounts: {
                        '1st':     calcAmt('place_1st'),
                        '2nd':     calcAmt('place_2nd'),
                        '3rd':     calcAmt('place_3rd'),
                        'round_1': calcAmt('round_1_winner'),
                        'round_2': calcAmt('round_2_winner'),
                        'round_3': calcAmt('round_3_winner'),
                        'round_4': calcAmt('round_4_winner'),
                      }
                    };
                    setAutoAssignments({ ...withAmounts, _ts: Date.now() });
                    toast({
                      title: 'Winners pre-filled from leaderboard',
                      description: allowDoubleWin
                        ? 'Overall winners may also be assigned round prizes. Review and save each assignment.'
                        : 'Overall prize winners are excluded from round prizes. Review and save each assignment.'
                    });
                  }}
                >
                  <Wand2 className="h-4 w-4" /> Auto-Assign from Leaderboard
                </Button>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Switch checked={allowDoubleWin} onCheckedChange={setAllowDoubleWin} id="double-win" />
                  <label htmlFor="double-win" className="cursor-pointer select-none">
                    Allow overall winners to also win round prizes
                  </label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PrizeWinnerAssigner
              tournamentId={tournamentId}
              categories={CATEGORIES}
              prizeWinners={prizeWinners}
              registrations={registrations}
              prizeStructure={existing}
              getDollarAmount={getDollarAmount}
              autoAssignments={autoAssignments}
              onUpdate={() => { queryClient.invalidateQueries({ queryKey: ['prize-winners', tournamentId] }); setAutoAssignments(null); }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}