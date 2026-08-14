import { callAction } from '@/services/actions';
import { courseEnrollments as courseEnrollmentsApi } from '@/services/resources';
import { PENDING_COURSE_PAYMENT_ENROLLMENT_KEY } from '@/lib/course-checkout';

export const COURSE_PAYMENT_INTENT_KEY = 'mm_course_payment_intent_id';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseInvokeError(err, fallback) {
  const status = err?.response?.status ?? err?.status;
  const serverError = err?.response?.data?.error ?? err?.data?.error;
  const message = serverError || err?.message || fallback;

  if (status === 404) {
    return `${message} (action not available on this backend)`;
  }

  return message;
}

async function callNamedAction(name, payload) {
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

  if (!clientSecret || !paymentIntentId) {
    return null;
  }

  return {
    ...data,
    clientSecret,
    paymentIntentId,
    customerId: data.customerId || data.customer_id,
    ephemeralKeySecret: data.ephemeralKeySecret || data.ephemeral_key_secret,
    publishableKey: data.publishableKey || data.publishable_key || '',
    amount: data.amount,
    currency: data.currency || 'usd',
    course: data.course ?? null,
  };
}

function finalizePaymentIntent(data, enrollmentId) {
  stashPaymentIntentId(data.paymentIntentId);
  if (enrollmentId) {
    localStorage.setItem(PENDING_COURSE_PAYMENT_ENROLLMENT_KEY, enrollmentId);
  }
  return data;
}

function describeInvalidCheckoutResponse(data) {
  if (!data) return 'empty response';
  if (data.error) return data.error;
  if (data.url && data.session_id) {
    return 'server returned hosted Stripe Checkout (publish updated courseCheckout with payment_sheet support)';
  }
  return 'missing clientSecret / paymentIntentId';
}

export function getCoursePaymentPath(courseId, enrollmentId) {
  const params = new URLSearchParams();
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  const query = params.toString();
  return `/app/courses/${courseId}/payment${query ? `?${query}` : ''}`;
}

export function getCourseDetailPathAfterPayment(courseId, enrollmentId) {
  const params = new URLSearchParams();
  params.set('paymentSuccess', 'true');
  if (enrollmentId) params.set('enrollment_id', enrollmentId);
  return `/app/courses/${courseId}?${params.toString()}`;
}

/** @deprecated Use getCourseDetailPathAfterPayment — success page is no longer shown after payment. */
export function getCoursePaymentSuccessPath(courseId, enrollmentId) {
  return getCourseDetailPathAfterPayment(courseId, enrollmentId);
}

export function stashPaymentIntentId(paymentIntentId) {
  if (!paymentIntentId) return;
  try {
    sessionStorage.setItem(COURSE_PAYMENT_INTENT_KEY, paymentIntentId);
  } catch {
    /* ignore */
  }
}

/**
 * Create a Stripe PaymentIntent for native PaymentSheet checkout.
 * Tries dedicated endpoint first, then courseCheckout payment_sheet mode.
 */
export async function createCoursePaymentIntent({ courseId, enrollmentId }) {
  const basePayload = {
    course_id: courseId,
    enrollment_id: enrollmentId,
  };

  const attempts = [
    {
      name: 'createCoursePaymentIntent',
      payload: basePayload,
    },
    {
      name: 'courseCheckout',
      payload: {
        ...basePayload,
        payment_sheet: true,
        mobile: true,
        native_checkout: true,
      },
    },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      const raw = await callNamedAction(attempt.name, attempt.payload);
      const normalized = normalizePaymentSheetResponse(raw);

      if (normalized) {
        console.log('[course-mobile-payment] PaymentIntent ready via', attempt.name);
        return finalizePaymentIntent(normalized, enrollmentId);
      }

      errors.push(`${attempt.name}: ${describeInvalidCheckoutResponse(raw)}`);
      console.warn('[course-mobile-payment] invalid PaymentSheet response from', attempt.name, raw);
    } catch (err) {
      errors.push(`${attempt.name}: ${err.message}`);
      console.warn('[course-mobile-payment] invoke failed for', attempt.name, err);
    }
  }

  throw new Error(
    errors.length
      ? errors.join(' · ')
      : 'Could not start payment. Port createCoursePaymentIntent or courseCheckout on the backend.',
  );
}

