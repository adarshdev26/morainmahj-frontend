import React, { useState } from 'react';
import { players as playersApi, scoreCards as scoreCardsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil, ClipboardList, ShieldCheck, Clock, Send, Trophy, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const WINDS = ['E', 'S', 'W', 'N'];
const WIND_FULL = ['East', 'South', 'West', 'North'];
const playerScoreKeys = ['player1_scores', 'player2_scores', 'player3_scores', 'player4_scores'];
const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600', icon: Clock },
  submitted: { label: 'Submitted', className: 'bg-amber-100 text-amber-700', icon: Send },
  verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
};

export default function AdminScores() {
   const queryClient = useQueryClient();
   const navigate = useNavigate();
   const urlParams = new URLSearchParams(window.location.search);
   const urlTournamentId = urlParams.get('tournament');
   const initialTournament = urlTournamentId || 'all';
   const [filterTournament, setFilterTournament] = useState(initialTournament);
  const [filterRound, setFilterRound] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingCard, setEditingCard] = useState(null);
  const [editScores, setEditScores] = useState({});

  // When a specific tournament is pre-selected (from quick link), show round breakdown view
  const isTournamentView = filterTournament !== 'all';

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => playersApi.list({}, { sort: 'name', limit: 500 }),
  });

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['admin-scorecards'],
    queryFn: () => scoreCardsApi.list({}, { sort: '-created_date', limit: 500 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => scoreCardsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scorecards'] });
      setEditingCard(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => scoreCardsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-scorecards'] }),
  });

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '—';
  const getTournamentName = (id) => tournaments.find(t => t.id === id)?.name || '—';

  const filtered = scorecards.filter(s => {
    const matchT = filterTournament === 'all' || s.tournament_id === filterTournament;
    const matchR = filterRound === 'all' || String(s.round_number) === filterRound;
    const matchSt = filterStatus === 'all' || s.status === filterStatus;
    return matchT && matchR && matchSt;
  });

  const rounds = [...new Set(scorecards.map(s => s.round_number))].sort();

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

  const getRowTotal = (key) =>
    (editScores[key] || []).reduce((s, v) => s + (Number(v) || 0), 0);

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

  // Group filtered cards by round for the round-breakdown view
  const cardsByRound = filtered.reduce((acc, s) => {
    const r = s.round_number;
    if (!acc[r]) acc[r] = [];
    acc[r].push(s);
    return acc;
  }, {});
  const sortedRoundNumbers = Object.keys(cardsByRound).map(Number).sort((a, b) => a - b);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Score Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">Review, edit, and manage all score cards</p>
        </div>
        <div className="flex gap-2">
          {urlTournamentId && (
            <button onClick={() => navigate(`/admin/tournament/${urlTournamentId}`)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-transparent text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Tournament
            </button>
          )}
          <Link to={filterTournament !== 'all' ? `/leaderboard?tournament=${filterTournament}` : '/leaderboard'}>
            <Button variant="outline" className="gap-2">
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <ResponsiveSelect
          value={filterTournament}
          onValueChange={setFilterTournament}
          triggerClassName="w-52"
          placeholder="All Tournaments"
          title="Filter by Tournament"
          options={[
            { value: 'all', label: 'All Tournaments' },
            ...tournaments.map(t => ({ value: t.id, label: t.name })),
          ]}
        />
        <ResponsiveSelect
          value={filterRound}
          onValueChange={setFilterRound}
          triggerClassName="w-36"
          placeholder="All Rounds"
          title="Filter by Round"
          options={[
            { value: 'all', label: 'All Rounds' },
            ...rounds.map(r => ({ value: String(r), label: `Round ${r}` })),
          ]}
        />
        <ResponsiveSelect
          value={filterStatus}
          onValueChange={setFilterStatus}
          triggerClassName="w-40"
          placeholder="All Status"
          title="Filter by Status"
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'verified', label: 'Verified' },
          ]}
        />
        <Badge variant="outline" className="self-center px-3 py-1.5 text-sm">{filtered.length} cards</Badge>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">No score cards found.</p>
          </CardContent>
        </Card>
      )}

      {/* Round-by-round breakdown (when a tournament is selected) */}
      {isTournamentView && !isLoading && filtered.length > 0 && (
        <div className="space-y-8">
          {sortedRoundNumbers.map(roundNum => (
            <Card key={roundNum}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading text-foreground">Round {roundNum}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                         <TableHead className="w-16">Table</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="w-12 text-center">Pos</TableHead>
                        <TableHead className="text-center w-16">Game 1</TableHead>
                        <TableHead className="text-center w-16">Game 2</TableHead>
                        <TableHead className="text-center w-16">Game 3</TableHead>
                        <TableHead className="text-center w-16">Game 4</TableHead>
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
                            const isFirstInCard = pIdx === 0;
                            return (
                              <TableRow
                                key={`${s.id}-${pIdx}`}
                                className={`hover:bg-muted/30 ${isFirstInCard && cardIdx > 0 ? 'border-t-2 border-border' : ''}`}
                              >
                                {isFirstInCard ? (
                                  <TableCell rowSpan={4} className="font-bold text-foreground text-center align-middle border-r border-border">
                                    #{s.table_number}
                                  </TableCell>
                                ) : null}
                                <TableCell className="text-sm text-foreground">{getPlayerName(s[idKey])}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs font-mono">{WINDS[pIdx]}</Badge>
                                </TableCell>
                                {[0, 1, 2, 3].map(gi => (
                                  <TableCell key={gi} className={`text-center text-sm font-medium ${Number(scores[gi]) < 0 ? 'text-red-500' : 'text-foreground'}`}>
                                    {Number(scores[gi]) || 0}
                                  </TableCell>
                                ))}
                                <TableCell className={`text-center font-bold ${total < 0 ? 'text-red-500' : 'text-foreground'}`}>
                                  {total}
                                </TableCell>
                                {isFirstInCard ? (
                                  <TableCell rowSpan={4} className="align-middle border-l border-border">
                                    <Badge className={sc.className}>
                                      <sc.icon className="h-3 w-3 mr-1" />{sc.label}
                                    </Badge>
                                  </TableCell>
                                ) : null}
                                {isFirstInCard ? (
                                  <TableCell rowSpan={4} className="align-middle border-l border-border">
                                    <div className="flex flex-col gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(s)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                                        if (confirm('Delete this score card?')) deleteMutation.mutate(s.id);
                                      }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                ) : null}
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

      {/* Flat table view (when no specific tournament selected) */}
      {!isTournamentView && !isLoading && filtered.length > 0 && (
        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                  <TableHead>Tournament</TableHead>
                    <TableHead>R</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>East</TableHead>
                    <TableHead>South</TableHead>
                    <TableHead>West</TableHead>
                    <TableHead>North</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.sort((a, b) => a.round_number - b.round_number || a.table_number - b.table_number).map(s => {
                  const sc = statusConfig[s.status] || statusConfig.pending;
                  const totals = playerScoreKeys.map(k => (s[k] || []).reduce((sum, v) => sum + (Number(v) || 0), 0));
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{getTournamentName(s.tournament_id)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">R{s.round_number}</Badge></TableCell>
                      <TableCell className="font-semibold text-foreground">#{s.table_number}</TableCell>
                        <TableCell>
                          <Badge className={sc.className}>
                            <sc.icon className="h-3 w-3 mr-1" />{sc.label}
                          </Badge>
                        </TableCell>
                        {playerIdKeys.map((idKey, idx) => (
                          <TableCell key={idx} className="text-sm">
                            <div className="text-muted-foreground text-xs truncate max-w-[90px]">{getPlayerName(s[idKey])}</div>
                            <div className={`font-bold text-sm ${totals[idx] < 0 ? 'text-red-500' : 'text-foreground'}`}>{totals[idx]}</div>
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => {
                              if (confirm('Delete this score card?')) deleteMutation.mutate(s.id);
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Score Dialog */}
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
                      <th className="text-left py-2 pr-2 text-muted-foreground font-medium">Player</th>
                      {[1, 2, 3, 4].map(s => <th key={s} className="text-center py-2 px-2 text-muted-foreground font-medium w-20">Set {s}</th>)}
                      <th className="text-center py-2 pl-2 font-bold w-16">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerScoreKeys.map((key, idx) => (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <div className="font-medium text-foreground text-xs">{WINDS[idx]}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {getPlayerName(editingCard[playerIdKeys[idx]])}
                          </div>
                        </td>
                        {[0, 1, 2, 3].map(si => (
                          <td key={si} className="py-2 px-2">
                            <Input
                              type="number"
                              value={editScores[key]?.[si] ?? 0}
                              onChange={e => handleScoreChange(key, si, e.target.value)}
                              className="h-8 w-18 text-center text-xs"
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
                <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
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