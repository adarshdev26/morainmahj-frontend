import React, { useState, useMemo } from 'react';
import { sendEmail } from '@/services/integrationsApi';
import { callAction } from '@/services/actions';
import { leagues as leaguesApi, players as playersApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Search, Users, Mail, Phone, MapPin, User, Copy, Send } from 'lucide-react';
import PlayerTournamentHistory from '@/components/player/PlayerTournamentHistory';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/components/ui/use-toast';
import { appParams } from '@/lib/app-params';

const emptyForm = { name: '', email: '', phone: '', city: '', state: '', country: '', photo_url: '' };

export default function AdminPlayers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { orgFilter } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [profilePlayer, setProfilePlayer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  // League-invite mode via ?league=ID — curate an invitation list for that league
  const urlParams = new URLSearchParams(window.location.search);
  const leagueId = urlParams.get('league');

  const { data: repo = { players: [], totals: {} }, isLoading } = useQuery({
    queryKey: ['player-repository', orgFilter().organization_id],
    queryFn: () => callAction('getPlayerRepository', { organization_id: orgFilter().organization_id }),
  });
  const players = repo.players || [];

  const { data: league = null } = useQuery({
    queryKey: ['invite-league', leagueId],
    queryFn: () => (leagueId ? leaguesApi.filter({ id: leagueId }).then((r) => r[0]) : null),
    enabled: !!leagueId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? playersApi.update(editing.id, data)
        : playersApi.create({ ...data, organization_id: orgFilter().organization_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-repository'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => playersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player-repository'] }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name || '', email: p.email || '', phone: p.phone || '', city: p.city || '', state: p.state || '', country: p.country || '', photo_url: p.photo_url || '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm); };

  const regionOptions = useMemo(() => {
    const set = new Set();
    players.forEach((p) => { if (p.region) set.add(p.region); });
    return [{ value: 'all', label: 'All Regions' }, ...[...set].sort().map((r) => ({ value: r, label: r }))];
  }, [players]);

  const eventOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Events' }];
    const seen = new Set();
    players.forEach((p) => {
      (p.tournaments || []).forEach((t) => { const k = 't:' + t.id; if (!seen.has(k)) { seen.add(k); opts.push({ value: k, label: '🏆 ' + t.name }); } });
      (p.leagues || []).forEach((l) => { const k = 'l:' + l.id; if (!seen.has(k)) { seen.add(k); opts.push({ value: k, label: '🀄 ' + l.name }); } });
      (p.courses || []).forEach((c) => { const k = 'c:' + c.id; if (!seen.has(k)) { seen.add(k); opts.push({ value: k, label: '📚 ' + c.name }); } });
    });
    return opts;
  }, [players]);

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const ms = !search || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    const mr = regionFilter === 'all' || p.region === regionFilter;
    const mt =
      typeFilter === 'all' ||
      (typeFilter === 'tournament' && p.tournamentCount > 0) ||
      (typeFilter === 'league' && p.leagueCount > 0) ||
      (typeFilter === 'course' && p.courseCount > 0);
    let me = eventFilter === 'all';
    if (!me) {
      const [t, id] = eventFilter.split(':');
      if (t === 't') me = (p.tournaments || []).some((x) => x.id === id);
      else if (t === 'l') me = (p.leagues || []).some((x) => x.id === id);
      else if (t === 'c') me = (p.courses || []).some((x) => x.id === id);
    }
    return ms && mr && mt && me;
  });

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((p) => n.delete(p.id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((p) => n.add(p.id)); return n; });
    }
  };

  const selectedPlayers = filtered.filter((p) => selected.has(p.id) && p.email);

  const copyEmails = () => {
    const emails = selectedPlayers.map((p) => p.email);
    navigator.clipboard.writeText(emails.join(', '));
    toast({ title: `Copied ${emails.length} email${emails.length !== 1 ? 's' : ''}` });
  };

  const inviteToLeague = async () => {
    if (!league || selectedPlayers.length === 0) return;
    const joinUrl = `${(appParams.appBaseUrl || window.location.origin).replace(/\/$/, '')}/league-join?league=${league.id}`;
    let sent = 0;
    for (const p of selectedPlayers) {
      try {
        await sendEmail({
          to: p.email,
          subject: `You're invited to join ${league.name}`,
          body: `Hi ${p.name},\n\nYou've been invited to join ${league.name}.\n\n${league.description ? league.description + '\n\n' : ''}${league.location ? '📍 Location: ' + league.location + '\n' : ''}${league.start_time ? '⏰ Time: ' + league.start_time + (league.end_time ? '–' + league.end_time : '') + '\n' : ''}\nTap below to create your profile and join the roster. You'll receive a reminder before each session to RSVP.\n\n${joinUrl}\n\nThanks!\n— ${league.name} Organizers`,
          from_name: league.name,
        });
        sent++;
      } catch {}
    }
    toast({ title: `Sent ${sent} league invitation${sent !== 1 ? 's' : ''} to ${league.name}` });
    setSelected(new Set());
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['player-repository'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Player Repository</h1>
            <p className="text-muted-foreground text-sm mt-1">
              All players across Morain Mahj — sub-categorized by tournaments, leagues & courses.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2">
            <Plus className="h-4 w-4" /> Add Player
          </Button>
        </div>

        {leagueId && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              {league ? `Curating invitations for: ${league.name}` : 'Loading league…'}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Select players below (by all, region, or past participation), then send league invitations. This invites them to join the league — all sessions.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="pl-9" />
          </div>
          <ResponsiveSelect value={regionFilter} onValueChange={setRegionFilter} triggerClassName="w-48" options={regionOptions} placeholder="Region" title="Filter by region" />
          <ResponsiveSelect
            value={typeFilter}
            onValueChange={setTypeFilter}
            triggerClassName="w-44"
            options={[
              { value: 'all', label: 'All Participation' },
              { value: 'tournament', label: 'Tournament players' },
              { value: 'league', label: 'League players' },
              { value: 'course', label: 'Course students' },
            ]}
            placeholder="Type"
            title="Participation type"
          />
          <ResponsiveSelect value={eventFilter} onValueChange={setEventFilter} triggerClassName="w-56" options={eventOptions} placeholder="Event" title="Filter by specific event" />
          <Badge variant="outline" className="self-center px-3 py-1.5 text-sm">{filtered.length} players</Badge>
        </div>

        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10">
                      <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Participation</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading repository…</TableCell></TableRow>}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground">No players found.</p>
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((p) => (
                    <TableRow key={p.id} className={selected.has(p.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground cursor-pointer" onClick={() => setProfilePlayer(p)}>
                        <div className="flex items-center gap-2">
                          {p.photo_url
                            ? <img src={p.photo_url} alt={p.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                            : <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-3.5 w-3.5 text-primary" /></div>}
                          <div>
                            <div>{p.name}</div>
                            <div className="text-xs font-normal text-muted-foreground">{p.email || '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.region || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.tournamentCount > 0 && <Badge variant="outline" className="text-xs">🏆 {p.tournamentCount}</Badge>}
                          {p.leagueCount > 0 && <Badge variant="outline" className="text-xs">🀄 {p.leagueCount}</Badge>}
                          {p.courseCount > 0 && <Badge variant="outline" className="text-xs">📚 {p.courseCount}</Badge>}
                          {p.tournamentCount === 0 && p.leagueCount === 0 && p.courseCount === 0 && <span className="text-muted-foreground/40 text-xs">No history</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {p.lastActive ? new Date(p.lastActive).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => { if (confirm(`Remove ${p.name}?`)) deleteMutation.mutate(p.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Curation tray */}
        {selected.size > 0 && (
          <div className="sticky bottom-4 mt-4 rounded-xl border border-primary/30 bg-card shadow-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" />
              {selected.size} player{selected.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2" onClick={copyEmails}><Copy className="h-4 w-4" /> Copy Emails</Button>
              {leagueId && (
                <Button size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900" onClick={inviteToLeague} disabled={!league}>
                  <Send className="h-4 w-4" /> Invite to {league?.name || 'League'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        {/* Player Profile Modal */}
        <Dialog open={!!profilePlayer} onOpenChange={() => setProfilePlayer(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {profilePlayer && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    {profilePlayer.photo_url
                      ? <img src={profilePlayer.photo_url} alt={profilePlayer.name} className="h-16 w-16 rounded-full object-cover border-2 border-border shrink-0" />
                      : <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-8 w-8 text-primary" /></div>}
                    <div>
                      <DialogTitle className="font-heading text-lg">{profilePlayer.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {profilePlayer.tournamentCount > 0 && <Badge variant="outline" className="text-xs">🏆 {profilePlayer.tournamentCount} tournament{profilePlayer.tournamentCount !== 1 ? 's' : ''}</Badge>}
                        {profilePlayer.leagueCount > 0 && <Badge variant="outline" className="text-xs">🀄 {profilePlayer.leagueCount} league{profilePlayer.leagueCount !== 1 ? 's' : ''}</Badge>}
                        {profilePlayer.courseCount > 0 && <Badge variant="outline" className="text-xs">📚 {profilePlayer.courseCount} course{profilePlayer.courseCount !== 1 ? 's' : ''}</Badge>}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-3 text-sm text-foreground"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span>{profilePlayer.email || '—'}</span></div>
                  <div className="flex items-center gap-3 text-sm text-foreground"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span>{profilePlayer.phone || '—'}</span></div>
                  <div className="flex items-center gap-3 text-sm text-foreground"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>{profilePlayer.region || '—'}</span></div>
                </div>

                {(profilePlayer.tournaments?.length > 0 || profilePlayer.leagues?.length > 0 || profilePlayer.courses?.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {profilePlayer.tournaments?.length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Tournaments</p>
                        <div className="flex flex-wrap gap-1">{profilePlayer.tournaments.map((t) => <Badge key={t.id} variant="outline" className="text-xs">🏆 {t.name}</Badge>)}</div>
                      </div>
                    )}
                    {profilePlayer.leagues?.length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Leagues</p>
                        <div className="flex flex-wrap gap-1">{profilePlayer.leagues.map((l) => <Badge key={l.id} variant="outline" className="text-xs">🀄 {l.name}</Badge>)}</div>
                      </div>
                    )}
                    {profilePlayer.courses?.length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Courses</p>
                        <div className="flex flex-wrap gap-1">{profilePlayer.courses.map((c) => <Badge key={c.id} variant="outline" className="text-xs">📚 {c.name}</Badge>)}</div>
                      </div>
                    )}
                  </div>
                )}

                {profilePlayer.id && <PlayerTournamentHistory playerId={profilePlayer.id} />}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { setProfilePlayer(null); openEdit(profilePlayer); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Player
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">{editing ? 'Edit Player' : 'Add Player'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Player Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@email.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Austin" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="TX" /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="USA" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={closeDialog}>Cancel</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900" onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.email || saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Player'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  );
}