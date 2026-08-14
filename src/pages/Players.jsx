import React, { useState } from 'react';
import { players as playersApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, UserPlus, Search, User, X } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import TournamentSelector from '@/components/shared/TournamentSelector';

export default function Players() {
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', flight: '', email: '', phone: '' });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list({}, { sort: '-created_date' }),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', selectedTournament],
    queryFn: () => selectedTournament
      ? playersApi.filter({ tournament_id: selectedTournament })
      : Promise.resolve([]),
    enabled: !!selectedTournament,
  });

  const tournament = tournaments.find(t => t.id === selectedTournament);

  const createMutation = useMutation({
    mutationFn: (data) => playersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setDialogOpen(false);
      setForm({ name: '', flight: '', email: '', phone: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => playersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players'] }),
  });

  const handleCreate = () => {
    createMutation.mutate({
      ...form,
      tournament_id: selectedTournament,
    });
  };

  const filteredPlayers = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const flightGroups = {};
  filteredPlayers.forEach(p => {
    const f = p.flight || 'Unassigned';
    if (!flightGroups[f]) flightGroups[f] = [];
    flightGroups[f].push(p);
  });

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle="Register and manage tournament players"
        actions={
          selectedTournament && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><UserPlus className="h-4 w-4" /> Add Player</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading">Add Player</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Player Name *</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <Label>Flight</Label>
                    <Select value={form.flight} onValueChange={val => setForm({...form, flight: val})}>
                      <SelectTrigger><SelectValue placeholder="Select flight" /></SelectTrigger>
                      <SelectContent>
                        {(tournament?.flights || []).map(f => (
                          <SelectItem key={f} value={f}>Flight {f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@email.com" />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(555) 123-4567" />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={!form.name}>Add Player</Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <TournamentSelector tournaments={tournaments} selectedId={selectedTournament} onSelect={setSelectedTournament} />
        {selectedTournament && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..." className="pl-9 bg-card" />
          </div>
        )}
      </div>

      {selectedTournament && (
        <div className="flex items-center gap-4 mb-6">
          <Badge variant="outline" className="text-sm">{players.length} Players</Badge>
          <Badge variant="outline" className="text-sm">{Math.ceil(players.length / 4)} Tables needed</Badge>
        </div>
      )}

      {!selectedTournament ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-muted-foreground">Select a tournament to manage players.</p>
          </CardContent>
        </Card>
      ) : filteredPlayers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No players yet. Add your first player!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(flightGroups).sort().map(([flight, fPlayers]) => (
            <Card key={flight}>
              <CardContent className="pt-6">
                <h3 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary">Flight {flight}</Badge>
                  <span className="text-sm text-muted-foreground font-body font-normal">({fPlayers.length} players)</span>
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>City / State</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fPlayers.map(p => (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setProfilePlayer(p)}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.city_state || '—'}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => confirm('Remove this player?') && deleteMutation.mutate(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Player Profile Modal */}
      {profilePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProfilePlayer(null)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={() => setProfilePlayer(null)}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-5">
              {profilePlayer.photo_url ? (
                <img
                  src={profilePlayer.photo_url}
                  alt={profilePlayer.name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-border mb-3"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <User className="h-9 w-9 text-primary" />
                </div>
              )}
              <h2 className="text-xl font-heading font-semibold text-foreground">{profilePlayer.name}</h2>
              {profilePlayer.flight && (
                <Badge className="mt-1 bg-primary/10 text-primary">Flight {profilePlayer.flight}</Badge>
              )}
            </div>

            {/* Details — name and city only; email/phone visible to admins only */}
            <div className="space-y-3">
              {profilePlayer.city_state && (
                <p className="text-sm text-center text-muted-foreground">{profilePlayer.city_state}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}