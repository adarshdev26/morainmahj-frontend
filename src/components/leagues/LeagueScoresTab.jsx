import React, { useState, useEffect } from 'react';
import { leagueScoreCards as leagueScoreCardsApi, leagueTableAssignments as leagueTableAssignmentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Save, ClipboardList, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SEATS = [
  { key: 'east', label: 'East' },
  { key: 'south', label: 'South' },
  { key: 'west', label: 'West' },
  { key: 'north', label: 'North' },
];

export default function LeagueScoresTab({ session, league }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({});
  const [viewMode, setViewMode] = useState('cards');

  const numRounds = league.num_rounds || 1;

  const { data: assignments = [] } = useQuery({
    queryKey: ['league-assignments', session.id, round],
    queryFn: () => leagueTableAssignmentsApi.filter({ session_id: session.id, round_number: round }),
  });

  const { data: existing = [] } = useQuery({
    queryKey: ['league-scores', session.id, round],
    queryFn: () => leagueScoreCardsApi.filter({ session_id: session.id, round_number: round }),
  });

  useEffect(() => {
    const map = {};
    existing.forEach(sc => {
      map[sc.table_number] = {
        east: sc.east_score ?? '',
        south: sc.south_score ?? '',
        west: sc.west_score ?? '',
        north: sc.north_score ?? '',
      };
    });
    setScores(map);
  }, [existing, round]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tables = [...new Set(assignments.map(a => a.table_number))];
      for (const tableNum of tables) {
        const a = assignments.find(x => x.table_number === tableNum);
        if (!a) continue;
        const vals = scores[tableNum] || {};
        const toNum = (v) => (v === '' || v == null ? null : Number(v));
        const payload = {
          league_id: league.id,
          session_id: session.id,
          round_number: round,
          table_number: tableNum,
          east_player_email: a.east_player_email,
          east_player_name: a.east_player_name,
          east_score: toNum(vals.east),
          south_player_email: a.south_player_email,
          south_player_name: a.south_player_name,
          south_score: toNum(vals.south),
          west_player_email: a.west_player_email,
          west_player_name: a.west_player_name,
          west_score: toNum(vals.west),
          north_player_email: a.north_player_email,
          north_player_name: a.north_player_name,
          north_score: toNum(vals.north),
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        };
        const existingCard = existing.find(s => s.table_number === tableNum);
        if (existingCard) {
          await leagueScoreCardsApi.update(existingCard.id, payload);
        } else {
          await leagueScoreCardsApi.create(payload);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['league-scores', session.id, round] });
      toast({ title: 'Scores saved.' });
    },
    onError: (err) => toast({ title: 'Error saving', description: err.message, variant: 'destructive' }),
  });

  const tables = [...new Set(assignments.map(a => a.table_number))].sort((a, b) => a - b);

  const setScore = (tableNum, seat, value) => {
    setScores(s => ({ ...s, [tableNum]: { ...(s[tableNum] || {}), [seat]: value } }));
  };

  const filledCount = tables.filter(t => {
    const v = scores[t] || {};
    return SEATS.some(s => v[s.key] !== '' && v[s.key] != null);
  }).length;

  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium text-slate-600">No table assignments for this round yet.</p>
        <p className="text-xs mt-1">Generate table assignments first, then come back here to enter scores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Round selector + save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Round:</span>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {Array.from({ length: numRounds }, (_, i) => i + 1).map(r => (
              <button
                key={r}
                onClick={() => setRound(r)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${round === r ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{tables.length} tables · {filledCount} with scores</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || session?.status === 'completed'} className="gap-1.5">
            <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Scores'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setViewMode(viewMode === 'cards' ? 'quick' : 'cards')}>
            {viewMode === 'cards' ? 'Quick Entry' : 'Card View'}
          </Button>
        </div>
        {session?.status === 'completed' && (
          <p className="text-xs text-amber-600 font-medium w-full">Session finalized — scores locked.</p>
        )}
      </div>

      <p className="text-xs text-slate-400 -mt-2">
        Enter each player's score in NESW order. Negative scores are allowed. Leave a seat blank if that player didn't play.
      </p>

      {viewMode === 'quick' && (
        <div className="overflow-x-auto bg-white border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Table</th>
                {SEATS.map(seat => (
                  <th key={seat.key} className="text-left py-2 px-3 text-xs font-semibold text-slate-500">{seat.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables.map(tableNum => {
                const a = assignments.find(x => x.table_number === tableNum);
                const vals = scores[tableNum] || {};
                return (
                  <tr key={tableNum} className="border-t">
                    <td className="py-2 px-3 font-semibold text-slate-700">{tableNum}</td>
                    {SEATS.map(seat => {
                      const email = a ? a[`${seat.key}_player_email`] : null;
                      const name = a ? a[`${seat.key}_player_name`] : null;
                      return (
                        <td key={seat.key} className="py-1 px-2">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              step="any"
                              value={vals[seat.key] ?? ''}
                              onChange={e => setScore(tableNum, seat.key, e.target.value)}
                              placeholder="—"
                              className="w-16 text-right font-mono h-8 text-xs"
                              disabled={!email || session?.status === 'completed'}
                            />
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">{name?.split(' ')[0] || ''}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'cards' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tables.map(tableNum => {
          const a = assignments.find(x => x.table_number === tableNum);
          const vals = scores[tableNum] || {};
          return (
            <Card key={tableNum}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Table {tableNum}</h4>
                  <Badge variant="outline" className="text-xs">Round {round}</Badge>
                </div>
                <div className="space-y-2">
                  {SEATS.map(seat => {
                    const emailKey = `${seat.key}_player_email`;
                    const nameKey = `${seat.key}_player_name`;
                    const name = a ? a[nameKey] : null;
                    const email = a ? a[emailKey] : null;
                    return (
                      <div key={seat.key} className="flex items-center gap-2">
                        <span className="w-12 text-xs font-semibold text-slate-500 shrink-0">{seat.label}</span>
                        <span className="flex-1 text-sm text-slate-700 truncate">
                          {name || <span className="text-slate-300 italic">Empty seat</span>}
                        </span>
                        <Input
                          type="number"
                          step="any"
                          value={vals[seat.key] ?? ''}
                          onChange={e => setScore(tableNum, seat.key, e.target.value)}
                          placeholder="0"
                          className="w-24 text-right font-mono"
                          disabled={!email || session?.status === 'completed'}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}