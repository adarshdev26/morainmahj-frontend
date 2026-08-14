import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  players as playersApi,
  scoreCards as scoreCardsApi,
  tableAssignments as tableAssignmentsApi,
  tournaments as tournamentsApi,
} from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Users, Grid3X3, Trophy, CalendarDays, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', location: '', useFlights: false, num_rounds: 4 });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: () => playersApi.list(),
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ['all-scorecards'],
    queryFn: () => scoreCardsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => tournamentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setDialogOpen(false);
      setForm({ name: '', date: '', location: '', useFlights: false, num_rounds: 4 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tournamentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, prevStatus }) => {
      await tournamentsApi.update(id, { status });
      // When activating, generate scorecards from all planned table assignments
      if (status === 'active' && prevStatus !== 'active') {
        const allAssignments = await tableAssignmentsApi.filter({ tournament_id: id });
        const existingScores = await scoreCardsApi.filter({ tournament_id: id });
        for (const s of existingScores) await scoreCardsApi.remove(s.id);
        const newScoreCards = allAssignments
          .filter(t => t.player1_id || t.player2_id || t.player3_id || t.player4_id)
          .map(t => ({
            tournament_id: id,
            table_assignment_id: t.id,
            round_number: t.round_number,
            table_number: t.table_number,
            player1_id: t.player1_id,
            player2_id: t.player2_id,
            player3_id: t.player3_id,
            player4_id: t.player4_id,
            player1_scores: [0, 0, 0, 0],
            player2_scores: [0, 0, 0, 0],
            player3_scores: [0, 0, 0, 0],
            player4_scores: [0, 0, 0, 0],
            status: 'pending',
            east_verified: false,
          }));
        if (newScoreCards.length > 0) await scoreCardsApi.bulkCreate(newScoreCards);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['all-scorecards'] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: form.name,
      date: form.date,
      location: form.location,
      use_flights: form.useFlights,
      num_rounds: form.num_rounds,
      status: 'setup',
    });
  };

  const statusColors = {
    setup: 'bg-slate-100 text-slate-600',
    registration_open: 'bg-blue-100 text-blue-700',
    registration_closed: 'bg-orange-100 text-orange-700',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <PageHeader
          title="Tournaments"
          description="Manage your mahjong tournaments"
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> New Tournament
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Tournament</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Spring Championship" />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Community Center" />
                  </div>
                  <div>
                    <Label>Number of Rounds</Label>
                    <Input type="number" min={1} max={20} value={form.num_rounds} onChange={e => setForm({ ...form, num_rounds: parseInt(e.target.value) || 4 })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.useFlights} onCheckedChange={v => setForm({ ...form, useFlights: v })} />
                    <Label>Use Flights (A/B/C)</Label>
                  </div>
                  <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full">
                    {createMutation.isPending ? 'Creating...' : 'Create Tournament'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{tournaments.length}</p>
                <p className="text-xs text-slate-500">Tournaments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{players.length}</p>
                <p className="text-xs text-slate-500">Players</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{scorecards.length}</p>
                <p className="text-xs text-slate-500">Score Cards</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{tournaments.filter(t => t.status === 'active').length}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          {tournaments.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No tournaments yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first tournament to get started</p>
              </CardContent>
            </Card>
          ) : (
            tournaments.map(tournament => (
              <Card key={tournament.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/tournament/${tournament.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tournament.name}</CardTitle>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                        {tournament.date && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {format(new Date(tournament.date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {tournament.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {tournament.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Select
                        value={tournament.status || 'setup'}
                        onValueChange={status => updateStatusMutation.mutate({ id: tournament.id, status, prevStatus: tournament.status })}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="setup">Setup</SelectItem>
                          <SelectItem value="registration_open">Registration Open</SelectItem>
                          <SelectItem value="registration_closed">Registration Closed</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge className={statusColors[tournament.status] || statusColors.setup}>
                        {(tournament.status || 'setup').replace(/_/g, ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => {
                          if (confirm('Delete this tournament?')) deleteMutation.mutate(tournament.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
