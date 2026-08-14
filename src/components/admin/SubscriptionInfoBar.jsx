import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { leagues as leaguesApi, subscriptions as subscriptionsApi, tournaments as tournamentsApi } from '@/services/resources';
import { PLAN_MAP, isSubscriptionActive, trialDaysRemaining, getSubscriptionStatus } from '@/lib/subscriptionPlans';
import { useOrganization } from '@/hooks/useOrganization';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, CalendarDays, TrendingUp } from 'lucide-react';

const STATUS_BADGE = {
  trialing: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-600',
  expired: 'bg-red-100 text-red-600',
  trial_expired: 'bg-red-100 text-red-600',
  none: 'bg-slate-100 text-slate-500',
};

export default function SubscriptionInfoBar({ user }) {
  const { orgFilter } = useOrganization();
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: () => subscriptionsApi.filter({ user_id: user.id }, '-created_date', 50),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-leagues-count-info', user?.id],
    queryFn: () => leaguesApi.filter(orgFilter()),
    enabled: !!user,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin-tournaments-count-info', user?.id],
    queryFn: () => tournamentsApi.filter(orgFilter()),
    enabled: !!user,
  });

  const subscription = subscriptions[0] ?? null;
  const status = getSubscriptionStatus(subscription);
  const plan = PLAN_MAP[subscription?.plan];
  const isActive = isSubscriptionActive(subscription);
  const daysLeft = trialDaysRemaining(subscription);
  const totalEvents = leagues.length + tournaments.length;
  const planLimit = plan?.league_limit ?? null;
  const eventsRemaining = planLimit === null ? '∞' : Math.max(0, planLimit - totalEvents);
  const isTrial = status === 'trialing';

  if (!user) return null;

  // Super admins have unrestricted access — no subscription info needed
  if (user.role === 'admin') {
    return (
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold text-slate-700">Super Admin</span>
        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Unlimited</Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Plan */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold text-slate-700">{plan ? plan.name : 'No Plan'}</span>
        <Badge className={`${STATUS_BADGE[status] || STATUS_BADGE.none} text-[10px] px-1.5 py-0`}>
          {status === 'trialing' ? 'Trial' : status}
        </Badge>
      </div>

      {/* Trial days remaining */}
      {isTrial && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
        </div>
      )}

      {/* Events remaining */}
      {isActive && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
          <CalendarDays className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">
            {eventsRemaining} event{eventsRemaining !== 1 && eventsRemaining !== '∞' ? 's' : ''} remaining
          </span>
          {planLimit !== null && (
            <span className="text-[10px] text-slate-400">({totalEvents}/{planLimit})</span>
          )}
        </div>
      )}
    </div>
  );
}