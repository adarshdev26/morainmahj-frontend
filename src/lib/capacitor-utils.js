/**
 * Capacitor utilities for handling OAuth redirects and deep links
 */

import { Capacitor } from '@capacitor/core';
import { setToken, redirectToLogin as redirectToAuthLogin } from '@/services/authApi';
import { appParams } from '@/lib/app-params';
import { clearStoredAuth } from '@/services/authToken';

const CUSTOM_SCHEME = 'morainmahj';
const DEFAULT_POST_LOGIN_PATH = '/app';
const PENDING_POST_LOGIN_PATH_KEY = 'capacitor_pending_post_login_path';
const IOS_NATIVE_SHELL_ORIGIN = 'capacitor://localhost';
const ANDROID_NATIVE_SHELL_ORIGIN = 'https://localhost';

/**
 * Origin of the locally bundled Capacitor app (not morainmahj.com).
 * Android Capacitor uses https://localhost; iOS uses capacitor://localhost.
 */
export const getNativeShellOrigin = () => {
  if (typeof window !== 'undefined') {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return ANDROID_NATIVE_SHELL_ORIGIN;
    }
    if (platform === 'ios') {
      return IOS_NATIVE_SHELL_ORIGIN;
    }
    // Bridge not ready — infer from current URL when already on the bundled shell
    if (window.location?.hostname === 'localhost') {
      return `${window.location.protocol}//localhost`;
    }
  }
  return IOS_NATIVE_SHELL_ORIGIN;
};

const isNativeShellHref = (href) => {
  if (!href) return false;
  try {
    const parsed = new URL(href);
    if (parsed.hostname !== 'localhost') return false;
    return (
      parsed.protocol === 'capacitor:' ||
      parsed.protocol === 'ionic:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'http:'
    );
  } catch {
    return href.startsWith('capacitor://') || href.startsWith('ionic://');
  }
};

/**
 * Check if running in Capacitor native platform (iOS/Android)
 */
export const isCapacitorNative = () => {
  if (typeof window.Capacitor?.isNativePlatform === 'function') {
    return window.Capacitor.isNativePlatform();
  }
  // Fallback before Capacitor bridge attaches (e.g. index bootstrap)
  if (window.location?.protocol === 'capacitor:') return true;
  return (
    window.location?.hostname === 'localhost' &&
    (window.location?.protocol === 'https:' || window.location?.protocol === 'http:')
  );
};

/**
 * Open an external URL. On native iOS/Android uses in-app browser (Safari/Chrome tab)
 * because target="_blank" links often hang inside the Capacitor WebView.
 */
export async function openExternalLink(url) {
  if (!url) return;

  let normalized = String(url).trim();
  if (!normalized) return;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  if (isCapacitorNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: normalized });
    return;
  }

  window.open(normalized, '_blank', 'noopener,noreferrer');
};

const SHARE_CANCELED_RE = /cancel/i;

/** True when the user dismissed the native share sheet without sharing. */
export const isShareCanceled = (error) =>
  SHARE_CANCELED_RE.test(String(error?.message || error || ''));

/**
 * Sanitize a user-facing string for use as a filename (no path segments).
 */
export const sanitizeFilename = (name, fallback = 'file') => {
  const base = String(name || '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || fallback;
};

/**
 * Write text to a temp file and open the native share sheet (or trigger a web download).
 * Uses Cache on native so the OS can hand the file to Calendar and other apps.
 */
export async function shareTextFile({
  content,
  filename,
  title,
  text,
  mimeType = 'text/plain',
  onShareSheetOpen,
}) {
  const safeName = filename.includes('.') ? filename : `${filename}.txt`;

  if (!isCapacitorNative()) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    onShareSheetOpen?.();
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  const cachePath = `shared/${Date.now()}_${safeName}`;

  await Filesystem.writeFile({
    path: cachePath,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    directory: Directory.Cache,
    path: cachePath,
  });

  onShareSheetOpen?.();

  try {
    await Share.share({
      title: title || 'Share file',
      text,
      files: [uri],
      dialogTitle: title || 'Share',
    });
  } finally {
    try {
      await Filesystem.deleteFile({
        path: cachePath,
        directory: Directory.Cache,
      });
    } catch {
      /* temp file may already be gone */
    }
  }
}

/**
 * Normalize an in-app path (must start with /).
 */
const normalizeAppPath = (path) => {
  if (!path) return null;
  const trimmed = String(path).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return trimmed.split('#')[0] || '/';
  }

  try {
    const parsed = new URL(trimmed, 'https://app.local');
    const normalized = parsed.pathname + parsed.search;
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  } catch {
    return `/${trimmed.replace(/^\/+/, '')}`;
  }
};

