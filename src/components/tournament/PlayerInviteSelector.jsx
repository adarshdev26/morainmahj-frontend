import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { players as playersApi, registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerInviteSelector({ tournamentId, tournament }) {
  const queryClient = useQueryClient();
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [filterMode, setFilterMode] = useState('all'); // all, search, pastTournament
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => playersApi.list(),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list(),
  });

  const { data: existingRegistrations = [] } = useQuery({
    queryKey: ['registrations', tournamentId],
    queryFn: () => registrationsApi.filter({ tournament_id: tournamentId }),
    enabled: !!tournamentId,
  });

  const { data: pastRegistrations = [] } = useQuery({
    queryKey: ['pastRegistrations', selectedTournament],
    queryFn: () =>
      selectedTournament
        ? registrationsApi.filter({ tournament_id: selectedTournament })
        : Promise.resolve([]),
    enabled: !!selectedTournament,
  });

  const inviteMutation = useMutation({
    mutationFn: async (playerIds) => {
      const invites = playerIds.map(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        return {
          tournament_id: tournamentId,
          player_id: playerId,
          player_email: player.email,
          player_name: player.name,
          player_phone: player.phone || '',
          player_city_state: player.city_state || '',
          player_photo_url: player.photo_url || '',
          status: 'pending',
        };
      });
      return await registrationsApi.bulkCreate(invites);
    },
    onSuccess: (result) => {
      toast.success(`Invited ${result.length} player(s)`);
      queryClient.invalidateQueries({ queryKey: ['registrations', tournamentId] });
      setSelectedPlayers(new Set());
      setFilterMode('all');
      setSearchQuery('');
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  // Filter players based on current mode
  const filteredPlayers = useMemo(() => {
    const alreadyInvited = new Set(existingRegistrations.map(r => r.player_id));
    let results = allPlayers.filter(p => !alreadyInvited.has(p.id));

    if (filterMode === 'search' && searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          (p.city_state && p.city_state.toLowerCase().includes(query))
      );
    }

    if (filterMode === 'pastTournament' && selectedTournament) {
      const pastPlayerIds = new Set(pastRegistrations.map(r => r.player_id));
      results = results.filter(p => pastPlayerIds.has(p.id));
    }

    return results;
  }, [filterMode, searchQuery, selectedTournament, allPlayers, existingRegistrations, pastRegistrations]);

  const handleSelectAll = () => {
    if (selectedPlayers.size === filteredPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const handleTogglePlayer = (playerId) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const handleInvite = () => {
    if (selectedPlayers.size === 0) {
      toast.error('Select at least one player');
      return;
    }
    inviteMutation.mutate(Array.from(selectedPlayers));
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Invite Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Filter by:</Label>
            <div className="flex gap-2">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilterMode('all');
                  setSearchQuery('');
                  setSelectedTournament('');
                }}
              >
                All Players
              </Button>
              <Button
                variant={filterMode === 'search' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('search')}
              >
                Search
              </Button>
              <Button
                variant={filterMode === 'pastTournament' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('pastTournament')}
              >
                Past Tournament
              </Button>
            </div>
          </div>

          {filterMode === 'search' && (
            <div>
              <Label htmlFor="search">Search by name, email, or location</Label>
              <Input
                id="search"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {filterMode === 'pastTournament' && (
            <div>
              <Label htmlFor="tournament-select">Select tournament</Label>
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger id="tournament-select">
                  <SelectValue placeholder="Pick a tournament..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">{filteredPlayers.length} player(s) available</CardTitle>
          {filteredPlayers.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedPlayers.size === filteredPlayers.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {filteredPlayers.length === 0 ? (
            <p className="text-sm text-slate-600">No players available with this filter.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-slate-100"
                >
                  <Checkbox
                    checked={selectedPlayers.has(player.id)}
                    onCheckedChange={() => handleTogglePlayer(player.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{player.name}</p>
                    <p className="text-xs text-slate-500 truncate">{player.email}</p>
                    {player.city_state && <p className="text-xs text-slate-500">{player.city_state}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary and Action */}
      {filteredPlayers.length > 0 && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-slate-600" />
              <span className="font-medium">
                {selectedPlayers.size} of {filteredPlayers.length} selected
              </span>
            </div>
            <Button
              onClick={handleInvite}
              disabled={selectedPlayers.size === 0 || inviteMutation.isPending}
              className="gap-2"
            >
              {inviteMutation.isPending ? (
                <>Sending invites...</>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Invites
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}