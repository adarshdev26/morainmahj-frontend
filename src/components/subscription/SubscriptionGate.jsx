import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSubscriptionActive, getSubscriptionStatus, trialDaysRemaining, getPlanLimit } from "@/lib/subscriptionPlans";

/**
 * Wraps content that requires an active subscription.
 * Shows an upgrade prompt if the subscription is inactive or at the plan limit.
 *
 * Usage:
 *   <SubscriptionGate subscription={subscription} currentCount={5}>
 *     <Button onClick={createNew}>Create League</Button>
 *   </SubscriptionGate>
 */
export default function SubscriptionGate({ subscription, currentCount = 0, children }) {
  const status = getSubscriptionStatus(subscription);
  const isActive = isSubscriptionActive(subscription);
  const planLimit = subscription ? getPlanLimit(subscription.plan) : 0;
  const atLimit = planLimit !== null && currentCount >= planLimit;
  const daysLeft = trialDaysRemaining(subscription);

  if (!isActive || atLimit) {
    const reason = !isActive
      ? status === "trialing" ? "Your free trial has ended."
        : status === "none" ? "You don't have an active subscription."
        : status === "past_due" ? "Your subscription payment is past due."
        : "Your subscription is no longer active."
      : `You've reached your plan limit of ${planLimit} leagues/tournaments.`;

    return (
      <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center space-y-3">
        <div className="flex justify-center">
          <AlertCircle className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-amber-900">{reason}</p>
          <p className="text-sm text-amber-700 mt-1">
            Upgrade your plan to create more leagues and tournaments.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/pricing">
            View Plans <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  // Trialing — show a gentle reminder banner above the content
  if (status === "trialing" && daysLeft <= 5) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center justify-between gap-3 text-sm text-blue-800">
          <span>
            <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left in your free trial.
          </span>
          <Button asChild size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 gap-1">
            <Link to="/pricing">Upgrade <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        {children}
      </div>
    );
  }

  return children;
}