/**
 * Confirm PaymentIntent succeeded and sync enrollment (webhook is authoritative).
 * Returns { paid: false } instead of throwing when endpoints are unavailable.
 */
export async function confirmCoursePayment(paymentIntentId, { enrollmentId } = {}) {
  const payload = {
    payment_intent_id: paymentIntentId,
    enrollment_id: enrollmentId,
  };

  const attempts = ['verifyCoursePayment', 'confirmCoursePayment'];
  const errors = [];

  for (const name of attempts) {
    try {
      const result = await callNamedAction(name, payload);
      if (result && typeof result === 'object') {
        console.log('[course-mobile-payment] payment confirmed via', name, result.paid);
        return result;
      }
      errors.push(`${name}: empty response`);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.warn('[course-mobile-payment] confirm failed for', name, err);
    }
  }

  return { paid: false, errors };
}

/**
 * Check enrollment record directly (webhook may have updated before verify API responds).
 */
export async function fetchEnrollmentPaymentStatus(enrollmentId) {
  if (!enrollmentId) return null;
  try {
    const rows = await courseEnrollmentsApi.filter({ id: enrollmentId });
    return rows[0] ?? null;
  } catch (err) {
    console.warn('[course-mobile-payment] enrollment lookup failed:', err);
    return null;
  }
}

/**
 * Best-effort backend sync after PaymentSheet completes. Never throws.
 */
export async function syncCoursePaymentAfterSheetComplete(
  paymentIntentId,
  { enrollmentId } = {},
) {
  try {
    const result = await confirmCoursePayment(paymentIntentId, { enrollmentId });
    if (result?.paid) return result;
  } catch (err) {
    console.warn('[course-mobile-payment] confirmCoursePayment failed:', err);
  }

  const enrollment = await fetchEnrollmentPaymentStatus(enrollmentId);
  if (enrollment?.payment_status === 'paid') {
    return { paid: true, enrollment, syncedFromEnrollment: true };
  }

  return { paid: false, enrollment };
}

export async function waitForCourseSessionPaymentConfirmed(
  sessionId,
  { enrollmentId, maxWaitMs = 45000, intervalMs = 1500 } = {},
) {
  const deadline = Date.now() + maxWaitMs;
  let lastResult = null;

  while (Date.now() < deadline) {
    try {
      lastResult = await callNamedAction('verifyCoursePayment', {
        session_id: sessionId,
        enrollment_id: enrollmentId,
      });
      if (lastResult?.paid) return lastResult;
    } catch (err) {
      lastResult = { paid: false, error: err.message };
    }
    await sleep(intervalMs);
  }

  try {
    return await callNamedAction('verifyCoursePayment', {
      session_id: sessionId,
      enrollment_id: enrollmentId,
    });
  } catch (err) {
    return lastResult ?? { paid: false, error: err.message };
  }
}

export async function waitForCoursePaymentConfirmed(
  paymentIntentId,
  { enrollmentId, maxWaitMs = 30000, intervalMs = 1500 } = {},
) {
  const deadline = Date.now() + maxWaitMs;
  let lastResult = null;

  while (Date.now() < deadline) {
    try {
      lastResult = await confirmCoursePayment(paymentIntentId, { enrollmentId });
      if (lastResult?.paid) return lastResult;
    } catch (err) {
      lastResult = { paid: false, error: err.message };
    }
    await sleep(intervalMs);
  }

  try {
    return await confirmCoursePayment(paymentIntentId, { enrollmentId });
  } catch (err) {
    return lastResult ?? { paid: false, error: err.message };
  }
}
