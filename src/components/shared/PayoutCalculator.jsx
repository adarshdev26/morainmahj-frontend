import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Info } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/lib/AuthContext';
import { getTransactionFeePct, calculatePlatformFee, formatCents } from '@/lib/platform-fee';
import { PLAN_MAP } from '@/lib/subscriptionPlans';

/**
 * A live payout calculator shown in event setup forms.
 * Helps organizers understand exactly how much they earn vs. what players pay.
 *
 * Props:
 *  - entryFeeDollars: string|number  The organizer-set entry/membership fee in dollars
 *  - playerCap: number               Expected number of paying players (optional)
 *  - paymentModel: string            'all_in' | 'app_fee_only' | 'director_pays' | 'paid' | 'none'
 *  - entityType: string              'Tournament' | 'League' | 'Course' (for label)
 */
export default function PayoutCalculator({ entryFeeDollars, playerCap, paymentModel, entityType = 'Event' }) {
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription(user);

  const planId = subscription?.plan || 'starter';
  const planName = PLAN_MAP[planId]?.name || 'Starter';
  const feePct = getTransactionFeePct(planId);

  const entryDollars = parseFloat(entryFeeDollars) || 0;
  const entryCents = Math.round(entryDollars * 100);
  const playerCount = parseInt(playerCap, 10) || 0;

  // director_pays or none → no charge to players
  const noCharge = !paymentModel || paymentModel === 'none' || paymentModel === 'director_pays';

  const platformFeeCents = noCharge ? 0 : calculatePlatformFee(entryCents, planId);
  const totalPerPlayerCents = noCharge ? 0 : entryCents + platformFeeCents;
  const netPerPlayerCents = noCharge ? 0 : entryCents; // organizer keeps the entry fee
  const grossTotalCents = netPerPlayerCents * playerCount;
  const platformTotalCents = platformFeeCents * playerCount;
  const netTotalCents = grossTotalCents; // platform fee is added on top, not deducted

  if (noCharge) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Calculator className="h-4 w-4 text-slate-500" /> Payout Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Enable a paid payment model and set an entry fee to see your estimated earnings and the platform fee breakdown.</p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Your plan: <span className="font-medium text-slate-600">{isActive ? planName : 'Free (2.5%)'}</span> · Transaction fee: <span className="font-medium text-slate-600">{feePct}%</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-heading">
          <Calculator className="h-4 w-4 text-emerald-600" /> Payout Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Per-player breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Per Player</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Entry Fee (you keep)</span>
            <span className="font-medium text-slate-800">{formatCents(entryCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Platform Fee ({feePct}%)</span>
            <span className="font-medium text-slate-800">{formatCents(platformFeeCents)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
            <span className="font-medium text-slate-700">Player Pays Total</span>
            <span className="font-bold text-slate-900">{formatCents(totalPerPlayerCents)}</span>
          </div>
        </div>

        {/* Projected totals */}
        {playerCount > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Projected ({playerCount} {playerCount === 1 ? 'player' : 'players'})
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Gross Collected</span>
              <span className="font-medium text-slate-800">{formatCents(totalPerPlayerCents * playerCount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Platform Fees</span>
              <span className="font-medium text-red-600">−{formatCents(platformTotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
              <span className="font-medium text-emerald-700">Your Net Earnings</span>
              <span className="font-bold text-emerald-700 text-base">{formatCents(netTotalCents)}</span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-slate-400 pt-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            Based on your <span className="font-medium">{isActive ? planName : 'Free'}</span> plan ({feePct}% fee).
            The platform fee is added on top of your entry fee — players pay it, not you.
            Final amounts are calculated at checkout.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}