/**
 * Normalize a post-login path from a URL, query string, or path fragment.
 * morainmahj://?redirect_url=/app → /app
 */
export const parseDeepLinkPath = (urlOrPath) => {
  if (!urlOrPath) return null;

  try {
    const raw = String(urlOrPath).trim();

    if (raw.startsWith(`${CUSTOM_SCHEME}://`)) {
      const parsed = new URL(raw);
      const redirectParam =
        parsed.searchParams.get('redirect_url') || parsed.searchParams.get('next');
      if (redirectParam) {
        return normalizeAppPath(decodeURIComponent(redirectParam));
      }
      return DEFAULT_POST_LOGIN_PATH;
    }

    const parsed = raw.includes('://')
      ? new URL(raw)
      : new URL(raw.startsWith('/') ? raw : `/${raw}`, window.location.origin);

    const redirectParam =
      parsed.searchParams.get('redirect_url') || parsed.searchParams.get('next');

    if (redirectParam) {
      return normalizeAppPath(decodeURIComponent(redirectParam));
    }

    const path = parsed.pathname + parsed.search;
    if (path && path !== '/') {
      return normalizeAppPath(path);
    }
  } catch (e) {
    console.error('Invalid deep link URL:', e);
  }

  return null;
};

/**
 * Path to open after OAuth — uses redirect_url or defaults to /app on native.
 */
export const resolveCapacitorPostLoginPath = (urlOrPath) => {
  if (!isCapacitorNative()) {
    return parseDeepLinkPath(urlOrPath);
  }

  const path = parseDeepLinkPath(urlOrPath);
  if (path) return path;

  if (urlOrPath && String(urlOrPath).startsWith(`${CUSTOM_SCHEME}://`)) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return null;
};

/**
 * Persist access_token from OAuth return URL (morainmahj:// or hosted redirect).
 */
const readAccessTokenFromUrl = (parsed) => {
  const fromQuery = parsed.searchParams.get('access_token');
  if (fromQuery) return fromQuery;

  const hash = parsed.hash?.replace(/^#/, '');
  if (!hash) return null;

  return new URLSearchParams(hash).get('access_token');
};

export const handleOAuthReturnUrl = (url) => {
  if (!url) return;

  try {
    const parsed = new URL(String(url));
    const token = readAccessTokenFromUrl(parsed);
    if (token) {
      setToken(token, true);
    }
  } catch (e) {
    console.error('handleOAuthReturnUrl failed:', e);
  }
};

/**
 * Native shell reloaded with ?access_token=...&redirect_url=/app (from iOS OAuthBridgeViewController).
 *
 * NOTE: app-params.js removes access_token from the URL at module-init time so it can
 * store the token in localStorage.  By the time this function runs, the URL may only
 * have ?redirect_url=/app left.  We must honour that even when there is no token in URL.
 */
export const processNativeShellOAuthParams = (navigate) => {
  if (!isCapacitorNative() || typeof navigate !== 'function') {
    return false;
  }

  const href = window.location.href;
  if (!isNativeShellHref(href)) {
    return false;
  }

  try {
    const parsed = new URL(href);

    // Token still present in URL (app-params.js hasn't stripped it yet, rare race)
    const token = readAccessTokenFromUrl(parsed);
    if (token) {
      handleOAuthReturnUrl(href);
      persistNativeAuthToken(token);
      const path =
        resolveCapacitorPostLoginPath(href) ||
        consumePendingPostLoginPath() ||
        DEFAULT_POST_LOGIN_PATH;
      cleanupRedirectParams(path);
      navigate(path, { replace: true });
      return true;
    }

    // app-params.js already consumed the token; redirect_url is still in URL
    const rawRedirect =
      parsed.searchParams.get('redirect_url') || parsed.searchParams.get('next');
    if (rawRedirect) {
      const existingToken =
        localStorage.getItem('authToken') || localStorage.getItem('token');
      if (existingToken) {
        persistNativeAuthToken(existingToken);
      }
      const pending = consumePendingPostLoginPath();
      let path = pending;
      if (!path) {
        try {
          const decoded = decodeURIComponent(rawRedirect);
          path = decoded.startsWith('/') ? decoded : `/${decoded}`;
        } catch {
          path = DEFAULT_POST_LOGIN_PATH;
        }
      }
      if (!path || path === '/') path = DEFAULT_POST_LOGIN_PATH;
      cleanupRedirectParams(path);
      navigate(path, { replace: true });
      return true;
    }
  } catch (e) {
    console.error('processNativeShellOAuthParams failed:', e);
  }

  return false;
};

export const stashPendingPostLoginPath = (path) => {
  if (!isCapacitorNative() || !path) return;
  try {
    sessionStorage.setItem(PENDING_POST_LOGIN_PATH_KEY, path);
  } catch {
    /* ignore */
  }
};

export const consumePendingPostLoginPath = () => {
  try {
    const path = sessionStorage.getItem(PENDING_POST_LOGIN_PATH_KEY);
    sessionStorage.removeItem(PENDING_POST_LOGIN_PATH_KEY);
    return path ? normalizeAppPath(path) : null;
  } catch {
    return null;
  }
};

// Production app domain — OAuth/deep-link returns may land here instead of morainmahj://
const APP_PRODUCTION_DOMAIN = 'morainmahj.com';

const isAppProductionDomain = (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === APP_PRODUCTION_DOMAIN || host.endsWith(`.${APP_PRODUCTION_DOMAIN}`);
  } catch {
    return false;
  }
};

