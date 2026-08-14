import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callAction } from '@/services/actions';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Mail, Check, X } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function MyInvites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch pending registrations by player_id OR by email (for email-only invites)
  const { data: byId = [], isLoading: loadingById } = useQuery({
    queryKey: ['my-invites-id', user?.id],
    queryFn: () => registrationsApi.filter({ player_id: user.id, status: 'pending' }),
    enabled: !!user?.id,
  });

  const { data: byEmail = [], isLoading: loadingByEmail } = useQuery({
    queryKey: ['my-invites-email', user?.email],
    queryFn: () => registrationsApi.filter({ player_email: user.email, status: 'pending' }),
    enabled: !!user?.email,
  });

  // Merge, deduplicate, and exclude ones already linked to this user's id
  const registrations = React.useMemo(() => {
    const all = [...byId];
    for (const r of byEmail) {
      if (!all.find(x => x.id === r.id)) all.push(r);
    }
    return all;
  }, [byId, byEmail]);

  const isLoading = loadingById || loadingByEmail;

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments-all'],
    queryFn: () => tournamentsApi.list(),
  });

  const tournamentMap = Object.fromEntries(tournaments.map(t => [t.id, t]));

  const acceptMutation = useMutation({
    mutationFn: async (reg) => {
      // First link the player_id if it's missing
      if (!reg.player_id || reg.player_id !== user.id) {
        await registrationsApi.update(reg.id, {
          player_id: user.id,
          player_name: reg.player_name || user.full_name || user.email,
        });
      }
      return callAction('confirmRegistration', {
        registration_id: reg.id,
        action: 'confirm',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-invites'] }),
  });

  const declineMutation = useMutation({
    mutationFn: async (reg) => {
      if (!reg.player_id || reg.player_id !== user.id) {
        await registrationsApi.update(reg.id, { player_id: user.id });
      }
      return callAction('confirmRegistration', {
        registration_id: reg.id,
        action: 'decline',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-invites'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-32 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton to="/app" />
        <div>
          <h1 className="text-2xl font-heading font-semibold">My Invites</h1>
          <p className="text-muted-foreground text-sm mt-1">Pending invitations to upcoming events</p>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pending invites</p>
          <p className="text-sm mt-1">You'll see invitations here when a director adds you to an event.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const t = tournamentMap[reg.tournament_id];
            return (
              <Card key={reg.id}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-heading font-semibold text-base">{t?.name || 'Event'}</h3>
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Invited</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {t?.date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDate(t.date)}</span>
                          </div>
                        )}
                        {t?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => declineMutation.mutate(reg)}
                        disabled={declineMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const tournament = tournamentMap[reg.tournament_id];
                          const requiresPayment = ['all_in', 'app_fee_only'].includes(tournament?.payment_model);
                          if (requiresPayment) {
                            navigate('/app/my-tournaments');
                            return;
                          }
                          acceptMutation.mutate(reg);
                        }}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                    </div>
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