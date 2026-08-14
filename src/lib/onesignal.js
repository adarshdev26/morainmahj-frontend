/**
 * OneSignal native push (iOS/Android via Capacitor).
 *
 * Flow:
 * 1. initOneSignal (pre-auth) — initialize SDK; OS Allow/Don't Allow once on first launch only
 * 2. syncPushUser (post-login) — login(userId) → addEmail → server upsert backup
 * 3. requestPushPermission() — explicit user action (Profile, etc.)
 */

import { Capacitor } from '@capacitor/core';
import { callAction } from '@/services/actions';
import { isCapacitorNative } from '@/lib/capacitor-utils';

const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() || '2193ed23-caea-4064-bec0-0e5f17d36002';

const ONESIGNAL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LAST_SYNC_USER_KEY = 'onesignal_last_sync_user';

let _oneSignalInstance = null;
let _initialized = false;
let _initDone = false;
let _subscriptionListenerAttached = false;
let _permissionListenerAttached = false;
let _userChangeListenerAttached = false;
let _pendingIdentity = null;
let _syncInFlight = null;

let _initResolve = null;
const _initPromise = new Promise((res) => {
  _initResolve = res;
});

function finishInit() {
  if (!_initDone) {
    _initDone = true;
    _initResolve?.();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  return normalized || null;
}

function normalizeUserArg(userOrId) {
  if (!userOrId) return null;
  if (typeof userOrId === 'string') {
    const value = userOrId.trim();
    if (!value) return null;
    return { id: value, email: null };
  }
  const id = userOrId.id ? String(userOrId.id).trim() : null;
  const email = normalizeEmail(userOrId.email);
  if (!id && !email) return null;
  return { id, email };
}

function stashSyncUser(user) {
  if (!user?.id && !user?.email) return;
  const externalId = user.id || user.email;
  _pendingIdentity = { ...user, externalId };
  try {
    sessionStorage.setItem(LAST_SYNC_USER_KEY, JSON.stringify(user));
  } catch {
    /* optional */
  }
}

function readSyncUser() {
  try {
    const raw = sessionStorage.getItem(LAST_SYNC_USER_KEY);
    if (!raw) return _pendingIdentity;
    const parsed = JSON.parse(raw);
    return normalizeUserArg(parsed);
  } catch {
    return _pendingIdentity;
  }
}

async function getOneSignal() {
  if (_oneSignalInstance) return _oneSignalInstance;
  const mod = await import('@onesignal/capacitor-plugin');
  _oneSignalInstance = mod.default;
  return _oneSignalInstance;
}

async function readExternalId(OneSignal) {
  const result = await OneSignal.User.getExternalId?.();
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'externalId' in result) {
    return result.externalId ?? null;
  }
  return null;
}

async function readOnesignalId(OneSignal) {
  const result = await OneSignal.User.getOnesignalId?.();
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'onesignalId' in result) {
    return result.onesignalId ?? null;
  }
  return null;
}

function describeSubscriptionStatus({ hasPermission, optedIn, hasToken, subscriptionId }) {
  if (!hasPermission) return 'Permission Not Granted';
  if (!optedIn) return 'Never Subscribed';
  if (!hasToken && !subscriptionId) return 'Subscribed (pending token)';
  return 'Subscribed';
}

async function logPushState(OneSignal, label, expected = {}) {
  try {
    const hasPermission = await OneSignal.Notifications.hasPermission();
    const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
    const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    const token = await OneSignal.User.pushSubscription.getTokenAsync();
    const externalId = await readExternalId(OneSignal);
    const onesignalId = await readOnesignalId(OneSignal);
    const hasToken = Boolean(token);

    const payload = {
      permissionGranted: hasPermission,
      pushOptedIn: optedIn,
      subscriptionStatus: describeSubscriptionStatus({
        hasPermission,
        optedIn,
        hasToken,
        subscriptionId,
      }),
      pushSubscriptionId: subscriptionId ?? 'none',
      hasPushToken: hasToken,
      onesignalUserId: onesignalId ?? 'none',
      externalId: externalId ?? 'none',
      loggedInUserId: expected.userId ?? 'n/a',
      emailSentToOneSignal: expected.email ?? 'n/a',
      expectedExternalId: expected.externalId ?? 'n/a',
    };

    console.log(`[OneSignal] ${label}:`, payload);
    return { ...payload, externalId, onesignalId, hasPermission, optedIn, hasToken, subscriptionId };
  } catch (err) {
    console.warn(`[OneSignal] ${label} state check failed:`, err);
    return null;
  }
}