/**
 * Previously recovered OAuth returns from a hosted third-party auth domain.
 * Auth is now app-owned (/login, /native-login), so this is a no-op.
 */
export const recoverOAuthIfReturnedToHostedApp = () => false;

/**
 * Navigate via React Router after a native deep link (OAuth return).
 * Returns true when navigation was applied (or shell reload scheduled).
 */
export const applyCapacitorPostLoginNavigation = (navigate, urlOrPath) => {
  if (!isCapacitorNative() || typeof navigate !== 'function') {
    return false;
  }

  handleOAuthReturnUrl(urlOrPath);

  const path = resolveCapacitorPostLoginPath(urlOrPath) || DEFAULT_POST_LOGIN_PATH;
  if (!path.startsWith('/')) {
    return false;
  }

  stashPendingPostLoginPath(path);

  // OAuth may still be on hosted URL in the same WebView — reload bundled app shell
  if (/^https?:/i.test(window.location.href)) {
    window.location.replace(getNativeShellOrigin());
    return true;
  }

  cleanupRedirectParams(path);
  navigate(path, { replace: true });
  return true;
};

/**
 * Get the proper redirect URL for OAuth login in Capacitor
 * On native platforms, uses custom URL scheme
 * On web, uses the current origin
 */
export const getOAuthRedirectUrl = (nextUrl) => {
  if (!isCapacitorNative()) {
    return nextUrl || window.location.origin;
  }

  let path = DEFAULT_POST_LOGIN_PATH;

  if (nextUrl) {
    try {
      path = nextUrl.startsWith('http')
        ? new URL(nextUrl).pathname + new URL(nextUrl).search
        : nextUrl.startsWith('/')
          ? nextUrl
          : `/${nextUrl}`;
    } catch {
      path = DEFAULT_POST_LOGIN_PATH;
    }
  }

  if (path === '/' || path === '') {
    path = DEFAULT_POST_LOGIN_PATH;
  }

  return `${CUSTOM_SCHEME}://?redirect_url=${encodeURIComponent(path)}`;
};

/**
 * Handle post-login redirect in Capacitor.
 * Extracts redirect_url from query params and returns the path to navigate to.
 */
export const handleCapacitorRedirect = async () => {
  if (!isCapacitorNative()) {
    return null;
  }

  return parseDeepLinkPath(window.location.href);
};

/**
 * Clean up redirect parameters from URL after handling
 */
export const cleanupRedirectParams = (targetPath = '/') => {
  if (!isCapacitorNative()) {
    return;
  }

  try {
    const path = normalizeAppPath(targetPath) || '/';
    window.history.replaceState({}, document.title, path);
  } catch {
    /* ignore */
  }
};

/**
 * True when the app runs in a Capacitor shell (https://localhost or capacitor://localhost).
 * Must not use window.location.origin for Stripe return URLs in this context.
 */
