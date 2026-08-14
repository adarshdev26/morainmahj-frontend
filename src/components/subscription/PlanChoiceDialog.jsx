import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard } from 'lucide-react';

export default function PlanChoiceDialog({ plan, billing, open, onOpenChange, onTrial, onPay, loading }) {
  if (!plan) return null;

  const price = billing === 'monthly' ? plan.monthly_price : plan.annual_price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">{plan.name} Plan</DialogTitle>
          <DialogDescription>
            ${price}/{billing === 'monthly' ? 'mo' : 'yr'}{plan.is_player_plan ? ' \u00b7 Player membership' : ` \u00b7 +${plan.transaction_fee_pct}% on entry fees collected`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Start Free Trial */}
          <div className="border-2 border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold">Start 14-Day Free Trial</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Full access to all features. No payment required. Cancel anytime.
            </p>
            <Button
              onClick={onTrial}
              disabled={!!loading}
              variant="outline"
              className="w-full mt-3"
            >
              {loading === 'trial' ? 'Starting trial…' : 'Start Free Trial'}
            </Button>
          </div>

          {/* Pay Now */}
          <div className="border-2 border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="font-semibold">Pay Now</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Skip the trial and start your paid subscription immediately via Stripe.
            </p>
            <Button
              onClick={onPay}
              disabled={!!loading}
              className="w-full mt-3"
            >
              {loading === 'pay' ? 'Redirecting to checkout…' : `Pay $${price} Now`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}