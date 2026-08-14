import React, { useState, useEffect } from "react";
import { me as authMe } from '@/services/authApi';
import { callAction } from '@/services/actions';
import PaymentLegalNotice from '@/components/shared/PaymentLegalNotice';
import PlanChoiceDialog from '@/components/subscription/PlanChoiceDialog';
import { subscriptions as subscriptionsApi } from '@/services/resources';
import { redirectToLogin } from "@/lib/capacitor-utils";
import { PLANS, isSubscriptionActive, trialDaysRemaining } from "@/lib/subscriptionPlans";
import { Check, Zap, Sparkles, Building2, Percent, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import BackButton from '@/components/shared/BackButton';
import { Link } from "react-router-dom";

const PLAYER_PLANS = PLANS.filter(p => p.is_player_plan);
const ORGANIZER_PLANS = PLANS.filter(p => !p.is_player_plan);
const PLAN_ICONS = { individual: Users, starter: Zap, pro: Sparkles, club: Building2 };

export default function Pricing() {
  const { toast } = useToast();
  const [billing, setBilling] = useState("monthly");
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await authMe();
        setUser(me);
        if (me) {
          const subs = await subscriptionsApi.filter({ user_id: me.id });
          setSubscription(subs[0] ?? null);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const openChoiceDialog = (plan) => {
    if (!user) { redirectToLogin('/pricing'); return; }
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  const extractError = (err) => {
    return err?.response?.data?.error || err?.message || 'Something went wrong';
  };

  const handleTrial = async () => {
    if (!selectedPlan || !user) return;
    try {
      setCheckingOut('trial');
      await callAction("startTrial", {
        plan: selectedPlan.id,
        billing_period: billing,
      });
      toast({ title: "14-day trial started!", description: `You're on the ${selectedPlan.name} plan trial.` });
      window.location.href = selectedPlan.is_player_plan ? "/app" : "/admin";
    } catch (err) {
      const msg = extractError(err);
      if (msg.includes('already have an active subscription')) {
        toast({ title: "Already subscribed", description: "Redirecting to your dashboard…" });
        window.location.href = selectedPlan.is_player_plan ? "/app" : "/admin";
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
      setCheckingOut(null);
    }
  };

  const handlePay = async () => {
    if (!selectedPlan || !user) return;
    try {
      setCheckingOut('pay');
      const priceId = billing === "monthly" ? selectedPlan.monthly_price_id : selectedPlan.annual_price_id;
      const res = await callAction("createSubscriptionCheckout", {
        price_id: priceId,
        plan: selectedPlan.id,
        billing_period: billing,
      });
      window.location.href = res.url;
    } catch (err) {
      toast({ title: "Error", description: extractError(err), variant: "destructive" });
      setCheckingOut(null);
    }
  };

  const currentPlan = subscription?.plan;
  const isActive = isSubscriptionActive(subscription);
  const daysLeft = trialDaysRemaining(subscription);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background px-4 pb-6" style={{ paddingTop: 'calc(var(--safe-area-top) + 16px)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BackButton fallbackPath="/app" />
          </div>
          <div className="text-center pt-4">
            <Badge className="mb-4 bg-primary/10 text-primary border-0">Simple, transparent pricing</Badge>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">Plans for players &amp; organizers</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Players get app access and event discounts. Organizers get tools to run tournaments, leagues, and classes.
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >Monthly</button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Annual
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">Save 20%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Player Plans */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-heading font-bold text-foreground">For Players</h2>
        </div>
        <div className="grid gap-6">
          {PLAYER_PLANS.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || Users;
            const price = billing === "monthly" ? plan.monthly_price : plan.annual_price;
            const isCurrent = currentPlan === plan.id && isActive;
            const isTrialing = subscription?.status === "trialing" && currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl border-2 border-primary bg-card p-6 flex flex-col transition-shadow shadow-lg shadow-primary/10 mt-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">Player membership</p>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-muted-foreground text-sm">/{billing === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  {billing === "annual" && plan.monthly_price && plan.annual_price && (
                    <p className="text-xs text-green-600 mt-1">${Math.round(plan.annual_price / 12)}/mo billed annually</p>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => openChoiceDialog(plan)}
                  disabled={isCurrent || !!checkingOut}
                  className={`w-full ${!isCurrent ? "bg-primary" : ""}`}
                  variant={isCurrent ? "outline" : "default"}
                >
                  {checkingOut === plan.id ? "Loading…" : isCurrent ? (isTrialing ? `Trialing — ${daysLeft}d left` : "Current Plan") : "Start Free Trial"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Organizer Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-heading font-bold text-foreground">For Organizers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {ORGANIZER_PLANS.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || Users;
            const price = billing === "monthly" ? plan.monthly_price : plan.annual_price;
            const isCurrent = currentPlan === plan.id && isActive;
            const isTrialing = subscription?.status === "trialing" && currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 bg-card p-6 flex flex-col transition-shadow ${
                  plan.popular ? "border-primary shadow-lg shadow-primary/10 mt-6" : "border-border mt-6"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {plan.league_limit ? `Up to ${plan.league_limit} events` : "Unlimited events"}
                    </p>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-muted-foreground text-sm">/{billing === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  {billing === "annual" && plan.monthly_price && plan.annual_price && (
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
                <Button
                  onClick={() => openChoiceDialog(plan)}
                  disabled={isCurrent || !!checkingOut}
                  className={`w-full ${plan.popular && !isCurrent ? "bg-primary" : ""}`}
                  variant={isCurrent ? "outline" : "default"}
                >
                  {checkingOut === plan.id ? "Loading…" : isCurrent ? (isTrialing ? `Trialing — ${daysLeft}d left` : "Current Plan") : "Start Free Trial"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue model explainer */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-heading font-bold text-center mb-2">How revenue works</h2>
        <p className="text-center text-muted-foreground text-sm mb-8">Three streams designed to grow with your events</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold mb-2">Monthly Subscription</h3>
            <p className="text-sm text-muted-foreground">Your base platform access. Scales from $29/mo for small clubs to $299/mo for full associations.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Percent className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-bold mb-2">Transaction Fee</h3>
            <p className="text-sm text-muted-foreground">1.5–2.5% on entry fees processed through the app. A 100-player tournament at $50/head = $125–$190 in fees.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-bold mb-2">Course Marketplace</h3>
            <p className="text-sm text-muted-foreground">List paid Mah Jongg classes publicly. We take 10% of enrollment fees — zero extra work for you.</p>
          </div>
        </div>
      </div>

      {/* Transaction fee example table */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-1">How the Transaction Fee Works</h3>
          <p className="text-sm text-muted-foreground mb-4">
            A small fee (1.5–2.5%) is added to entry fees collected through the app. Organizers pass this on to players at checkout — no out-of-pocket cost to the director.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Event Size</th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Entry Fee</th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Platform Fee (Pro @ 2%)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: "50 Players", fee: "$50/head", platform: "$50" },
                  { size: "100 Players", fee: "$50/head", platform: "$100" },
                  { size: "150 Players", fee: "$75/head", platform: "$225" },
                  { size: "200 Players", fee: "$100/head", platform: "$400" },
                ].map((row) => (
                  <tr key={row.size} className="border-b border-border/50">
                    <td className="py-2.5 px-3 text-foreground">{row.size}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{row.fee}</td>
                    <td className="py-2.5 px-3 font-semibold text-primary">{row.platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Example only — actual fees are calculated dynamically based on your plan and event size.
          </p>
        </div>
      </div>

      <div className="text-center pb-8 text-sm text-muted-foreground">
        All plans include a 14-day free trial. Cancel anytime.
        {user && (
          <span> · <a href="/admin/subscription" className="underline hover:text-foreground">Manage subscription</a></span>
        )}
      </div>
       {/* // <div className="text-center pb-4">
      //   <Link to="/business-plan" className="text-sm text-primary underline">View full business plan & investor pitch →</Link>
      // </div>*/}
      <PaymentLegalNotice className="text-center pb-16 text-xs text-muted-foreground" action="subscribing" />
      <PlanChoiceDialog
        plan={selectedPlan}
        billing={billing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTrial={handleTrial}
        onPay={handlePay}
        loading={checkingOut}
      />
    </div>
  );
}