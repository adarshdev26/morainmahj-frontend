import { callAction, actionPath } from '@/services/actions';
import { registrations as registrationsApi } from '@/services/resources';
import { appParams } from '@/lib/app-params';

export const TOURNAMENT_PAYMENT_INTENT_KEY = 'mm_tournament_payment_intent_id';
export const CONFIRM_TOURNAMENT_PAYMENT_FUNCTION = 'confirmTournamentPayment';

function getFunctionInvokeUrl(functionName) {
  const appBase = (
    appParams.appBaseUrl ||
    import.meta.env.VITE_API_URL ||
    'https://morainmahj.com'
  ).replace(/\/$/, '');
  return `${appBase}${actionPath(functionName)}`;
}

function parseInvokeError(err, fallback) {
  const status = err?.response?.status ?? err?.status;
  const serverError = err?.response?.data?.error ?? err?.data?.error;
  const message = serverError || err?.message || fallback;
  if (status === 404) return `${message} (action not available on this backend)`;
  return message;
}

async function callNamedAction(name, payload) {
  console.log('Function name:', name);
  console.log('Function URL:', getFunctionInvokeUrl(name));

  try {
    return await callAction(name, payload);
  } catch (err) {
    throw new Error(parseInvokeError(err, `Could not reach ${name}`));
  }
}

function normalizePaymentSheetResponse(data) {
  if (!data || typeof data !== 'object') return null;
  const clientSecret = data.clientSecret || data.client_secret;
  const paymentIntentId = data.paymentIntentId || data.payment_intent_id;
  if (!clientSecret || !paymentIntentId) return null;

  return {
    ...data,
    clientSecret,
    paymentIntentId,
    customerId: data.customerId || data.customer_id,
    ephemeralKeySecret: data.ephemeralKeySecret || data.ephemeral_key_secret,
    publishableKey: data.publishableKey || data.publishable_key || '',
    amount: data.amount,
    currency: data.currency || 'usd',
    tournament: data.tournament ?? null,
  };
}

export function stashTournamentPaymentIntentId(paymentIntentId) {
  if (!paymentIntentId) return;
  try {
    sessionStorage.setItem(TOURNAMENT_PAYMENT_INTENT_KEY, paymentIntentId);
  } catch {
    /* ignore */
  }
}

export function getTournamentPaymentPath(tournamentId, registrationId) {
  const params = new URLSearchParams();
  if (registrationId) params.set('registration_id', registrationId);
  const query = params.toString();
  return `/app/tournaments/${tournamentId}/payment${query ? `?${query}` : ''}`;
}

export async function createTournamentPaymentIntent({ tournamentId, registrationId }) {
  const raw = await callNamedAction('createTournamentPaymentIntent', {
    tournament_id: tournamentId,
    registration_id: registrationId,
  });
  const normalized = normalizePaymentSheetResponse(raw);
  if (!normalized) {
    throw new Error(raw?.error || 'Could not start tournament payment.');
  }
  stashTournamentPaymentIntentId(normalized.paymentIntentId);
  return normalized;
}

export async function confirmTournamentPayment(paymentIntentId, { registrationId } = {}) {
  console.log('Function name:', CONFIRM_TOURNAMENT_PAYMENT_FUNCTION);
  console.log('Function URL:', getFunctionInvokeUrl(CONFIRM_TOURNAMENT_PAYMENT_FUNCTION));

  return callNamedAction(CONFIRM_TOURNAMENT_PAYMENT_FUNCTION, {
    payment_intent_id: paymentIntentId,
    registration_id: registrationId,
  });
}

export async function fetchTournamentPaymentStatus(registrationId) {
  if (!registrationId) return null;
  try {
    const rows = await registrationsApi.filter({ id: registrationId });
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function syncTournamentPaymentAfterSheetComplete(
  paymentIntentId,
  { registrationId, userId } = {},
) {
  console.log('[MYT STEP 5A] registrationId:', registrationId);
  console.log('[MYT STEP 5B] paymentIntentId:', paymentIntentId);
  console.log('[MYT STEP 5C] userId:', userId);

  const registrationBefore = await fetchTournamentPaymentStatus(registrationId);
  const statusBefore = registrationBefore?.status ?? null;
  const paymentStatusBefore = registrationBefore?.payment_status ?? null;

  let confirmResult = null;
  let confirmError = null;

  try {
    confirmResult = await confirmTournamentPayment(paymentIntentId, { registrationId });
    console.log(
      '[MYT STEP 6] confirmTournamentPayment result:',
      JSON.stringify(confirmResult, null, 2),
    );
  } catch (error) {
    confirmError = error?.message || String(error);
    console.error('[MYT STEP 6 ERROR]', JSON.stringify(error, null, 2));
  }

  const registrationAfter = await fetchTournamentPaymentStatus(registrationId);
  const statusAfter = registrationAfter?.status ?? null;
  const paymentStatusAfter = registrationAfter?.payment_status ?? null;

  const paid = Boolean(
    confirmResult?.paid ||
    registrationAfter?.payment_status === 'paid' ||
    registrationAfter?.status === 'confirmed',
  );

  const updated =
    statusBefore !== statusAfter || paymentStatusBefore !== paymentStatusAfter;

  const response = {
    success: paid,
    registrationId: registrationId ?? null,
    statusBefore,
    statusAfter,
    paymentStatusBefore,
    paymentStatusAfter,
    updated,
    paid,
    pushSent: confirmResult?.pushSent ?? false,
    confirmResult,
    confirmError,
    registration: registrationAfter,
    syncedFromEnrollment: !confirmResult?.paid && paid,
  };

  console.log('[SYNC RETURN]', JSON.stringify(response, null, 2));
  return response;
}
