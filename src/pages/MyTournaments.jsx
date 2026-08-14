import React, { useEffect, useMemo, useState } from 'react';
import { callAction } from '@/services/actions';
import { registrations as registrationsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { asArray } from '@/lib/ensure-array';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, CreditCard, CheckCircle, CheckCircle2, XCircle, AlertCircle, ArrowRight, Trophy } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import CheckInButton from '@/components/tournament/CheckInButton';
import { format, isPast } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { getEventBadgeKey } from '@/lib/tournament-status';
import {
  navigateToTournamentCard,
  fetchTournamentsByIds,
  mergePlayerRegistrations,
  PLAYER_LIST_STALE_MS,
} from '@/lib/tournament-registration';
import {
  PENDING_TOURNAMENT_PAYMENT_REGISTRATION_KEY,
  invalidateTournamentRegistrationQueries,
  startTournamentCheckout,
} from '@/lib/tournament-checkout';
import { handleTournamentPaymentSuccess } from '@/lib/tournament-payment-success';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import {
  TOURNAMENT_PAYMENT_INTENT_KEY,
  confirmTournamentPayment,
} from '@/lib/tournament-mobile-payment';

const STATUS_CONFIG = {
  live: { label: 'Live', variant: 'default', icon: CheckCircle, className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' },
  pending: { label: 'Invited', variant: 'secondary', icon: AlertCircle },
  confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle },
  checked_in: { label: 'Checked In', variant: 'default', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
  completed: { label: 'Completed', variant: 'outline', icon: Trophy, className: 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200' },
  waitlisted: { label: 'Waitlisted', variant: 'outline', icon: Clock },
  declined: { label: 'Declined', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

const FORCE_CONFIRMED_REG_KEY = 'mm_tournament_payment_force_confirmed_reg_id';

export default function MyTournaments() {
  const { user, isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');
  const paymentSessionId = searchParams.get('session_id') || searchParams.get('sessionId');
  const paymentRegistrationId = searchParams.get('registration_id') || searchParams.get('registrationId');
  const [actionLoading, setActionLoading] = useState(false);

  const promoteRegistrationToConfirmedInCache = (registrationId) => {
    if (!registrationId) return;
    const promote = (rows) =>
      Array.isArray(rows)
        ? rows.map((row) =>
            row?.id === registrationId
              ? {
                  ...row,
                  status: 'confirmed',
                  payment_status: 'paid',
                }
              : row,
          )
        : rows;

    queryClient.setQueriesData({ queryKey: ['regs-by-email'] }, promote);
    queryClient.setQueriesData({ queryKey: ['regs-by-pid'] }, promote);
  };

  const invalidateRegistrationQueries = async () => {
    await invalidateTournamentRegistrationQueries(queryClient);
  };

  useEffect(() => {
    if (!paymentResult) return;
    console.log('[MYT STEP 1] Payment redirect handler started:', {
      paymentResult,
      paymentSessionId: paymentSessionId || null,
      paymentRegistrationId: paymentRegistrationId || null,
    });

    let cancelled = false;
    const pendingRegId =
      paymentRegistrationId || localStorage.getItem(PENDING_TOURNAMENT_PAYMENT_REGISTRATION_KEY);
    console.log('[MYT STEP 2] Resolved pending registration ID:', pendingRegId || null);

    const clearPaymentQueryParam = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      next.delete('session_id');
      next.delete('sessionId');
      next.delete('registration_id');
      next.delete('registrationId');
      setSearchParams(next, { replace: true });
    };

    const verifyPaymentSession = async () => {
      if (!paymentSessionId) return null;
      try {
        console.log('[MYT STEP 3] Calling verifyTournamentPayment');
        const data = await callAction('verifyTournamentPayment', {
          session_id: paymentSessionId,
          registration_id: pendingRegId || undefined,
        });
        console.log('[MYT STEP 4] verifyTournamentPayment result:', data);
        return data;
      } catch (err) {
        console.error('[MYT FAILED] verifyTournamentPayment failed:', err);
        return null;
      }
    };

    const confirmNativePayment = async () => {
      if (!isCapacitorNative() || paymentSessionId) return null;

      let paymentIntentId = '';
      try {
        paymentIntentId = sessionStorage.getItem(TOURNAMENT_PAYMENT_INTENT_KEY) || '';
      } catch {
        paymentIntentId = '';
      }
      if (!paymentIntentId) return null;

      const registrationId = pendingRegId || undefined;
      console.log('[MYT STEP 5A] registrationId:', registrationId);
      console.log('[MYT STEP 5B] paymentIntentId:', paymentIntentId);
      console.log('[MYT STEP 5C] userId:', user?.id);

      try {
        const result = await confirmTournamentPayment(paymentIntentId, { registrationId });
        console.log(
          '[MYT STEP 6] confirmTournamentPayment result:',
          JSON.stringify(result, null, 2),
        );
        return result;
      } catch (error) {
        console.error('[MYT STEP 6 ERROR]', JSON.stringify(error, null, 2));
        return null;
      }
    };

    const pollForPaymentConfirmation = async () => {
      if (!pendingRegId) return false;
      console.log('[MYT STEP 7] Polling registration status for:', pendingRegId);

      for (let i = 0; i < 8; i += 1) {
        if (cancelled) return false;
        const rows = await registrationsApi.filter({ id: pendingRegId });
        const reg = rows[0];
        console.log('[MYT STEP 7A] Poll iteration:', i + 1, {
          status: reg?.status ?? null,
          payment_status: reg?.payment_status ?? null,
        });
        if (reg?.payment_status === 'paid' || reg?.status === 'confirmed') {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      return false;
    };

    const refreshAfterPaymentRedirect = async () => {
      try {
        if (paymentResult === 'success') {
          console.log('[MYT STEP 8] Success branch entered');
          const nativeConfirmation = await confirmNativePayment();
          const verification = await verifyPaymentSession();
          const paidFromVerification = Boolean(
            nativeConfirmation?.paid ||
            nativeConfirmation?.registration?.payment_status === 'paid' ||
            nativeConfirmation?.registration?.status === 'confirmed' ||
            verification?.paid ||
            verification?.registration?.payment_status === 'paid' ||
            verification?.registration?.status === 'confirmed',
          );
          console.log('[MYT STEP 9] Paid check from verification/native:', {
            paidFromVerification,
            nativeConfirmation: nativeConfirmation || null,
            verification: verification || null,
          });
          const paid = paidFromVerification || (await pollForPaymentConfirmation());
          console.log('[MYT STEP 10] Final paid result:', paid);
          await invalidateRegistrationQueries();
          if (paid && pendingRegId) {
            console.log('[MYT STEP 11] Promoting cache status to confirmed for:', pendingRegId);
            promoteRegistrationToConfirmedInCache(pendingRegId);
            await handleTournamentPaymentSuccess({
              registrationId: pendingRegId,
              queryClient,
              toast,
            });
            console.log('[MYT STEP 12] handleTournamentPaymentSuccess completed');
          }
          if (!cancelled) {
            console.log('[MYT STEP 13] Showing payment result toast');
            toast({
              title: paid ? 'Payment confirmed' : 'Payment submitted',
              description: paid
                ? 'Your tournament registration is now confirmed.'
                : 'We are syncing your payment now. Pull to refresh if needed.',
            });
          }
        } else if (!cancelled) {
          toast({
            title: 'Payment cancelled',
            description: 'Your invitation is still pending. You can pay and confirm anytime.',
          });
        }
      } finally {
        console.log('[MYT STEP 14] Clearing pending payment keys');
        localStorage.removeItem(PENDING_TOURNAMENT_PAYMENT_REGISTRATION_KEY);
        try {
          sessionStorage.removeItem(TOURNAMENT_PAYMENT_INTENT_KEY);
        } catch {
          /* ignore */
        }
        if (!cancelled) clearPaymentQueryParam();
      }
    };

    refreshAfterPaymentRedirect();

    return () => {
      cancelled = true;
    };
  }, [
    paymentResult,
    paymentSessionId,
    paymentRegistrationId,
    queryClient,
    searchParams,
    setSearchParams,
    toast,
  ]);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    let forcedRegId = null;
    try {
      forcedRegId = localStorage.getItem(FORCE_CONFIRMED_REG_KEY);
    } catch {
      forcedRegId = null;
    }
    if (!forcedRegId) return;

    promoteRegistrationToConfirmedInCache(forcedRegId);
    invalidateRegistrationQueries().finally(() => {
      try {
        localStorage.removeItem(FORCE_CONFIRMED_REG_KEY);
      } catch {
        /* ignore */
      }
    });
  }, []);

  const { data: regsByEmail = [] } = useQuery({
    queryKey: ['regs-by-email', user?.email],
    queryFn: () => registrationsApi.filter({ player_email: user.email }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.email,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const { data: regsByPlayerId = [] } = useQuery({
    queryKey: ['regs-by-pid', user?.id],
    queryFn: () => registrationsApi.filter({ player_id: user.id }, '-created_date', 200),
    select: asArray,
    enabled: !!user?.id,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const registrations = useMemo(
    () => mergePlayerRegistrations(regsByEmail, regsByPlayerId),
    [regsByEmail, regsByPlayerId],
  );

  const tournamentIdsKey = useMemo(
    () => [...new Set(registrations.map((r) => r.tournament_id).filter(Boolean))].sort().join(','),
    [registrations],
  );

  const { data: tournaments = [] } = useQuery({
    queryKey: ['my-tournaments-by-id', tournamentIdsKey],
    queryFn: () => fetchTournamentsByIds(tournamentIdsKey.split(',').filter(Boolean)),
    enabled: tournamentIdsKey.length > 0,
    staleTime: PLAYER_LIST_STALE_MS,
  });

  const handleRegistrationAction = async (registrationId, action) => {
    if (!registrationId || !action) return;
    setActionLoading(true);
    try {
      await callAction('confirmRegistration', {
        registration_id: registrationId,
        action,
      });
      await invalidateRegistrationQueries();
      toast({ title: action === 'confirm' ? 'Confirmed!' : action === 'decline' ? 'Declined' : 'Cancelled' });
    } catch (err) {
      toast({ title: 'Error', description: err?.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (reg, tournament) => {
    if (window.self !== window.top) {
      alert('Payment only works from the published app. Please open the app directly.');
      return;
    }

    try {
      await startTournamentCheckout({
        tournamentId: tournament.id,
        registrationId: reg.id,
        navigate,
      });
    } catch (err) {
      toast({
        title: 'Payment unavailable',
        description: err?.message || 'Could not start checkout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getTournament = (id) => tournaments.find(t => t.id === id);

  const requiresPaymentThroughApp = (tournament) =>
    ['all_in', 'app_fee_only'].includes(tournament?.payment_model);

  const registrationClosed = (tournament) =>
    tournament?.registration_close_date && isPast(new Date(tournament.registration_close_date));

  const handleRefresh = async () => {
    await invalidateRegistrationQueries();
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isNative = isCapacitorNative();

  const headerBlock = (
    <div className="flex items-center gap-3">
      <BackButton to="/app" />
      <div>
        <h2 className="text-2xl font-heading font-bold">My Tournaments</h2>
        <p className="text-sm text-muted-foreground">Manage your tournament registrations</p>
      </div>
    </div>
  );

  const listBody = registrations.length === 0 ? (
    <div className="text-center py-16 text-muted-foreground">
      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p>You have no tournament invitations yet.</p>
    </div>
  ) : (
    <div className="space-y-4">
      {registrations.map(reg => {
            const t = getTournament(reg.tournament_id);
            if (!t) return null;
            const badgeKey = getEventBadgeKey(t, reg);
            const statusCfg = STATUS_CONFIG[badgeKey] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const closed = registrationClosed(t);
            const needsPayment = requiresPaymentThroughApp(t);
            const isPendingInvite = reg.status === 'pending';

            return (
              <Card
                key={reg.id}
                className={`${isPendingInvite ? '' : 'cursor-pointer'} hover:shadow-lg transition-shadow`}
                onClick={isPendingInvite ? undefined : () => navigateToTournamentCard(navigate, t, reg, '/app/my-tournaments')}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-3 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.date}</span>
                        {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                      </CardDescription>
                    </div>
                    <Badge variant={statusCfg.variant} className={`flex items-center gap-1 shrink-0 ${statusCfg.className || ''}`}>
                      <StatusIcon className="w-3 h-3" />{statusCfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Payment info */}
                  {t.payment_model === 'all_in' && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Entry fee: ${((t.entry_fee || 0) / 100).toFixed(2)} + App fee: ${((t.app_fee || 0) / 100).toFixed(2)}
                      {reg.payment_status === 'paid' && <Badge variant="default" className="ml-2">Paid</Badge>}
                    </div>
                  )}
                  {t.payment_model === 'app_fee_only' && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      App fee: ${((t.app_fee || 0) / 100).toFixed(2)} (entry fee paid separately)
                      {reg.payment_status === 'paid' && <Badge variant="default" className="ml-2">Paid</Badge>}
                    </div>
                  )}

                  {t.registration_close_date && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Registration {closed ? 'closed' : 'closes'}: {format(new Date(t.registration_close_date), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}

                  {reg.status === 'waitlisted' && (
                    <div className="bg-muted rounded p-2 text-sm">
                      You are #{reg.waitlist_position} on the waitlist. You will be notified if a spot opens.
                    </div>
                  )}

                  {/* Action buttons */}
                  {reg.status === 'pending' && !closed && (
                    <div className="flex gap-2 pt-1">
                      {needsPayment ? (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handlePay(reg, t); }}
                          size="sm"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />Pay & Confirm
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegistrationAction(reg.id, 'confirm');
                          }}
                          size="sm"
                          disabled={actionLoading}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />Confirm
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegistrationAction(reg.id, 'decline');
                        }}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-2" />Decline
                      </Button>
                    </div>
                  )}

                  {reg.status === 'confirmed' && (
                    <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/assignments/${t.id}`); }}
                        className="flex-1 min-w-[140px]"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />View Assignments
                      </Button>
                      <CheckInButton tournament={t} registration={reg} variant="card" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleRegistrationAction(reg.id, 'cancel'); }}
                        disabled={actionLoading || closed}
                      >
                        <XCircle className="w-4 h-4 mr-2" />Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      );

  if (isNative) {
    return (
      <div className="h-full flex flex-col native-app-shell">
        <div
          className="bg-primary text-primary-foreground px-4 pb-4 shrink-0 native-app-header"
          style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}
        >
          <div className="flex items-center gap-3">
            <BackButton to="/app" onPrimary />
            <div>
              <h1 className="font-heading font-bold text-xl leading-tight">My Tournaments</h1>
              <p className="text-primary-foreground/60 text-xs mt-0.5">Manage your tournament registrations</p>
            </div>
          </div>
        </div>
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 min-h-0">
          <div className="px-4 py-4 native-bottom-scroll-pad">
            {listBody}
          </div>
        </PullToRefresh>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="flex-1 py-6 max-w-3xl mx-auto pb-[120px]">
      <div className="mb-6">
        {headerBlock}
      </div>
      {listBody}
    </div>
    </PullToRefresh>
    </div>
  );
}