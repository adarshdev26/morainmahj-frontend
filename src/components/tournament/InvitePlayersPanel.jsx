import { useState } from 'react';
import { callAction } from '@/services/actions';
import { players as playersApi, registrations as registrationsApi } from '@/services/resources';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, UserPlus, Copy, Check, User, Trophy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InvitePlayersPanel({ tournament, registrations, open, onClose, onInvited }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-roster'],
    queryFn: () => playersApi.list({}, { sort: '-created_date', limit: 500 }),
  });

  const { data: allRegistrations = [] } = useQuery({
    queryKey: ['all-registrations-for-invite'],
    queryFn: () => registrationsApi.filter({ status: 'confirmed' }),
  });

  // Compute per-player tournament stats
  const playerStats = {};
  allRegistrations.forEach(r => {
    if (!playerStats[r.player_email]) playerStats[r.player_email] = { tournamentsPlayed: 0 };
    playerStats[r.player_email].tournamentsPlayed += 1;
  });

  // Filter out already-registered players
  const registeredEmails = new Set(registrations.map(r => r.player_email));
  const availablePlayers = allPlayers
    .filter(p =>
      !registeredEmails.has(p.email) &&
      (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'tournaments') return (playerStats[b.email]?.tournamentsPlayed || 0) - (playerStats[a.email]?.tournamentsPlayed || 0);
      if (sortBy === 'location') return (a.city_state || '').localeCompare(b.city_state || '');
      return 0;
    });

  const togglePlayer = (p) => {
    setSelected(prev =>
      prev.find(s => s.id === p.id) ? prev.filter(s => s.id !== p.id) : [...prev, p]
    );
  };

  const handleInvite = async () => {
    if (!selected.length) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const emails = selected.map(p => p.email);
      const res = await callAction('invitePlayer', { tournament_id: tournament.id, emails });
      setInviteResult(res?.results || []);
      setSelected([]);
      onInvited?.();
    } finally {
      setInviting(false);
    }
  };

  const signupLink = `${window.location.origin}/player-signup?tournament_id=${tournament?.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signupLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invite Players
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="roster">
          <TabsList className="w-full">
            <TabsTrigger value="roster" className="flex-1">From Roster</TabsTrigger>
            <TabsTrigger value="link" className="flex-1">Public Signup Link</TabsTrigger>
          </TabsList>

          {/* FROM ROSTER TAB */}
          <TabsContent value="roster" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search players..."
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="tournaments">Most Experienced</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {availablePlayers.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-6">
                  {search ? 'No players match your search.' : 'All roster players are already invited.'}
                </p>
              )}
              {availablePlayers.map(p => {
                const isSelected = selected.find(s => s.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                      : <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-primary" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.city_state || p.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(playerStats[p.email]?.tournamentsPlayed || 0) > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <Trophy className="h-3 w-3" />{playerStats[p.email].tournamentsPlayed}
                        </span>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(availablePlayers)}
                disabled={availablePlayers.length === 0}
                className="text-xs"
              >
                Select All ({availablePlayers.length})
              </Button>
              {selected.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary font-medium">{selected.length} selected</span>
                  <button onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                </div>
              )}
            </div>

            {inviteResult && (
              <div className="text-sm space-y-1">
                {inviteResult.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant={r.status === 'already_registered' ? 'outline' : 'default'} className="text-xs">
                      {r.status === 'already_registered' ? 'Already registered' : r.status}
                    </Badge>
                    <span className="text-slate-600 truncate">{r.email}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900"
              onClick={handleInvite}
              disabled={!selected.length || inviting}
            >
              {inviting ? 'Sending invitations...' : `Invite ${selected.length || ''} Player${selected.length !== 1 ? 's' : ''}`}
            </Button>
          </TabsContent>

          {/* PUBLIC SIGNUP LINK TAB */}
          <TabsContent value="link" className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Share this link with anyone you'd like to invite. They'll be able to sign up and create their player profile, and will be automatically added to <strong>{tournament?.name}</strong>.
            </p>
            <div className="flex gap-2">
              <Input value={signupLink} readOnly className="text-xs bg-slate-50 font-mono" />
              <Button variant="outline" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Anyone with this link can register. They'll need to log in or create an account first.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}