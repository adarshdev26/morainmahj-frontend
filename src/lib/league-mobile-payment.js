import { callAction, actionPath } from '@/services/actions';
import { leagueMembers as leagueMembersApi } from '@/services/resources';
import { appParams } from '@/lib/app-params';

export const LEAGUE_PAYMENT_INTENT_KEY = 'mm_league_payment_intent_id';
export const CONFIRM_LEAGUE_PAYMENT_FUNCTION = 'confirmLeaguePayment';

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
    league: data.league ?? null,
  };
}

export function stashLeaguePaymentIntentId(paymentIntentId) {
  if (!paymentIntentId) return;
  try {
    sessionStorage.setItem(LEAGUE_PAYMENT_INTENT_KEY, paymentIntentId);
  } catch {
    /* ignore */
  }
}

export function getLeaguePaymentPath(leagueId, memberId) {
  const params = new URLSearchParams();
  if (memberId) params.set('member_id', memberId);
  const query = params.toString();
  return `/app/leagues/${leagueId}/payment${query ? `?${query}` : ''}`;
}

export async function createLeaguePaymentIntent({ leagueId, memberId }) {
  const raw = await callNamedAction('createLeaguePaymentIntent', {
    league_id: leagueId,
    member_id: memberId,
  });
  const normalized = normalizePaymentSheetResponse(raw);
  if (!normalized) {
    throw new Error(raw?.error || 'Could not start league payment.');
  }
  stashLeaguePaymentIntentId(normalized.paymentIntentId);
  return normalized;
}

export async function confirmLeaguePayment(paymentIntentId, { memberId } = {}) {
  console.log('Function name:', CONFIRM_LEAGUE_PAYMENT_FUNCTION);
  console.log('Function URL:', getFunctionInvokeUrl(CONFIRM_LEAGUE_PAYMENT_FUNCTION));

  return callNamedAction(CONFIRM_LEAGUE_PAYMENT_FUNCTION, {
    payment_intent_id: paymentIntentId,
    member_id: memberId,
  });
}

export async function fetchLeagueMemberStatus(memberId) {
  if (!memberId) return null;
  try {
    const rows = await leagueMembersApi.filter({ id: memberId });
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function syncLeaguePaymentAfterSheetComplete(
  paymentIntentId,
  { memberId } = {},
) {
  console.log('[LEAGUE PAY STEP 5A] memberId:', memberId);
  console.log('[LEAGUE PAY STEP 5B] paymentIntentId:', paymentIntentId);

  const memberBefore = await fetchLeagueMemberStatus(memberId);
  const paymentStatusBefore = memberBefore?.payment_status ?? null;

  let confirmResult = null;
  let confirmError = null;

  try {
    confirmResult = await confirmLeaguePayment(paymentIntentId, { memberId });
    console.log(
      '[LEAGUE PAY STEP 6] confirmLeaguePayment result:',
      JSON.stringify(confirmResult, null, 2),
    );
  } catch (error) {
    confirmError = error?.message || String(error);
    console.error('[LEAGUE PAY STEP 6 ERROR]', JSON.stringify(error, null, 2));
  }

  const memberAfter = await fetchLeagueMemberStatus(memberId);
  const paymentStatusAfter = memberAfter?.payment_status ?? null;

  const paid = Boolean(
    confirmResult?.paid ||
    memberAfter?.payment_status === 'paid',
  );

  const updated = paymentStatusBefore !== paymentStatusAfter;

  const response = {
    success: paid,
    memberId: memberId ?? null,
    paymentStatusBefore,
    paymentStatusAfter,
    updated,
    paid,
    pushSent: confirmResult?.pushSent ?? false,
    confirmResult,
    confirmError,
    member: memberAfter,
  };

  console.log('[LEAGUE SYNC RETURN]', JSON.stringify(response, null, 2));
  return response;
}