import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Sparkles, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/subscriptionPlans';
import { isCapacitorNative } from '@/lib/capacitor-utils';

const PLAN_ICONS = { starter: Zap, pro: Sparkles, club: Building2, individual: Building2 };
const ORGANIZER_PLANS = PLANS.filter(p => !p.is_player_plan);

export default function PricingPlansSection({ section }) {
  const [billing, setBilling] = useState('monthly');
  const isNative = isCapacitorNative();

  const title = section?.title || 'Plans for every organizer';
  const subtitle = section?.subtitle || 'Start free for 14 days. Pay as you grow — subscriptions + a small transaction fee on entry fees you collect.';

  const billingToggle = (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => setBilling('monthly')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >Monthly</button>
      <button
        onClick={() => setBilling('annual')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${billing === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        Annual
        <span className="bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">Save 20%</span>
      </button>
    </div>
  );

  const plans = (
    <div className={`mx-auto ${isNative ? 'px-4' : 'max-w-5xl px-5'} grid md:grid-cols-3 gap-6`}>
      {ORGANIZER_PLANS.map((plan) => {
        const Icon = PLAN_ICONS[plan.id] || Building2;
        const price = billing === 'monthly' ? plan.monthly_price : plan.annual_price;
        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 bg-card p-6 flex flex-col transition-shadow ${
              plan.popular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {plan.league_limit ? `Up to ${plan.league_limit} events` : 'Unlimited events'}
                </p>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${price}</span>
                <span className="text-muted-foreground text-sm">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              {billing === 'annual' && plan.monthly_price && plan.annual_price && (
                <p className="text-xs text-green-600 mt-1">${Math.round(plan.annual_price / 12)}/mo billed annually</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-5">+ {plan.transaction_fee_pct}% on entry fees collected</p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild className={`w-full ${plan.popular ? 'bg-primary' : ''}`}>
              <Link to="/pricing">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        );
      })}
    </div>
  );

  if (isNative) {
    return (
      <section className="px-4 py-5">
        <div className="text-center mb-4">
          <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-[14px] text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {billingToggle}
        <div className="mt-6">{plans}</div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20 bg-muted/40 border-y border-border">
      <div className="text-center mb-8 max-w-6xl mx-auto px-5">
        <h2 className="text-3xl font-heading font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">{subtitle}</p>
        {billingToggle}
      </div>
      <div className="mt-10">{plans}</div>
      <p className="text-center mt-8 text-sm text-muted-foreground">
        All plans include a 14-day free trial. Cancel anytime.
      </p>
    </section>
  );
}