async function isPushReady(OneSignal) {
  const hasPermission = await OneSignal.Notifications.hasPermission();
  const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
  return Boolean(hasPermission && optedIn);
}

async function osPermissionGranted(OneSignal) {
  try {
    return Boolean(await OneSignal.Notifications.hasPermission());
  } catch {
    return false;
  }
}

/** True only while the OS will still show the system permission sheet (not after deny). */
async function osCanShowPermissionPrompt(OneSignal) {
  try {
    if (await osPermissionGranted(OneSignal)) return false;

    if (typeof OneSignal.Notifications.canRequestPermission === 'function') {
      return Boolean(await OneSignal.Notifications.canRequestPermission());
    }

    // iOS fallback when canRequestPermission is unavailable
    if (typeof OneSignal.Notifications.permissionNative === 'function') {
      const native = await OneSignal.Notifications.permissionNative();
      // 0 = NotDetermined — only state where the system sheet can appear
      return native === 0 || native === 'NotDetermined';
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Show the native Allow/Don't Allow sheet once. Never uses fallbackToSettings (no "Open Settings" popup).
 */
async function requestOsPermissionIfAllowed(OneSignal, { label = 'requestOsPermission' } = {}) {
  if (await osPermissionGranted(OneSignal)) {
    return true;
  }

  if (!(await osCanShowPermissionPrompt(OneSignal))) {
    console.log(`[OneSignal] ${label} — OS prompt not available (already denied)`);
    return false;
  }

  console.log(`[OneSignal] ${label} — showing OS permission dialog`);
  const granted = await OneSignal.Notifications.requestPermission(false);
  console.log(`[OneSignal] ${label} — permission result:`, granted);
  return Boolean(granted);
}

async function optInWhenPermitted(OneSignal, { label = 'optInWhenPermitted' } = {}) {
  try {
    if (!(await osPermissionGranted(OneSignal))) {
      console.log(`[OneSignal] ${label} — OS permission not granted, skipping optIn`);
      return false;
    }
    if (await isPushReady(OneSignal)) {
      return true;
    }
    await OneSignal.User.pushSubscription.optIn();
    await sleep(400);
    return isPushReady(OneSignal);
  } catch (err) {
    console.error(`[OneSignal] ${label} failed:`, err);
    return false;
  }
}

/**
 * Wait for login() to switch user context — event-driven + polling fallback.
 */
function waitForExternalId(OneSignal, expectedExternalId, maxWaitMs = 15000) {
  const expected = String(expectedExternalId).trim();

  return new Promise((resolve) => {
    let done = false;
    const deadline = Date.now() + maxWaitMs;

    const finish = (result) => {
      if (done) return;
      done = true;
      try {
        OneSignal.User.removeEventListener('change', onChange);
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const onChange = (event) => {
      const externalId = event?.current?.externalId ?? null;
      console.log('[OneSignal] User change while waiting for login:', {
        onesignalUserId: event?.current?.onesignalId ?? 'none',
        externalId: externalId ?? 'none',
      });
      if (externalId === expected) {
        finish({ linked: true, externalId });
      }
    };

    try {
      OneSignal.User.addEventListener('change', onChange);
    } catch {
      /* ignore */
    }

    (async () => {
      while (Date.now() < deadline && !done) {
        const externalId = await readExternalId(OneSignal);
        if (externalId === expected) {
          finish({ linked: true, externalId });
          return;
        }
        await sleep(300);
      }
      if (!done) {
        const externalId = await readExternalId(OneSignal);
        finish({ linked: externalId === expected, externalId });
      }
    })();
  });
}

async function loginExternalUser(OneSignal, externalId) {
  const id = String(externalId).trim();
  console.log('[OneSignal] SDK login() — externalId being sent:', id);

  try {
    await OneSignal.login(id);
    console.log('[OneSignal] SDK login() — call resolved');
  } catch (err) {
    console.error('[OneSignal] SDK login() — error:', err);
    return { linked: false, externalId: null, error: err };
  }

  let result = await waitForExternalId(OneSignal, id, 12000);
  if (!result.linked) {
    console.warn('[OneSignal] SDK login() — retrying login after wait timeout');
    await sleep(500);
    try {
      await OneSignal.login(id);
      result = await waitForExternalId(OneSignal, id, 8000);
    } catch (err) {
      console.error('[OneSignal] SDK login() retry error:', err);
    }
  }

  console.log('[OneSignal] SDK login() — external_id on device:', result.externalId ?? 'none', {
    linked: result.linked,
  });
  return result;
}

async function assignUserEmail(OneSignal, email, { label = 'assignUserEmail' } = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    console.warn(`[OneSignal] ${label} — no email to assign`);
    return false;
  }

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      console.log(`[OneSignal] SDK addEmail() — attempt ${attempt}, email:`, normalized);
      await OneSignal.User.addEmail(normalized);
      console.log(`[OneSignal] SDK addEmail() — success on attempt ${attempt}`);
      return true;
    } catch (err) {
      console.error(`[OneSignal] SDK addEmail() — error attempt ${attempt}:`, err);
      await sleep(700 * attempt);
    }
  }

  return false;
}

async function syncIdentityOnServer(OneSignal, user) {
  try {
    const pushSubscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
    const onesignalUserId = await readOnesignalId(OneSignal);

    console.log('[OneSignal] server upsert — calling syncOneSignalIdentity:', {
      loggedInUserId: user.id ?? 'none',
      loggedInUserEmail: user.email ?? 'none',
      onesignalUserId: onesignalUserId ?? 'none',
      pushSubscriptionId: pushSubscriptionId ?? 'none',
      hasPushToken: Boolean(pushToken),
    });

    const res = await callAction('syncOneSignalIdentity', {
      externalId: user.id,
      email: user.email,
      onesignalUserId,
      pushSubscriptionId,
      pushToken,
      platform: Capacitor.getPlatform(),
    });

    const ok = Boolean(res?.success);
    console.log('[OneSignal] server upsert result:', res);
    return ok;
  } catch (err) {
    console.error('[OneSignal] server upsert failed:', err);
    return false;
  }
}

async function bindPushToIdentifiedUser(OneSignal, user, label = 'bindPush') {
  const externalId = user.id || user.email;
  if (!externalId) return false;

  if (!(await osPermissionGranted(OneSignal))) {
    console.log(`[OneSignal] ${label} — OS permission not granted, skipping push bind`);
    return false;
  }

  console.log(`[OneSignal] ${label} — login + optIn for push delivery`);
  try {
    await OneSignal.login(String(externalId).trim());
    await sleep(400);
    const ready = await optInWhenPermitted(OneSignal, { label });
    console.log(`[OneSignal] ${label} — push ready:`, ready);
    return ready;
  } catch (err) {
    console.error(`[OneSignal] ${label} failed:`, err);
    return false;
  }
}

async function identifyUser(OneSignal, user) {
  const { id, email } = user;
  const externalId = id || email;
  if (!externalId) {
    console.warn('[OneSignal] identifyUser skipped — no user id or email');
    return { loginLinked: false, emailAssigned: false, serverSynced: false, pushBound: false };
  }

  stashSyncUser(user);

  console.log('[OneSignal] identifyUser start:', {
    loggedInUserId: id ?? 'none',
    loggedInUserEmail: email ?? 'none',
    externalIdBeingSent: externalId,
  });

  await loginExternalUser(OneSignal, externalId);
  const pushBound = await bindPushToIdentifiedUser(OneSignal, user, 'identifyUser push bind');

  let emailAssigned = false;
  if (email) {
    emailAssigned = await assignUserEmail(OneSignal, email, { label: 'identifyUser' });
  }

  const serverSynced = await syncIdentityOnServer(OneSignal, user);

  // Server upsert can reshuffle subscriptions — re-bind push to identified user.
  const pushRebound = await bindPushToIdentifiedUser(OneSignal, user, 'identifyUser post-server');

  if (email) {
    const reassigned = await assignUserEmail(OneSignal, email, { label: 'identifyUser final' });
    emailAssigned = emailAssigned || reassigned;
  }

  const linkedExternalId = await readExternalId(OneSignal);

  console.log('[OneSignal] identifyUser complete:', {
    externalIdOnDevice: linkedExternalId ?? 'none',
    emailAssigned,
    serverSynced,
    pushBound: pushBound || pushRebound,
  });

  return {
    loginLinked: linkedExternalId === String(externalId).trim() || serverSynced,
    emailAssigned: emailAssigned || serverSynced,
    serverSynced,
    pushBound: pushBound || pushRebound,
    externalId: linkedExternalId,
  };
}

function attachPermissionListener(OneSignal) {
  if (_permissionListenerAttached) return;
  _permissionListenerAttached = true;

  try {
    OneSignal.Notifications.addEventListener('permissionChange', (granted) => {
      console.log('[OneSignal] permissionChange event:', granted);
      logPushState(OneSignal, 'after permissionChange').catch(() => {});
    });
  } catch (err) {
    console.warn('[OneSignal] could not attach permission listener:', err);
  }
}

function attachUserChangeListener(OneSignal) {
  if (_userChangeListenerAttached) return;
  _userChangeListenerAttached = true;

  try {
    OneSignal.User.addEventListener('change', (event) => {
      const externalId = event?.current?.externalId ?? null;
      console.log('[OneSignal] User change event:', {
        onesignalUserId: event?.current?.onesignalId ?? 'none',
        externalId: externalId ?? 'none',
      });

      const pending = _pendingIdentity;
      if (!pending?.email || !externalId) return;
      const expected = pending.id || pending.email;
      if (externalId !== expected) return;

      assignUserEmail(OneSignal, pending.email, { label: 'User change listener' }).catch((err) => {
        console.error('[OneSignal] User change addEmail failed:', err);
      });
    });
  } catch (err) {
    console.warn('[OneSignal] could not attach user change listener:', err);
  }
}

function attachSubscriptionListener(OneSignal) {
  if (_subscriptionListenerAttached) return;
  _subscriptionListenerAttached = true;

  try {
    OneSignal.User.pushSubscription.addEventListener('change', () => {
      const user = readSyncUser();
      if (!user) return;
      console.log('[OneSignal] subscription changed — re-syncing identity', user);
      syncPushUser(user).catch((err) => {
        console.error('[OneSignal] subscription change re-sync failed:', err);
      });
    });
  } catch (err) {
    console.warn('[OneSignal] could not attach subscription listener:', err);
  }
}

export async function initOneSignal() {
  try {
    if (!isCapacitorNative()) {
      finishInit();
      return;
    }
    if (_initialized) {
      finishInit();
      return;
    }

    if (!ONESIGNAL_UUID_RE.test(ONESIGNAL_APP_ID)) {
      console.warn('[OneSignal] App ID is not a valid UUID — native push skipped.');
      finishInit();
      return;
    }

    const { default: OneSignal, LogLevel } = await import('@onesignal/capacitor-plugin');
    _oneSignalInstance = OneSignal;

    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    console.log('[OneSignal] initialization starting', { appId: ONESIGNAL_APP_ID });
    await OneSignal.initialize(ONESIGNAL_APP_ID);
    _initialized = true;
    console.log('[OneSignal] initialization complete');

    OneSignal.Notifications.addEventListener('click', async (event) => {
      try {
        const { handleNotificationOpen } = await import('@/lib/notifications-center');
        handleNotificationOpen(event);
      } catch (err) {
        console.error('[OneSignal] notification open handler failed:', err);
      }
    });

    attachPermissionListener(OneSignal);
    attachUserChangeListener(OneSignal);
    attachSubscriptionListener(OneSignal);

    await sleep(150);

    const granted = await requestOsPermissionIfAllowed(OneSignal, { label: 'init (first launch)' });
    if (granted) {
      await optInWhenPermitted(OneSignal, { label: 'init optIn' });
    }

    await logPushState(OneSignal, 'init complete (pre-auth)');

    const restoredUser = readSyncUser();
    if (restoredUser) {
      await identifyUser(OneSignal, restoredUser);
    }

    finishInit();
  } catch (error) {
    console.error('[OneSignal] initOneSignal failed:', error);
    finishInit();
  }
}

export async function syncPushUser(userOrId) {
  const user = normalizeUserArg(userOrId);
  if (!isCapacitorNative() || !user) return false;

  if (_syncInFlight) {
    return _syncInFlight;
  }

  _syncInFlight = (async () => {
    try {
      await _initPromise;
      const OneSignal = await getOneSignal();
      if (!OneSignal) return false;

      console.log('[OneSignal] syncPushUser start (post-login):', {
        loggedInUserId: user.id ?? 'none',
        loggedInUserEmail: user.email ?? 'none',
      });

      const identity = await identifyUser(OneSignal, user);

      if (!(await isPushReady(OneSignal)) && (await osPermissionGranted(OneSignal))) {
        await bindPushToIdentifiedUser(OneSignal, user, 'syncPushUser fallback');
      }

      await logPushState(OneSignal, 'syncPushUser complete (post-login)', {
        userId: user.id,
        email: user.email,
        externalId: user.id || user.email,
      });

      const pushReady = await isPushReady(OneSignal);
      const success =
        identity.loginLinked &&
        pushReady &&
        (!user.email || identity.emailAssigned);

      console.log('[OneSignal] syncPushUser summary:', { ...identity, pushReady, success });
      return success;
    } catch (error) {
      console.error('[OneSignal] syncPushUser failed:', error);
      return false;
    } finally {
      _syncInFlight = null;
    }
  })();

  return _syncInFlight;
}

export async function getOneSignalUserId() {
  try {
    if (!isCapacitorNative()) return null;
    const OneSignal = await getOneSignal();
    if (!OneSignal) return null;
    return (await readOnesignalId(OneSignal)) ?? (await OneSignal.User.pushSubscription.getIdAsync?.());
  } catch {
    return null;
  }
}

export const loginOneSignal = syncPushUser;
export const setOneSignalExternalId = (userId) => syncPushUser({ id: userId });

export async function canReceivePushNotifications() {
  try {
    if (!isCapacitorNative()) {
      return typeof Notification !== 'undefined' && Notification.permission === 'granted';
    }
    await _initPromise;
    const OneSignal = await getOneSignal();
    return OneSignal ? isPushReady(OneSignal) : false;
  } catch {
    return false;
  }
}

/**
 * User-initiated permission request (e.g. Profile "Enable notifications").
 * Never shows the OneSignal "Open Settings" fallback — only the OS sheet while allowed.
 */
export async function requestPushPermission() {
  try {
    if (!isCapacitorNative()) return false;
    await _initPromise;
    const OneSignal = await getOneSignal();
    if (!OneSignal) return false;

    const granted = await requestOsPermissionIfAllowed(OneSignal, { label: 'requestPushPermission' });
    if (!granted) return false;

    return optInWhenPermitted(OneSignal, { label: 'requestPushPermission optIn' });
  } catch (error) {
    console.error('[OneSignal] requestPushPermission failed:', error);
    return false;
  }
}

export async function logoutOneSignal() {
  try {
    if (!isCapacitorNative()) return;
    await _initPromise;
    const OneSignal = await getOneSignal();
    if (!OneSignal) return;

    _pendingIdentity = null;
    sessionStorage.removeItem(LAST_SYNC_USER_KEY);
    await OneSignal.logout();
  } catch (error) {
    console.error('[OneSignal] logout failed:', error);
  }
}