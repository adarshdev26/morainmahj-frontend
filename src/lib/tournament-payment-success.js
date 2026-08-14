import { callAction } from '@/services/actions';
import { registrations as registrationsApi } from '@/services/resources';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTournamentRegistration(registrationId) {
  if (!registrationId) return null;
  const rows = await registrationsApi.filter({ id: registrationId });
  return rows[0] ?? null;
}

async function waitForPushConfirmation(registrationId, { maxWaitMs = 8000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const reg = await fetchTournamentRegistration(registrationId);
    if (reg?.payment_confirmation_push_sent_at) return reg;
    if (reg?.payment_confirmation_push_failed) return reg;
    await sleep(intervalMs);
  }
  return fetchTournamentRegistration(registrationId);
}

export async function trySendTournamentRegistrationPush(registrationId) {
  if (!registrationId) return false;
  try {
    const res = await callAction('notifyTournamentRegistration', {
      registration_id: registrationId,
    });
    return Boolean(res?.pushSent);
  } catch (err) {
    console.warn('[tournament-payment] notifyTournamentRegistration failed:', err);
    return false;
  }
}

export async function handleTournamentPaymentSuccess({
  registrationId,
  queryClient,
  toast,
}) {
  if (!registrationId) return;

  queryClient.invalidateQueries({ queryKey: ['regs-by-email'] });
  queryClient.invalidateQueries({ queryKey: ['regs-by-pid'] });
  queryClient.invalidateQueries({ queryKey: ['my-tournaments-by-id'] });
  queryClient.invalidateQueries({ queryKey: ['my-registrations'] });

  let reg = await fetchTournamentRegistration(registrationId);
  if (!reg) return;
  if (reg.payment_status !== 'paid' && reg.status !== 'confirmed') return;

  if (!reg.payment_confirmation_push_sent_at) {
    reg = (await waitForPushConfirmation(registrationId)) ?? reg;
  }

  if (reg.payment_confirmation_push_sent_at) return;

  const pushSent = await trySendTournamentRegistrationPush(registrationId);
  if (pushSent) return;

  toast({
    title: 'Payment confirmed',
    description: 'Your registration is confirmed. Check tournament details for next steps.',
  });
}
