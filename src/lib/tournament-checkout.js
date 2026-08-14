import { callAction } from '@/services/actions';
import { isCapacitorNative, getStripeReturnUrls } from '@/lib/capacitor-utils';
import { getTournamentPaymentPath } from '@/lib/tournament-mobile-payment';

export const PENDING_TOURNAMENT_PAYMENT_REGISTRATION_KEY = 'mm_pending_tournament_payment_reg_id';

export function invalidateTournamentRegistrationQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['regs-by-email'] });
  queryClient.invalidateQueries({ queryKey: ['regs-by-pid'] });
  queryClient.invalidateQueries({ queryKey: ['my-tournaments-by-id'] });
  queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
}

export async function startTournamentCheckout({ tournamentId, registrationId, navigate }) {
  if (!tournamentId || !registrationId) {
    throw new Error('Missing tournament or registration information.');
  }

  localStorage.setItem(PENDING_TOURNAMENT_PAYMENT_REGISTRATION_KEY, registrationId);

  if (isCapacitorNative() && typeof navigate === 'function') {
    navigate(getTournamentPaymentPath(tournamentId, registrationId));
    return { mobileFlow: true };
  }

  const { success_url, cancel_url } = getStripeReturnUrls({
    successPath: `/app/my-tournaments?payment=success&session_id={CHECKOUT_SESSION_ID}&registration_id=${encodeURIComponent(registrationId)}`,
    cancelPath: `/app/my-tournaments?payment=cancelled&registration_id=${encodeURIComponent(registrationId)}`,
  });

  const data = await callAction('stripeCheckout', {
    tournament_id: tournamentId,
    registration_id: registrationId,
    success_url,
    cancel_url,
  });

  // Subscription fully covered the fee or director pays — no Stripe redirect needed
  if (data?.subscription_covered || data?.director_pays) {
    return { mobileFlow: false, session_id: null, subscription_covered: !!data?.subscription_covered, director_pays: !!data?.director_pays };
  }

  if (!data?.url) {
    throw new Error(data?.error || 'Could not start tournament checkout.');
  }

  window.location.href = data.url;
  return { mobileFlow: false, session_id: data.session_id };
}