import React, { useState } from 'react';
import { scoreCards as scoreCardsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Send, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-500', icon: Clock },
  submitted: { label: 'Submitted', className: 'bg-amber-100 text-amber-700', icon: Send },
  verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
};

function SortButton({ field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-0.5 hover:text-slate-800 transition-colors"
    >
      {active ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

export default function ScoreVerificationLog({ tournamentId }) {
  const [filterRound, setFilterRound] = useState('all');
  const [sortField, setSortField] = useState('table_number');
  const [sortDir, setSortDir] = useState('asc');

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['tournament-scorecards', tournamentId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 15000,
  });

  const rounds = [...new Set(scorecards.map(s => s.round_number))].sort((a, b) => a - b);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = scorecards
    .filter(s => filterRound === 'all' || String(s.round_number) === filterRound)
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      // Nulls last
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // Round-level summary
  const roundSummary = rounds.map(r => {
    const cards = scorecards.filter(s => s.round_number === r);
    return {
      round: r,
      total: cards.length,
      submitted: cards.filter(s => s.status === 'submitted' || s.status === 'verified').length,
      verified: cards.filter(s => s.status === 'verified').length,
    };
  });

  if (isLoading) return <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>;

  if (scorecards.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        No score cards yet. Activate the tournament to generate them.
      </div>
    );
  }

  const fmtTime = (ts) => ts ? format(new Date(ts), 'h:mm:ss a') : '—';

  return (
    <div className="space-y-6">
      {/* Round-level summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Round Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {roundSummary.map(rs => (
            <Card key={rs.round} className="border border-slate-200">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Round {rs.round}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Submitted</span>
                    <span className={`font-semibold ${rs.submitted === rs.total ? 'text-amber-600' : 'text-slate-700'}`}>
                      {rs.submitted}/{rs.total}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Verified</span>
                    <span className={`font-semibold ${rs.verified === rs.total ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {rs.verified}/{rs.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${rs.total > 0 ? (rs.verified / rs.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Per-table log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Table-by-Table Log</h3>
          <Select value={filterRound} onValueChange={setFilterRound}>
            <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="All Rounds" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rounds</SelectItem>
              {rounds.map(r => <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-16">
                  Round <SortButton field="round_number" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="w-16">
                  Table <SortButton field="table_number" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-center">Set 1</TableHead>
                <TableHead className="text-center">Set 2</TableHead>
                <TableHead className="text-center">Set 3</TableHead>
                <TableHead className="text-center">Set 4</TableHead>
                <TableHead>
                  Status <SortButton field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead>
                  Final Verified <SortButton field="verified_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const sc = statusConfig[s.status] || statusConfig.pending;
                const setSubmittedAt = s.set_submitted_at || [null, null, null, null];
                const setVerifiedAt = s.set_verified_at || [null, null, null, null];

                return (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-700">R{s.round_number}</TableCell>
                    <TableCell className="font-bold text-slate-800">#{s.table_number}</TableCell>
                    {[0, 1, 2, 3].map(idx => {
                      const verified = !!setVerifiedAt[idx];
                      return (
                        <TableCell key={idx} className="text-center px-2">
                          {verified
                            ? <span className="inline-flex w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center text-sm font-bold" title={fmtTime(setVerifiedAt[idx])}>✓</span>
                            : <span className="text-slate-300 text-lg leading-none">·</span>
                          }
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Badge className={sc.className}>
                        <sc.icon className="h-3 w-3 mr-1" />{sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-emerald-600 font-medium">{fmtTime(s.verified_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}