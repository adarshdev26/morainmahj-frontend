// Subscription plan definitions — updated with new revenue model
// Update Stripe price IDs when you create products in Stripe dashboard

export const PLANS = [
  {
    id: "individual",
    name: "Individual",
    description: "For individual players who want app access & event discounts",
    is_player_plan: true,
    league_limit: 0,
    monthly_price: 4.99,
    annual_price: 48,          // ~$4/mo — 20% off
    monthly_price_id: null,   // set your Stripe price ID here
    annual_price_id: null,
    transaction_fee_pct: 0,
    subscriber_discount_cents: 499, // $4.99 discount on event fees
    features: [
      "Player-only access",
      "Join any public tournament, league, or class",
      "Personal stats & history",
      "MM app fee waived on events",
      "$4.99 discount on event entry fees",
      "Discover & search all public events",
      "0% transaction fee",
      "14-day free trial",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individual directors running a small club",
    league_limit: 3,
    monthly_price: 29,
    annual_price: 279,       // ~$23.25/mo — 20% off
    monthly_price_id: null,  // set your Stripe price ID here
    annual_price_id: null,
    transaction_fee_pct: 2.5,
    features: [
      "Up to 3 leagues or tournaments",
      "RSVP & attendance tracking",
      "Table assignments",
      "Email notifications",
      "2.5% transaction fee on entry fees",
      "14-day free trial",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For active directors running multiple events",
    league_limit: 15,
    monthly_price: 69,
    annual_price: 659,       // ~$54.92/mo — 20% off
    monthly_price_id: null,
    annual_price_id: null,
    transaction_fee_pct: 2.0,
    popular: true,
    features: [
      "Up to 15 leagues or tournaments",
      "Everything in Starter",
      "Scoring & leaderboards",
      "Prize & raffle management",
      "Advanced analytics",
      "Course & instructor marketplace",
      "2% transaction fee on entry fees",
      "14-day free trial",
    ],
  },
  {
    id: "club",
    name: "Club / Association",
    description: "Org-wide license for clubs with multiple directors",
    league_limit: null,
    monthly_price: 299,
    annual_price: 2879,      // ~$239.92/mo — 20% off
    monthly_price_id: null,
    annual_price_id: null,
    transaction_fee_pct: 1.5,
    features: [
      "Unlimited leagues & tournaments",
      "Everything in Pro",
      "Multi-director org management",
      "White-label / custom branding",
      "Priority support",
      "1.5% transaction fee on entry fees",
      "14-day free trial",
    ],
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map(p => [p.id, p]));

export function getPlanLimit(planId) {
  return PLAN_MAP[planId]?.league_limit ?? null;
}

export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  const now = new Date();
  if (subscription.status === "active") return true;
  if (subscription.status === "trialing") {
    return subscription.trial_ends_at
      ? new Date(subscription.trial_ends_at) > now
      : false;
  }
  return false;
}

export function getSubscriptionStatus(subscription) {
  if (!subscription) return "none";
  const now = new Date();
  if (subscription.status === "trialing") {
    if (!subscription.trial_ends_at || new Date(subscription.trial_ends_at) <= now) {
      return "trial_expired";
    }
    return "trialing";
  }
  return subscription.status;
}

export function trialDaysRemaining(subscription) {
  if (!subscription?.trial_ends_at) return 0;
  const diff = new Date(subscription.trial_ends_at) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}