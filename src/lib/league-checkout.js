import { callAction } from '@/services/actions';
import { isCapacitorNative, getStripeReturnUrls } from '@/lib/capacitor-utils';
import { getLeaguePaymentPath } from '@/lib/league-mobile-payment';

export const PENDING_LEAGUE_PAYMENT_MEMBER_KEY = 'mm_pending_league_payment_member_id';

export function invalidateLeagueMemberQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['my-league-memberships'] });
  queryClient.invalidateQueries({ queryKey: ['league-members-detail'] });
}

export function formatLeagueMembershipFee(cents) {
  if (!cents || cents <= 0) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

export function leagueRequiresPayment(league) {
  return Boolean(
    league?.payment_model === 'paid' && league?.membership_fee && league.membership_fee > 0
  );
}

/**
 * Start league membership checkout — web uses Stripe Hosted Checkout redirect.
 * Native apps redirect to a payment processing page (same pattern as tournaments/courses).
 */
export async function startLeagueCheckout({ leagueId, memberId, navigate }) {
  if (!leagueId || !memberId) {
    throw new Error('Missing league or member information.');
  }

  localStorage.setItem(PENDING_LEAGUE_PAYMENT_MEMBER_KEY, memberId);

  if (isCapacitorNative() && typeof navigate === 'function') {
    navigate(getLeaguePaymentPath(leagueId, memberId));
    return { mobileFlow: true };
  }

  const { success_url, cancel_url } = getStripeReturnUrls({
    successPath: `/app/leagues?payment=success&session_id={CHECKOUT_SESSION_ID}&league_id=${leagueId}&member_id=${memberId}`,
    cancelPath: `/app/leagues?payment=cancelled&league_id=${leagueId}&member_id=${memberId}`,
  });

  const data = await callAction('leagueCheckout', {
    league_id: leagueId,
    member_id: memberId,
    success_url,
    cancel_url,
  });

  // Subscription fully covered the membership fee — no Stripe redirect needed
  if (data?.subscription_covered) {
    return { mobileFlow: false, session_id: null, subscription_covered: true };
  }

  if (!data?.url) {
    throw new Error(data?.error || 'Could not start league checkout.');
  }

  window.location.href = data.url;
  return { mobileFlow: false, session_id: data.session_id };
}