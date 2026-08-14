import { callAction } from '@/services/actions';
import { leagueMembers as leagueMembersApi } from '@/services/resources';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLeagueMember(memberId) {
  if (!memberId) return null;
  const rows = await leagueMembersApi.filter({ id: memberId });
  return rows[0] ?? null;
}

/**
 * Poll the LeagueMember record until payment_status === 'paid'.
 * The Stripe webhook updates the record asynchronously; this waits for it.
 */
export async function waitForPaidMember(memberId, { maxWaitMs = 12000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const member = await fetchLeagueMember(memberId);
    if (member?.payment_status === 'paid') return member;
    await sleep(intervalMs);
  }
  return fetchLeagueMember(memberId);
}

/**
 * After Stripe checkout redirect — wait for the webhook to mark the member as paid,
 * then invalidate queries and show the success toast.
 */
export async function handleLeaguePaymentSuccess({ memberId, sessionId, queryClient, toast }) {
  if (!memberId) return;

  queryClient.invalidateQueries({ queryKey: ['my-league-memberships'] });

  // 1. Immediately verify with Stripe using the session_id from the redirect URL
  //    (same pattern as verifyTournamentPayment — don't wait for webhook)
  if (sessionId) {
    try {
      await callAction('confirmLeaguePayment', {
        session_id: sessionId,
        member_id: memberId,
      });
    } catch (err) {
      console.warn('[league-payment] confirmLeaguePayment (session) failed:', err);
    }
  }

  // 2. Poll briefly for the member to be marked paid
  let member = await waitForPaidMember(memberId, { maxWaitMs: 8000, intervalMs: 500 });

  // 3. Fallback: if still not paid, try again using the session_id stored on the member record
  if (member?.payment_status !== 'paid' && member?.stripe_session_id && !sessionId) {
    try {
      await callAction('confirmLeaguePayment', {
        session_id: member.stripe_session_id,
        member_id: memberId,
      });
      member = await waitForPaidMember(memberId, { maxWaitMs: 5000, intervalMs: 500 });
    } catch (err) {
      console.warn('[league-payment] confirmLeaguePayment fallback failed:', err);
    }
  }

  if (member?.payment_status !== 'paid') {
    toast({
      title: 'Payment processing',
      description: 'Your payment is being confirmed. This page will update shortly.',
    });
    return;
  }

  queryClient.invalidateQueries({ queryKey: ['my-league-memberships'] });
  queryClient.invalidateQueries({ queryKey: ['league-members-detail'] });

  toast({
    title: 'Payment confirmed! 🎉',
    description: 'Your league membership is now active.',
  });
}