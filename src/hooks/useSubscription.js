import { useQuery } from "@tanstack/react-query";
import { subscriptions as subscriptionsApi } from '@/services/resources';
import { isSubscriptionActive, getPlanLimit } from "@/lib/subscriptionPlans";

export function useSubscription(user) {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["my-subscription", user?.id],
    queryFn: () => subscriptionsApi.filter({ user_id: user.id }, "-created_date", 50),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const subscription = subscriptions[0] ?? null;
  const active = isSubscriptionActive(subscription);
  const planLimit = subscription ? getPlanLimit(subscription.plan) : 0;

  return {
    subscription,
    isLoading,
    isActive: active,
    planLimit,
    canCreate: (currentCount) => {
      if (!active) return false;
      if (planLimit === null) return true; // unlimited
      return currentCount < planLimit;
    },
  };
}