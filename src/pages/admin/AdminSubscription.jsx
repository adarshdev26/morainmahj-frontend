import React, { useState, useEffect } from "react";
import { me as authMe } from '@/services/authApi';
import { callAction } from '@/services/actions';
import { leagues as leaguesApi, subscriptions as subscriptionsApi, tournaments as tournamentsApi } from '@/services/resources';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PLAN_MAP, isSubscriptionActive, trialDaysRemaining, getSubscriptionStatus } from "@/lib/subscriptionPlans";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, ExternalLink, CreditCard, BarChart3, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_CONFIG = {
  trialing:     { label: "Free Trial",    cls: "bg-blue-100 text-blue-700",   icon: Clock },
  active:       { label: "Active",        cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  past_due:     { label: "Past Due",      cls: "bg-amber-100 text-amber-700", icon: AlertCircle },
  cancelled:    { label: "Cancelled",     cls: "bg-red-100 text-red-600",     icon: AlertCircle },
  expired:      { label: "Expired",       cls: "bg-red-100 text-red-600",     icon: AlertCircle },
  trial_expired:{ label: "Trial Expired", cls: "bg-red-100 text-red-600",     icon: AlertCircle },
  none:         { label: "No Plan",       cls: "bg-slate-100 text-slate-500", icon: AlertCircle },
};

export default function AdminSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => { authMe().then(setUser).catch(() => {}); }, []);

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["my-subscription", user?.id],
    queryFn: () => subscriptionsApi.filter({ user_id: user.id }, "-created_date", 50),

    enabled: !!user?.id,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ["all-leagues-count"],
    queryFn: () => leaguesApi.list(),
    enabled: !!user,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["all-tournaments-count"],
    queryFn: () => tournamentsApi.list(),
    enabled: !!user,
  });

  const subscription = subscriptions[0] ?? null;
  const status = getSubscriptionStatus(subscription);
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const StatusIcon = statusCfg.icon;
  const plan = PLAN_MAP[subscription?.plan];
  const isActive = isSubscriptionActive(subscription);
  const daysLeft = trialDaysRemaining(subscription);
  const totalCount = leagues.length + tournaments.length;
  const planLimit = plan?.league_limit ?? null;

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      const res = await callAction("cancelSubscription", {});
      toast({
        title: res?.message?.includes("period") ? "Scheduled for cancellation" : "Subscription cancelled",
        description: res?.message,
      });
      await queryClient.invalidateQueries({ queryKey: ["my-subscription", user?.id] });
      window.location.reload();
    } catch (err) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    if (!subscription?.stripe_customer_id) {
      toast({ title: "No billing account", description: "Please select a plan first.", variant: "destructive" });
      return;
    }
    try {
      setPortalLoading(true);
      const res = await callAction("createBillingPortal", {
        return_url: window.location.href,
      });
      window.location.href = res.url;
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-2xl font-heading font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan and billing</p>
      </div>

      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-lg">{plan ? plan.name : "No Plan"}</h2>
              <Badge className={statusCfg.cls}>{statusCfg.label}</Badge>
            </div>
            {subscription?.billing_period && (
              <span className="text-sm text-muted-foreground capitalize">{subscription.billing_period} billing</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "trialing" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> remaining in your free trial.
              {!subscription?.stripe_subscription_id && (
                <span> <Link to="/pricing" className="underline font-medium">Add a payment method</Link> to keep access after the trial.</span>
              )}
            </div>
          )}

          {(status === "past_due" || status === "cancelled" || status === "expired" || status === "trial_expired") && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 inline mr-1.5" />
              Your access is restricted. <Link to="/pricing" className="underline font-medium">Renew or choose a plan</Link> to continue.
            </div>
          )}

          {/* Usage */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Usage
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${
                    planLimit && totalCount >= planLimit ? "bg-red-500" : "bg-primary"
                  }`}
                  style={{ width: planLimit ? `${Math.min(100, (totalCount / planLimit) * 100)}%` : "20%" }}
                />
              </div>
              <span className="text-sm font-medium tabular-nums">
                {totalCount} / {planLimit ?? "∞"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leagues + tournaments combined
            </p>
          </div>

          {/* Dates */}
          {subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              {subscription.status === "cancelled" ? "Access until" : "Next renewal"}:{" "}
              <strong>{format(new Date(subscription.current_period_end), "MMMM d, yyyy")}</strong>
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="outline">
              <Link to="/pricing">Change Plan</Link>
            </Button>
            {subscription?.stripe_customer_id && (
              <Button
                variant="outline"
                onClick={handleBillingPortal}
                disabled={portalLoading}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {portalLoading ? "Loading…" : "Billing Portal"}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {isActive && user?.role === 'organizer_admin' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                    <XCircle className="h-4 w-4" />
                    {status === "trialing" ? "Cancel Trial" : "Cancel Subscription"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {status === "trialing" ? "Cancel your free trial?" : "Cancel your subscription?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {status === "trialing"
                        ? "Your admin access will end immediately. You can restart anytime by choosing a plan."
                        : "Your subscription will be cancelled at the end of the current billing period. You'll retain access until then."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan features */}
      {plan && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-semibold mb-3">Your {plan.name} plan includes:</p>
            <ul className="space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}