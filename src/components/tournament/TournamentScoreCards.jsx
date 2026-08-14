import React, { useState } from 'react';
import { players as playersApi, scoreCards as scoreCardsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil, ClipboardList, ShieldCheck, Clock, Send } from 'lucide-react';

const WINDS = ['E', 'S', 'W', 'N'];
const playerScoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600', icon: Clock },
  submitted: { label: 'Submitted', className: 'bg-amber-100 text-amber-700', icon: Send },
  verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
};

export default function TournamentScoreCards({ tournamentId }) {
  const queryClient = useQueryClient();
  const [filterRound, setFilterRound] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingCard, setEditingCard] = useState(null);
  const [editScores, setEditScores] = useState({});

  const { data: players = [] } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => playersApi.list({}, { sort: 'name', limit: 500 }),
  });

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['tournament-scorecards', tournamentId],
    queryFn: () => scoreCardsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => scoreCardsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-scorecards', tournamentId] });
      setEditingCard(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => scoreCardsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournament-scorecards', tournamentId] }),
  });

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '—';

  const rounds = [...new Set(scorecards.map(s => s.round_number))].sort((a, b) => a - b);

  const filtered = scorecards.filter(s => {
    const matchR = filterRound === 'all' || String(s.round_number) === filterRound;
    const matchSt = filterStatus === 'all' || s.status === filterStatus;
    return matchR && matchSt;
  });

  const cardsByRound = filtered.reduce((acc, s) => {
    if (!acc[s.round_number]) acc[s.round_number] = [];
    acc[s.round_number].push(s);
    return acc;
  }, {});
  const sortedRoundNumbers = Object.keys(cardsByRound).map(Number).sort((a, b) => a - b);

  const openEdit = (card) => {
    setEditingCard(card);
    setEditScores({
      player1_scores: [...(card.player1_scores || [0, 0, 0, 0])],
      player2_scores: [...(card.player2_scores || [0, 0, 0, 0])],
      player3_scores: [...(card.player3_scores || [0, 0, 0, 0])],
      player4_scores: [...(card.player4_scores || [0, 0, 0, 0])],
      status: card.status || 'pending',
    });
  };

  const getRowTotal = (key) => (editScores[key] || []).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleScoreChange = (key, idx, val) => {
    setEditScores(prev => {
      const arr = [...(prev[key] || [0, 0, 0, 0])];
      arr[idx] = val === '' ? '' : Number(val);
      return { ...prev, [key]: arr };
    });
  };

  const handleSaveEdit = () => {
    const clean = {};
    playerScoreKeys.forEach(k => {
      clean[k] = (editScores[k] || []).map(v => Number(v) || 0);
    });
    updateMutation.mutate({ id: editingCard.id, data: { ...clean, status: editScores.status } });
  };

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading score cards…</div>;
  }

  if (scorecards.length === 0) {
    return (
      <div className="py-12 text-center">
        <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No score cards yet. Activate the tournament to generate them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterRound} onValueChange={setFilterRound}>
          <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="All Rounds" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rounds</SelectItem>
            {rounds.map(r => <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center px-3 py-1.5 text-sm">{filtered.length} cards</Badge>
      </div>

      {/* Round-by-round breakdown */}
      {sortedRoundNumbers.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">No cards match your filters.</div>
      ) : (
        <div className="space-y-6">
          {sortedRoundNumbers.map(roundNum => (
            <Card key={roundNum}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading text-slate-800">Round {roundNum}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-16">Table</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="w-10 text-center">Pos</TableHead>
                        <TableHead className="text-center w-16">Set 1</TableHead>
                        <TableHead className="text-center w-16">Set 2</TableHead>
                        <TableHead className="text-center w-16">Set 3</TableHead>
                        <TableHead className="text-center w-16">Set 4</TableHead>
                        <TableHead className="text-center w-16 font-bold">Total</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardsByRound[roundNum]
                        .sort((a, b) => a.table_number - b.table_number)
                        .map((s, cardIdx) => {
                          const sc = statusConfig[s.status] || statusConfig.pending;
                          return playerIdKeys.map((idKey, pIdx) => {
                            const scores = s[playerScoreKeys[pIdx]] || [0, 0, 0, 0];
                            const total = scores.reduce((sum, v) => sum + (Number(v) || 0), 0);
                            const isFirst = pIdx === 0;
                            return (
                              <TableRow
                                key={`${s.id}-${pIdx}`}
                                className={`hover:bg-slate-50 ${isFirst && cardIdx > 0 ? 'border-t-2 border-slate-200' : ''}`}
                              >
                                {isFirst && (
                                  <TableCell rowSpan={4} className="font-bold text-slate-700 text-center align-middle border-r border-slate-100">
                                    #{s.table_number}
                                  </TableCell>
                                )}
                                <TableCell className="text-sm text-slate-700">{getPlayerName(s[idKey])}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs font-mono">{WINDS[pIdx]}</Badge>
                                </TableCell>
                                {[0, 1, 2, 3].map(gi => (
                                  <TableCell key={gi} className={`text-center text-sm font-medium ${Number(scores[gi]) < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                    {Number(scores[gi]) || 0}
                                  </TableCell>
                                ))}
                                <TableCell className={`text-center font-bold ${total < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                  {total}
                                </TableCell>
                                {isFirst && (
                                  <TableCell rowSpan={4} className="align-middle border-l border-slate-100">
                                    <Badge className={sc.className}>
                                      <sc.icon className="h-3 w-3 mr-1" />{sc.label}
                                    </Badge>
                                  </TableCell>
                                )}
                                {isFirst && (
                                  <TableCell rowSpan={4} className="align-middle border-l border-slate-100">
                                    <div className="flex flex-col gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" onClick={() => openEdit(s)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                                        if (confirm('Delete this score card?')) deleteMutation.mutate(s.id);
                                      }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          });
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Edit Score Card — Round {editingCard?.round_number}, Table {editingCard?.table_number}
            </DialogTitle>
          </DialogHeader>
          {editingCard && (
            <div className="mt-2 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-2 text-slate-500 font-medium">Player</th>
                      {[1, 2, 3, 4].map(s => <th key={s} className="text-center py-2 px-2 text-slate-500 font-medium w-20">Set {s}</th>)}
                      <th className="text-center py-2 pl-2 font-bold w-16">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerScoreKeys.map((key, idx) => (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <div className="font-medium text-slate-700 text-xs">{WINDS[idx]}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[100px]">
                            {getPlayerName(editingCard[playerIdKeys[idx]])}
                          </div>
                        </td>
                        {[0, 1, 2, 3].map(si => (
                          <td key={si} className="py-2 px-2">
                            <Input
                              type="number"
                              value={editScores[key]?.[si] ?? 0}
                              onChange={e => handleScoreChange(key, si, e.target.value)}
                              className="h-8 text-center text-xs"
                            />
                          </td>
                        ))}
                        <td className={`py-2 pl-2 text-center font-bold ${getRowTotal(key) < 0 ? 'text-red-500' : ''}`}>
                          {getRowTotal(key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Status</label>
                <Select value={editScores.status || 'pending'} onValueChange={val => setEditScores(p => ({ ...p, status: val }))}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingCard(null)}>Cancel</Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900"
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}