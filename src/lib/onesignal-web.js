/**
 * OneSignal Web SDK — browser only (not Capacitor WKWebView).
 */

import { isCapacitorNative } from '@/lib/capacitor-utils';
import { callAction } from '@/services/actions';
import { handleNotificationOpen } from '@/lib/notifications-center';

// Hardcoded App ID — env var overrides if present (e.g. staging builds).
const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() || '2193ed23-caea-4064-bec0-0e5f17d36002';

const ONESIGNAL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** null = not tried yet, true = web push works, false = not configured in OneSignal */
let _webPushAvailable = null;

export function isWebPushAvailable() {
  return _webPushAvailable === true;
}

/** Wait for initOneSignalWeb to finish (success or known skip). */
export async function waitForWebPushInit(timeoutMs = 8000) {
  if (isCapacitorNative()) return false;
  const start = Date.now();
  while (_webPushAvailable === null && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return _webPushAvailable === true;
}

function isWebPushDisabledError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('not configured for web push');
}

async function getWebOneSignal() {
  if (isCapacitorNative()) return null;
  if (window.OneSignal) return window.OneSignal;

  await new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.OneSignal) {
        clearInterval(timer);
        resolve(window.OneSignal);
      } else if (Date.now() - start > 10000) {
        clearInterval(timer);
        resolve(null);
      }
    }, 200);
  });

  return window.OneSignal ?? null;
}

async function webPushSubscriptionId(OneSignal) {
  try {
    if (OneSignal.User?.PushSubscription?.getIdAsync) {
      return await OneSignal.User.PushSubscription.getIdAsync();
    }
    if (OneSignal.User?.pushSubscription?.getIdAsync) {
      return await OneSignal.User.pushSubscription.getIdAsync();
    }
    return OneSignal.User?.PushSubscription?.id ?? OneSignal.User?.pushSubscription?.id ?? null;
  } catch {
    return null;
  }
}

async function webPushToken(OneSignal) {
  try {
    if (OneSignal.User?.PushSubscription?.getTokenAsync) {
      return await OneSignal.User.PushSubscription.getTokenAsync();
    }
    if (OneSignal.User?.pushSubscription?.getTokenAsync) {
      return await OneSignal.User.pushSubscription.getTokenAsync();
    }
    return OneSignal.User?.PushSubscription?.token ?? OneSignal.User?.pushSubscription?.token ?? null;
  } catch {
    return null;
  }
}

async function webOptInPush(OneSignal) {
  let hasPermission = false;
  try {
    hasPermission = await OneSignal.Notifications.hasPermission();
  } catch {
    /* optional */
  }
  if (!hasPermission) {
    try {
      hasPermission = await OneSignal.Notifications.requestPermission();
    } catch (err) {
      console.warn('[OneSignal Web] requestPermission failed:', err);
    }
  }
  try {
    if (OneSignal.User?.PushSubscription?.optIn) {
      await OneSignal.User.PushSubscription.optIn();
    } else if (OneSignal.User?.pushSubscription?.optIn) {
      await OneSignal.User.pushSubscription.optIn();
    }
  } catch (err) {
    console.warn('[OneSignal Web] optIn failed:', err);
  }
  return hasPermission;
}

async function syncWebIdentityOnServer(user, OneSignal) {
  try {
    const pushSubscriptionId = await webPushSubscriptionId(OneSignal);
    const pushToken = await webPushToken(OneSignal);

    const res = await callAction('syncOneSignalIdentity', {
      externalId: user.id,
      email: user.email,
      pushSubscriptionId,
      pushToken,
      platform: 'web',
    });
    return Boolean(res?.success);
  } catch (err) {
    console.warn('[OneSignal Web] server identity sync failed:', err);
    return false;
  }
}

/**
 * Link the logged-in user id to OneSignal on web (must match server push external_id).
 */
export async function syncPushUserWeb(user) {
  try {
    if (isCapacitorNative() || !user?.id) return false;

    const ready = await waitForWebPushInit();
    if (!ready) return false;

    const OneSignal = await getWebOneSignal();
    if (!OneSignal) return false;

    const externalId = String(user.id).trim();
    console.log('[OneSignal Web] login external_id:', externalId);
    await OneSignal.login(externalId);

    if (user.email) {
      try {
        await OneSignal.User.addEmail(String(user.email).trim().toLowerCase());
      } catch (err) {
        console.warn('[OneSignal Web] addEmail failed:', err);
      }
    }

    await webOptInPush(OneSignal);
    const serverSynced = await syncWebIdentityOnServer(user, OneSignal);
    const subscriptionId = await webPushSubscriptionId(OneSignal);

    console.log('[OneSignal Web] sync complete:', {
      externalId,
      serverSynced,
      subscriptionId: subscriptionId ?? 'none',
    });

    return Boolean(subscriptionId) || serverSynced;
  } catch (error) {
    console.error('[OneSignal Web] syncPushUserWeb failed:', error);
    return false;
  }
}

export function initOneSignalWeb() {
  try {
    if (isCapacitorNative()) return;
    if (!ONESIGNAL_UUID_RE.test(ONESIGNAL_APP_ID)) return;

    // Set VITE_ONESIGNAL_WEB_ENABLED=false to skip browser push entirely (native app push still works).
    const webEnabled = import.meta.env.VITE_ONESIGNAL_WEB_ENABLED !== 'false';
    if (!webEnabled) {
      _webPushAvailable = false;
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID?.trim() || '',
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });

        _webPushAvailable = true;
        console.info('[OneSignal Web] initialized successfully', { appId: ONESIGNAL_APP_ID });

        OneSignal.Notifications.addEventListener('click', (event) => {
          try {
            handleNotificationOpen(event);
          } catch (err) {
            console.error('[OneSignal] notification open handler failed:', err);
          }
        });
      } catch (error) {
        if (isWebPushDisabledError(error)) {
          _webPushAvailable = false;
          console.info(
            '[OneSignal Web] Browser push is not enabled for this OneSignal app. '
              + 'Native iOS/Android push is unaffected. To enable web push: OneSignal Dashboard → Settings → Platforms → Web.',
          );
          return;
        }
        _webPushAvailable = false;
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[OneSignal Web] init failed:', message);
      }
    });

    if (!document.querySelector('script[data-onesignal-sdk]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      script.dataset.onesignalSdk = 'true';
      document.head.appendChild(script);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[OneSignal] initOneSignalWeb setup failed:', message, error);
  }
}
