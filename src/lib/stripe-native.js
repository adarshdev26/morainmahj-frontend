import { isCapacitorNative } from '@/lib/capacitor-utils';

let stripeInitialized = false;
let initPromise = null;

function resolvePublishableKey(serverKey) {
  return serverKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
}

export async function ensureStripeNativeReady(publishableKey) {
  if (!isCapacitorNative()) {
    throw new Error('Native Stripe is only available in the mobile app.');
  }

  const key = resolvePublishableKey(publishableKey);
  if (!key) {
    throw new Error(
      'Stripe publishable key is not configured. Set STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY.',
    );
  }

  if (stripeInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { Stripe } = await import('@capacitor-community/stripe');
    await Stripe.initialize({ publishableKey: key });
    stripeInitialized = true;
    return true;
  })();

  return initPromise;
}

/**
 * Present Stripe PaymentSheet natively (iOS/Android). No browser or WebView.
 */
export async function presentNativePaymentSheet({
  clientSecret,
  customerId,
  ephemeralKeySecret,
  publishableKey,
  merchantDisplayName = 'Morain Mahj',
}) {
  await ensureStripeNativeReady(publishableKey);

  const { Stripe, PaymentSheetEventsEnum } = await import('@capacitor-community/stripe');

  return new Promise((resolve, reject) => {
    const handles = [];
    let settled = false;

    const finish = async (fn) => {
      if (settled) return;
      settled = true;
      for (const handle of handles) {
        try {
          await handle.remove();
        } catch {
          /* ignore */
        }
      }
      fn();
    };

    const onReject = (err) => finish(() => reject(err instanceof Error ? err : new Error(String(err))));
    const onResolve = (value) => finish(() => resolve(value));

    (async () => {
      handles.push(await Stripe.addListener(PaymentSheetEventsEnum.FailedToLoad, (error) => {
        onReject(new Error(error || 'Payment sheet failed to load'));
      }));

      handles.push(await Stripe.addListener(PaymentSheetEventsEnum.Failed, (error) => {
        onReject(new Error(error || 'Payment failed'));
      }));

      handles.push(await Stripe.addListener(PaymentSheetEventsEnum.Canceled, () => {
        onResolve({ status: 'canceled' });
      }));

      handles.push(await Stripe.addListener(PaymentSheetEventsEnum.Completed, () => {
        onResolve({ status: 'completed', completed: true, error: null });
      }));

      handles.push(await Stripe.addListener(PaymentSheetEventsEnum.Loaded, async () => {
        try {
          await Stripe.presentPaymentSheet();
        } catch (err) {
          onReject(err);
        }
      }));

      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        customerId,
        customerEphemeralKeySecret: ephemeralKeySecret,
        merchantDisplayName,
      });
    })().catch(onReject);
  });
}
