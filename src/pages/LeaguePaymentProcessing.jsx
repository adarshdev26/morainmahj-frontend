import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BackButton from '@/components/shared/BackButton';
import PaymentLegalNotice from '@/components/shared/PaymentLegalNotice';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import { presentNativePaymentSheet } from '@/lib/stripe-native';
import {
  createLeaguePaymentIntent,
  syncLeaguePaymentAfterSheetComplete,
} from '@/lib/league-mobile-payment';
import {
  invalidateLeagueMemberQueries,
  PENDING_LEAGUE_PAYMENT_MEMBER_KEY,
} from '@/lib/league-checkout';

const PHASE = {
  PREPARING: 'preparing',
  READY: 'ready',
  PAYING: 'paying',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

function navigateAfterLeaguePayment({ navigate, queryClient, memberId }) {
  localStorage.removeItem(PENDING_LEAGUE_PAYMENT_MEMBER_KEY);
  invalidateLeagueMemberQueries(queryClient);
  const params = new URLSearchParams({ payment: 'success' });
  if (memberId) params.set('member_id', memberId);
  navigate(`/app/leagues?${params.toString()}`, { replace: true });
}

export default function LeaguePaymentProcessing() {
  const { id: leagueId } = useParams();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member_id') || searchParams.get('memberId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);

  const [phase, setPhase] = useState(PHASE.PREPARING);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  const preparePayment = async () => {
    if (!leagueId || !memberId) {
      setError('Missing league or member information.');
      setPhase(PHASE.FAILED);
      return;
    }

    if (!isCapacitorNative()) {
      setError('Native payment is only available in the mobile app.');
      setPhase(PHASE.FAILED);
      return;
    }

    setError(null);
    setPhase(PHASE.PREPARING);

    try {
      const intent = await createLeaguePaymentIntent({ leagueId, memberId });
      setPaymentData(intent);
      setPhase(PHASE.READY);
    } catch (err) {
      console.error('[LeaguePaymentProcessing]', err);
      setError(err?.message || 'Could not prepare payment. Please try again.');
      setPhase(PHASE.FAILED);
    }
  };

  const presentPayment = async () => {
    if (!paymentData) return;

    setError(null);
    setPhase(PHASE.PAYING);

    try {
      const sheetResult = await presentNativePaymentSheet({
        clientSecret: paymentData.clientSecret,
        customerId: paymentData.customerId,
        ephemeralKeySecret: paymentData.ephemeralKeySecret,
        publishableKey: paymentData.publishableKey,
      });

      if (sheetResult.status === 'canceled') {
        setPhase(PHASE.CANCELED);
        return;
      }

      if (sheetResult.status !== 'completed' && sheetResult.completed !== true) {
        throw new Error(sheetResult.error || 'Payment was not completed.');
      }

      const confirmation = await syncLeaguePaymentAfterSheetComplete(paymentData.paymentIntentId, {
        memberId,
      });

      invalidateLeagueMemberQueries(queryClient);
      navigateAfterLeaguePayment({ navigate, queryClient, memberId });
    } catch (err) {
      console.error('[LeaguePaymentProcessing]', err);
      setError(err?.message || 'Could not complete payment. Please try again.');
      setPhase(PHASE.FAILED);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    preparePayment();
  }, [leagueId, memberId]);

  const amountLabel = paymentData?.amount
    ? `$${(paymentData.amount / 100).toFixed(2)}`
    : null;

  const title = {
    [PHASE.PREPARING]: 'Preparing payment…',
    [PHASE.READY]: 'Review your payment',
    [PHASE.PAYING]: 'Complete payment',
    [PHASE.FAILED]: 'Payment not completed',
    [PHASE.CANCELED]: 'Payment canceled',
  }[phase];

  const description = {
    [PHASE.PREPARING]: 'Setting up secure in-app checkout for your league membership.',
    [PHASE.READY]: 'Confirm the amount below, then continue to secure checkout.',
    [PHASE.PAYING]: 'Use the payment sheet to enter your card details.',
    [PHASE.FAILED]: error,
    [PHASE.CANCELED]: 'You can try again whenever you are ready.',
  }[phase];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div
        className="bg-primary text-primary-foreground px-4 pb-4 shrink-0"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}
      >
        <div className="flex items-center gap-3">
          <BackButton to="/app/leagues" />
          <div>
            <h1 className="font-heading font-bold text-xl leading-tight">League Membership</h1>
            <p className="text-primary-foreground/70 text-xs mt-0.5">Native secure checkout</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {phase === PHASE.FAILED || phase === PHASE.CANCELED ? (
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
            ) : phase === PHASE.READY ? (
              <CreditCard className="h-12 w-12 mx-auto text-primary" />
            ) : (
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            )}

            {phase !== PHASE.READY && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <CreditCard className="h-5 w-5" />
                <span className="text-sm font-medium">Stripe PaymentSheet</span>
              </div>
            )}

            <div>
              <h2 className="font-semibold text-lg text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{description}</p>
            </div>

            {paymentData?.league?.name && (
              <p className="text-sm text-foreground">{paymentData.league.name}</p>
            )}

            {paymentData?.entry_fee != null && paymentData?.platform_fee != null ? (
              <div className="w-full space-y-1.5 text-left bg-muted/40 rounded-lg p-3">
                {paymentData.entry_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Membership Fee</span>
                    <span className="font-medium">${(paymentData.entry_fee / 100).toFixed(2)}</span>
                  </div>
                )}
                {paymentData.platform_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee ({paymentData.platform_fee_pct}%)</span>
                    <span className="font-medium">${(paymentData.platform_fee / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5">
                  <span>Total</span>
                  <span>{amountLabel}</span>
                </div>
              </div>
            ) : amountLabel ? (
              <p className="text-lg font-semibold text-foreground">{amountLabel}</p>
            ) : null}

            {phase === PHASE.READY && (
              <div className="space-y-3 pt-2">
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-3">
                  <PaymentLegalNotice className="text-xs text-muted-foreground leading-relaxed" />
                </div>
                <Button className="w-full gap-2" onClick={presentPayment}>
                  <CreditCard className="h-4 w-4" />
                  Pay {amountLabel || 'now'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/app/leagues', { replace: true })}
                >
                  Back to leagues
                </Button>
              </div>
            )}

            {(phase === PHASE.FAILED || phase === PHASE.CANCELED) && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-3">
                  <PaymentLegalNotice className="text-xs text-muted-foreground leading-relaxed" />
                </div>
                <Button
                  onClick={() => {
                    if (paymentData) {
                      setPhase(PHASE.READY);
                    } else {
                      startedRef.current = false;
                      preparePayment();
                    }
                  }}
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/app/leagues', { replace: true })}
                >
                  Back to leagues
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}