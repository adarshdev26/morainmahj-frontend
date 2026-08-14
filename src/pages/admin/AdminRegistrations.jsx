import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { callAction } from '@/services/actions';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, CheckCircle, Clock, XCircle, AlertCircle, Users, Plane, ArrowUp, ArrowDown, ChevronLeft, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  waitlisted: { label: 'Waitlisted', variant: 'outline' },
  declined: { label: 'Declined', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const PAYMENT_CONFIG = {
  not_required: { label: 'N/A', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'outline' },
  paid: { label: 'Paid', variant: 'default' },
  refunded: { label: 'Refunded', variant: 'destructive' },
};

export default function AdminRegistrations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTournamentId = searchParams.get('tournament');
  const [flightFilter, setFlightFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [emailsInput, setEmailsInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { orgFilter } = useOrganization();

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.filter(orgFilter()),
  });

  const { data: allRegistrations = [] } = useQuery({
    queryKey: ['all-registrations'],
    queryFn: async () => {
      const regs = [];
      for (const t of tournaments) {
        const data = await registrationsApi.filter({ tournament_id: t.id });
        regs.push(...data);
      }
      return regs;
    },
    enabled: tournaments.length > 0,
  });

  const tournament = tournaments.find(t => t.id === urlTournamentId);
  const registrations = urlTournamentId
    ? allRegistrations.filter(r => r.tournament_id === urlTournamentId)
    : allRegistrations;

  const counts = {
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    pending: registrations.filter(r => r.status === 'pending').length,
    waitlisted: registrations.filter(r => r.status === 'waitlisted').length,
    declined: registrations.filter(r => r.status === 'declined').length,
  };

  const flights = [...new Set(registrations.map(r => r.flight).filter(Boolean))].sort();

  // Compute waitlist positions: VIP first, then by created_date
  const waitlistOrder = [...registrations]
    .filter(r => r.status === 'waitlisted')
    .sort((a, b) => {
      if (a.vip && !b.vip) return -1;
      if (!a.vip && b.vip) return 1;
      return new Date(a.created_date) - new Date(b.created_date);
    });
  const waitlistPositionMap = Object.fromEntries(waitlistOrder.map((r, i) => [r.id, i + 1]));

  const handleToggleVip = async (reg) => {
    await registrationsApi.update(reg.id, { vip: !reg.vip });
    queryClient.invalidateQueries({ queryKey: ['all-registrations'] });
  };
  let filteredRegistrations = flightFilter === 'all'
    ? registrations
    : registrations.filter(r => r.flight === flightFilter);
  
  if (statusFilter) {
    filteredRegistrations = filteredRegistrations.filter(r => r.status === statusFilter);
  }

  const handleInvite = async () => {
    const emails = emailsInput.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    setInviting(true);
    try {
    const res = await callAction('invitePlayer', { tournament_id: urlTournamentId, emails });
    const results = res?.results || [];
    const invited = results.filter(r => r.status !== 'already_registered').length;
    const already = results.filter(r => r.status === 'already_registered').length;
    toast({ title: `Invited ${invited} player(s)${already ? `, ${already} already registered` : ''}` });
    setInviteOpen(false);
    setEmailsInput('');
    queryClient.invalidateQueries({ queryKey: ['all-registrations'] });
    } catch (err) {
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const handleStatusChange = async () => {
    if (!selectedPlayer || !newStatus) return;
    try {
      await registrationsApi.update(selectedPlayer.id, { status: newStatus });
      setStatusDialogOpen(false);
      setSelectedPlayer(null);
      setNewStatus('');
      toast({ title: `Updated to ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ['all-registrations'] });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleQuickPromote = async (regId, fromStatus) => {
    let toStatus = 'confirmed';
    if (fromStatus === 'confirmed') toStatus = 'waitlisted';
    await registrationsApi.update(regId, { status: toStatus });
    await queryClient.invalidateQueries({ queryKey: ['all-registrations'] });
    toast({ title: `Moved to ${toStatus}` });
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['all-registrations'] }),
      queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="p-6">
      <PageHeader
        title="Registrations"
        subtitle={urlTournamentId ? `Manage ${tournament?.name || 'tournament'} registrations` : 'View all registrations across tournaments'}
        actions={
           urlTournamentId && (
             <div className="flex gap-2">
               <Button variant="outline" onClick={() => navigate(`/admin/tournament/${urlTournamentId}`)}>
                 <ChevronLeft className="w-4 h-4 mr-2" />Back to Tournament
               </Button>
               <Button onClick={() => setInviteOpen(true)}>
                 <UserPlus className="w-4 h-4 mr-2" />Invite Players
               </Button>
             </div>
           )
         }
      />

      {urlTournamentId && tournament && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Confirmed', count: counts.confirmed, icon: CheckCircle, color: 'text-green-600', status: 'confirmed' },
              { label: 'Pending', count: counts.pending, icon: AlertCircle, color: 'text-yellow-600', status: 'pending' },
              { label: 'Waitlisted', count: counts.waitlisted, icon: Clock, color: 'text-blue-600', status: 'waitlisted' },
              { label: 'Declined', count: counts.declined, icon: XCircle, color: 'text-red-600', status: 'declined' },
            ].map(s => (
              <Card key={s.label} className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === s.status ? 'ring-2 ring-primary' : ''}`} onClick={() => setStatusFilter(statusFilter === s.status ? null : s.status)}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold">{s.count}</p>
                    </div>
                    <s.icon className={`w-6 h-6 ${s.color} opacity-70`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cap info */}
          {tournament.player_cap && (
            <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Player cap: {counts.confirmed} / {tournament.player_cap} confirmed
              {tournament.waitlist_enabled && ` · ${counts.waitlisted} on waitlist`}
            </div>
          )}

          {/* Status and Flight filters */}
          {statusFilter && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">
                Showing {registrations.filter(r => r.status === statusFilter).length} {statusFilter} player(s)
              </span>
              <button onClick={() => setStatusFilter(null)} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear filter</button>
            </div>
          )}

          {flights.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Plane className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Flight:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFlightFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${flightFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  All ({registrations.length})
                </button>
                {flights.map(f => (
                  <button
                    key={f}
                    onClick={() => setFlightFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${flightFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    Flight {f} ({registrations.filter(r => r.flight === f).length})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Registration list */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Player</th>
                  <th className="text-left p-3 font-medium">Flight</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Payment</th>
                  <th className="text-left p-3 font-medium">Waitlist #</th>
                  <th className="text-left p-3 font-medium">Confirmed At</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No registrations yet. Invite players to get started.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map(reg => {
                    const sc = STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending;
                    const pc = PAYMENT_CONFIG[reg.payment_status] || PAYMENT_CONFIG.not_required;
                    return (
                      <tr key={reg.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            {reg.vip && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />}
                            {reg.player_name || '—'}
                          </div>
                        </td>
                        <td className="p-3">
                          {reg.flight ? <Badge variant="outline" className="text-xs">Flight {reg.flight}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-muted-foreground">{reg.player_email}</td>
                        <td className="p-3"><Badge variant={sc.variant}>{sc.label}</Badge></td>
                        <td className="p-3">
                          {tournament.payment_model === 'director_pays' || tournament.payment_model === 'none'
                            ? <span className="text-muted-foreground text-xs">N/A</span>
                            : <Badge variant={pc.variant}>{pc.label}</Badge>
                          }
                        </td>
                        <td className="p-3">{reg.status === 'waitlisted' ? (reg.waitlist_position || waitlistPositionMap[reg.id] || '—') : '—'}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {reg.confirmed_at ? new Date(reg.confirmed_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3 flex gap-1">
                          {reg.status === 'waitlisted' && (
                            <Button variant="outline" size="sm" onClick={() => handleQuickPromote(reg.id, 'waitlisted')} title="Promote to confirmed" className="gap-1">
                              <ArrowUp className="h-3 w-3" /> Confirm
                            </Button>
                          )}
                          {reg.status === 'confirmed' && (
                            <Button variant="outline" size="sm" onClick={() => handleQuickPromote(reg.id, 'confirmed')} title="Move to waitlist" className="gap-1">
                              <ArrowDown className="h-3 w-3" /> Waitlist
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="sm"
                            title={reg.vip ? 'Remove VIP' : 'Mark as VIP'}
                            onClick={() => handleToggleVip(reg)}
                            className={reg.vip ? 'text-yellow-500' : 'text-muted-foreground'}
                          >
                            <Star className={`h-3.5 w-3.5 ${reg.vip ? 'fill-yellow-400' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedPlayer(reg);
                            setNewStatus(reg.status);
                            setStatusDialogOpen(true);
                          }}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                    })
                )}
              </tbody>
            </table>
          </div>
        </>
        )}

        {!urlTournamentId && (
         <>
           {/* Master table: all registrations */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-lg font-semibold">All Registrations</h2>
               <div className="text-xs text-muted-foreground">
                 Total: {allRegistrations.length}
               </div>
             </div>

             {/* Flight and Status filters */}
             {statusFilter && (
               <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                 <span className="text-sm text-blue-700 font-medium">
                   Showing {allRegistrations.filter(r => r.status === statusFilter).length} {statusFilter} player(s)
                 </span>
                 <button onClick={() => setStatusFilter(null)} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear filter</button>
               </div>
             )}

             <div className="flex flex-wrap gap-2 items-center">
               <span className="text-sm text-muted-foreground font-medium">Filter by status:</span>
               {['all', 'pending', 'confirmed', 'waitlisted', 'declined'].map(s => (
                 <button
                   key={s}
                   onClick={() => setStatusFilter(s === 'all' ? null : s)}
                   className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                     (s === 'all' && !statusFilter) || (statusFilter === s)
                       ? 'bg-primary text-primary-foreground'
                       : 'bg-muted text-muted-foreground hover:bg-muted/80'
                   }`}
                 >
                   {s === 'all' ? `All (${allRegistrations.length})` : `${s} (${allRegistrations.filter(r => r.status === s).length})`}
                 </button>
               ))}
             </div>

             {/* Master registrations table */}
             <div className="overflow-x-auto rounded-lg border">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="border-b bg-muted/50">
                     <th className="text-left p-3 font-medium">Player</th>
                     <th className="text-left p-3 font-medium">Tournament</th>
                     <th className="text-left p-3 font-medium">Email</th>
                     <th className="text-left p-3 font-medium">Status</th>
                     <th className="text-left p-3 font-medium">Payment</th>
                     <th className="text-left p-3 font-medium">Confirmed At</th>
                     <th className="text-left p-3 font-medium">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(() => {
                     let rows = allRegistrations;
                     if (statusFilter) {
                       rows = rows.filter(r => r.status === statusFilter);
                     }
                     return rows.length === 0 ? (
                       <tr>
                         <td colSpan={7} className="p-6 text-center text-muted-foreground">
                           No registrations.
                         </td>
                       </tr>
                     ) : (
                       rows.map(reg => {
                         const sc = STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending;
                         const t = tournaments.find(x => x.id === reg.tournament_id);
                         const pc = PAYMENT_CONFIG[reg.payment_status] || PAYMENT_CONFIG.not_required;
                         return (
                           <tr key={reg.id} className="border-b hover:bg-muted/30 transition-colors">
                             <td className="p-3 font-medium">
                               <div className="flex items-center gap-1.5">
                                 {reg.vip && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />}
                                 {reg.player_name || '—'}
                               </div>
                             </td>
                             <td className="p-3 text-sm">
                               <button
                                 onClick={() => navigate(`?tournament=${reg.tournament_id}`)}
                                 className="text-primary hover:underline"
                               >
                                 {t?.name || '—'}
                               </button>
                             </td>
                             <td className="p-3 text-muted-foreground text-xs">{reg.player_email}</td>
                             <td className="p-3"><Badge variant={sc.variant}>{sc.label}</Badge></td>
                             <td className="p-3">
                               {t?.payment_model === 'director_pays' || t?.payment_model === 'none'
                                 ? <span className="text-muted-foreground text-xs">N/A</span>
                                 : <Badge variant={pc.variant}>{pc.label}</Badge>
                               }
                             </td>
                             <td className="p-3 text-muted-foreground text-xs">
                               {reg.confirmed_at ? new Date(reg.confirmed_at).toLocaleDateString() : '—'}
                             </td>
                             <td className="p-3 flex gap-1">
                               <Button
                                 variant="ghost" size="sm"
                                 title={reg.vip ? 'Remove VIP' : 'Mark as VIP'}
                                 onClick={() => handleToggleVip(reg)}
                                 className={reg.vip ? 'text-yellow-500' : 'text-muted-foreground'}
                               >
                                 <Star className={`h-3.5 w-3.5 ${reg.vip ? 'fill-yellow-400' : ''}`} />
                               </Button>
                               <Button variant="ghost" size="sm" onClick={() => {
                                 setSelectedPlayer(reg);
                                 setNewStatus(reg.status);
                                 setStatusDialogOpen(true);
                               }}>
                                 Edit
                               </Button>
                             </td>
                           </tr>
                         );
                       })
                     );
                   })()}
                 </tbody>
               </table>
             </div>
           </div>
         </>
        )}

        {/* Player Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPlayer?.player_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{selectedPlayer?.player_email}</p>
            </div>
            <div>
              <Label>Current Status</Label>
              <div className="mt-1.5">
                <ResponsiveSelect
                  value={newStatus}
                  onValueChange={setNewStatus}
                  title="Update Status"
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'waitlisted', label: 'Waitlisted' },
                    { value: 'declined', label: 'Declined' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={newStatus === selectedPlayer?.status}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />Invite Players
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Email addresses (one per line or comma-separated)</Label>
            <Textarea
              value={emailsInput}
              onChange={e => setEmailsInput(e.target.value)}
              placeholder="player1@email.com&#10;player2@email.com"
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Each player will receive an email invitation and be added to the registration list.
              {tournament?.player_cap && ` Players beyond the cap of ${tournament.player_cap} will be waitlisted${tournament.waitlist_enabled ? ' automatically' : ' (waitlist not enabled)'}.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? 'Inviting...' : 'Send Invitations'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}