export function isCapacitorShellContext() {
  if (typeof window === 'undefined') return false;
  if (isCapacitorNative()) return true;

  const { hostname, protocol } = window.location;
  if (protocol === 'capacitor:' || protocol === 'ionic:') return true;
  if (hostname === 'localhost' && (protocol === 'https:' || protocol === 'http:')) return true;

  return false;
}

/** Canonical custom domain — always use for Stripe return URLs. */
export const CANONICAL_APP_ORIGIN = 'https://morainmahj.com';

/**
 * Public HTTPS origin for Stripe return URLs and hosted redirect pages.
 * Never use localhost — Stripe requires a public HTTPS origin.
 */
export function getHostedAppBaseUrl() {
  const configured = (
    appParams.appBaseUrl ||
    import.meta.env.VITE_APP_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(/\/$/, '');

  if (configured.includes('morainmahj.com')) {
    return configured;
  }

  return CANONICAL_APP_ORIGIN;
}

/**
 * Stripe success/cancel URLs for checkout session creation.
 * Stripe requires HTTPS — never localhost or custom schemes (morainmahj://).
 * Mobile: hosted /mobile-payment-return page deep-links back into the app.
 * Web: direct path on the hosted app.
 */
export function getStripeReturnUrls({ successPath, cancelPath }) {
  const success = normalizeAppPath(successPath) || '/app';
  const cancel = normalizeAppPath(cancelPath) || success;
  const hostedBase = getHostedAppBaseUrl();

  if (isCapacitorShellContext()) {
    return {
      success_url: `${hostedBase}/mobile-payment-return?redirect_url=${encodeURIComponent(success)}`,
      cancel_url: `${hostedBase}/mobile-payment-return?redirect_url=${encodeURIComponent(cancel)}`,
    };
  }

  return {
    success_url: `${hostedBase}${success}`,
    cancel_url: `${hostedBase}${cancel}`,
  };
}

/**
 * @deprecated Course payments use native Stripe PaymentSheet — see stripe-native.js.
 * Tournament payments may still use this until migrated.
 */
export async function openNativeStripeCheckout(checkoutUrl, onBrowserClosed) {
  const { Browser } = await import('@capacitor/browser');
  const listener = await Browser.addListener('browserFinished', async () => {
    try {
      await listener.remove();
    } catch {
      /* ignore */
    }
    await onBrowserClosed?.();
  });
  await Browser.open({ url: checkoutUrl });
}

/** Remove auth tokens locally without triggering a server logout redirect. */
export const clearLocalAuth = () => {
  clearStoredAuth();
  try {
    localStorage.removeItem('token');
  } catch {
    /* storage unavailable — nothing to clear */
  }
};

const PREF_TOKEN_KEY = 'mm_auth_token';

/**
 * Persist JWT for native cold starts (Preferences + authToken storage).
 */
export const persistNativeAuthToken = async (token) => {
  if (!token || !isCapacitorNative()) return;
  setToken(token, true);
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: PREF_TOKEN_KEY, value: token });
  } catch (e) {
    console.warn('[Auth] persistNativeAuthToken failed:', e);
  }
};

/**
 * Normalize post-login path from a path or absolute URL.
 */
export const resolvePostLoginPath = (nextUrl) => {
  if (!nextUrl) return DEFAULT_POST_LOGIN_PATH;
  try {
    if (String(nextUrl).startsWith('http')) {
      const parsed = new URL(nextUrl);
      const path = parsed.pathname + parsed.search;
      return path && path !== '/' ? path : DEFAULT_POST_LOGIN_PATH;
    }
    const trimmed = String(nextUrl).trim();
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }
};

/**
 * Build hosted login URL (native injects CSS to hide social buttons on /login).
 */
export const getHostedLoginUrl = (nextPath = '/app') => {
  const oauthReturnUrl = getOAuthRedirectUrl(nextPath);
  const appBase = (
    appParams.appBaseUrl ||
    import.meta.env.VITE_APP_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(/\/$/, '') || 'https://morainmahj.com';

  return `${appBase}/login?native=1&from_url=${encodeURIComponent(oauthReturnUrl)}`;
};

/**
 * Login redirect.
 * Web: app /login page. Native: in-app /native-login (no external OAuth host).
 */
export const redirectToLogin = (nextPath = '/app') => {
  if (!isCapacitorNative()) {
    redirectToAuthLogin(nextPath);
    return;
  }

  window.location.href = '/native-login';
};