import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callAction } from '@/services/actions';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Mail, UserPlus, CheckCircle, AlertCircle, Clock, XCircle, ArrowUp, ArrowDown, Star } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'outline', icon: AlertCircle, color: 'text-yellow-600' },
  confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle, color: 'text-green-600' },
  waitlisted: { label: 'Waitlisted', variant: 'secondary', icon: Clock, color: 'text-blue-600' },
  declined: { label: 'Declined', variant: 'destructive', icon: XCircle, color: 'text-red-600' },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: XCircle, color: 'text-slate-600' },
};

const PAYMENT_CONFIG = {
  not_required: { label: 'Not Required', variant: 'outline' },
  pending: { label: 'Pending', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  refunded: { label: 'Refunded', variant: 'outline' },
};

export default function TournamentRegistrations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState(null);
  const [flightFilter, setFlightFilter] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [emailsInput, setEmailsInput] = useState('');
  const [inviting, setInviting] = useState(false);

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.list().then(ts => ts.find(t => t.id === id)),
  });

  const { data: registrations = [], refetch: refetchRegistrations } = useQuery({
    queryKey: ['tournament-registrations', id],
    queryFn: () => registrationsApi.filter({ tournament_id: id }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => registrationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', id] });
      setStatusDialogOpen(false);
      setSelectedPlayer(null);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (emails) => callAction('invitePlayer', { tournament_id: id, emails }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-registrations', id] });
      setInviteOpen(false);
      setEmailsInput('');
    },
  });

  const flights = tournament?.flights || [];
  const counts = useMemo(() => {
    return {
      confirmed: registrations.filter(r => r.status === 'confirmed').length,
      pending: registrations.filter(r => r.status === 'pending').length,
      waitlisted: registrations.filter(r => r.status === 'waitlisted').length,
      declined: registrations.filter(r => r.status === 'declined').length,
    };
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchFlight = flightFilter === 'all' || r.flight === flightFilter;
      return matchStatus && matchFlight;
    });
  }, [registrations, statusFilter, flightFilter]);

  const handleStatusChange = async () => {
    if (!selectedPlayer || newStatus === selectedPlayer.status) return;
    await updateMutation.mutateAsync({
      id: selectedPlayer.id,
      data: { status: newStatus },
    });
  };

  const handleQuickPromote = async (regId, currentStatus) => {
    const newSt = currentStatus === 'waitlisted' ? 'confirmed' : 'waitlisted';
    await updateMutation.mutateAsync({
      id: regId,
      data: { status: newSt },
    });
  };

  const handleToggleVip = async (reg) => {
    await updateMutation.mutateAsync({ id: reg.id, data: { vip: !reg.vip } });
  };

  const handleInvite = async () => {
    setInviting(true);
    const emails = emailsInput
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    try {
      await inviteMutation.mutateAsync(emails);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate(`/admin/tournament/${id}`)} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Back to Tournament
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Registrations</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tournament?.name}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="ml-auto gap-2">
          <UserPlus className="h-4 w-4" /> Invite Players
        </Button>
      </div>

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
      {tournament?.player_cap && (
        <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
          Player cap: {counts.confirmed} / {tournament.player_cap} confirmed
          {tournament.waitlist_enabled && ` · ${counts.waitlisted} on waitlist`}
        </div>
      )}

      {/* Status filter active */}
      {statusFilter && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            Showing {registrations.filter(r => r.status === statusFilter).length} {statusFilter} player(s)
          </span>
          <button onClick={() => setStatusFilter(null)} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear filter</button>
        </div>
      )}

      {/* Flight filters */}
      {flights.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
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
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg">
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
                      No registrations found.
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
                          {tournament?.payment_model === 'director_pays' || tournament?.payment_model === 'none'
                            ? <span className="text-muted-foreground text-xs">N/A</span>
                            : <Badge variant={pc.variant}>{pc.label}</Badge>
                          }
                        </td>
                        <td className="p-3">{reg.waitlist_position || '—'}</td>
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
                          {reg.status === 'waitlisted' && (
                            <Button variant="outline" size="sm" onClick={() => handleQuickPromote(reg.id, 'waitlisted')} className="gap-1">
                              <ArrowUp className="h-3 w-3" /> Confirm
                            </Button>
                          )}
                          {reg.status === 'confirmed' && (
                            <Button variant="outline" size="sm" onClick={() => handleQuickPromote(reg.id, 'confirmed')} className="gap-1">
                              <ArrowDown className="h-3 w-3" /> Waitlist
                            </Button>
                          )}
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
        </CardContent>
      </Card>

      {/* Status Dialog */}
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
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
              <Mail className="w-5 h-5" /> Invite Players
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
  );
}