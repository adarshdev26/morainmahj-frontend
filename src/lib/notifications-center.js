/**
 * Push notification inbox + unified tap → /app/notifications routing.
 * Intentionally minimal: no foregroundWillDisplay hooks (they suppress OS banners).
 */

const INBOX_KEY = 'morain_notification_inbox';
const PENDING_KEY = 'morain_pending_notification_open';
const PENDING_LOCAL_KEY = 'morain_pending_notification_open_local';
const MAX_ITEMS = 100;
const PENDING_TTL_MS = 120000;
const DEDUPE_MS = 8000;

export const NOTIFICATION_CENTER_PATH = '/app/notifications';

let _navigate = null;
let _pendingPath = null;

function loadInbox() {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInbox(items) {
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

function fingerprint({ title = '', message = '', launchUrl = '' }) {
  return `${title}|${message}|${launchUrl || ''}`;
}

function findRecentDuplicate(fp) {
  const cutoff = Date.now() - DEDUPE_MS;
  return loadInbox().find((item) => {
    if (new Date(item.receivedAt).getTime() < cutoff) return false;
    return fingerprint(item) === fp;
  });
}

export function getNotifications() {
  return loadInbox();
}

export function markNotificationRead(id) {
  const items = loadInbox();
  const idx = items.findIndex((n) => n.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], read: true };
  saveInbox(items);
}

export function markAllNotificationsRead() {
  saveInbox(loadInbox().map((n) => ({ ...n, read: true })));
}

export function clearNotificationHistory() {
  saveInbox([]);
}

export function notificationCenterPath(highlightId) {
  return highlightId
    ? `${NOTIFICATION_CENTER_PATH}?highlight=${encodeURIComponent(highlightId)}`
    : NOTIFICATION_CENTER_PATH;
}

export function isNotificationCenterPath(pathname = '') {
  return pathname === NOTIFICATION_CENTER_PATH || pathname.startsWith(`${NOTIFICATION_CENTER_PATH}/`);
}

function readPendingPayload() {
  const sources = [
    () => sessionStorage.getItem(PENDING_KEY),
    () => localStorage.getItem(PENDING_LOCAL_KEY),
  ];
  for (const getRaw of sources) {
    try {
      const raw = getRaw();
      if (!raw) continue;
      const { highlightId, at } = JSON.parse(raw);
      if (!highlightId || Date.now() - at > PENDING_TTL_MS) continue;
      return highlightId;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getPendingNotificationHighlightId() {
  return readPendingPayload();
}

export function hasPendingNotificationOpen() {
  return Boolean(getPendingNotificationHighlightId());
}

function stashPendingHighlight(highlightId) {
  if (!highlightId) return;
  const payload = JSON.stringify({ highlightId, at: Date.now() });
  try {
    sessionStorage.setItem(PENDING_KEY, payload);
    localStorage.setItem(PENDING_LOCAL_KEY, payload);
  } catch {
    /* ignore */
  }
}

export function clearPendingNotificationOpen() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Default path after auth when a push open is pending. */
export function getPostAuthDefaultPath() {
  const highlightId = getPendingNotificationHighlightId();
  if (!highlightId) return '/app';
  // If the pending notification has a direct targetPath (e.g. score_verified → /app/tournament),
  // route there instead of the notification center.
  const entry = loadInbox().find((n) => n.id === highlightId);
  if (entry?.targetPath && entry.targetPath !== NOTIFICATION_CENTER_PATH) {
    return entry.targetPath;
  }
  return notificationCenterPath(highlightId);
}

export function registerNotificationNavigate(navigate) {
  _navigate = navigate;
  if (_pendingPath) {
    navigate(_pendingPath, { replace: true });
    _pendingPath = null;
  }
}

function goToNotificationCenter(highlightId) {
  const path = notificationCenterPath(highlightId);
  if (_navigate) {
    _navigate(path, { replace: true });
    _pendingPath = null;
  } else {
    _pendingPath = path;
  }
}

function resolveTargetPath({ launchUrl, additionalData, title = '', message = '' }) {
  if (additionalData?.type === 'course_enrollment') return NOTIFICATION_CENTER_PATH;
  if (additionalData?.type === 'tournament_registration_confirmed') return '/app/my-tournaments';
  if (additionalData?.type === 'raffle_winner') return '/app/tournament';
  if (additionalData?.type === 'tournament_win') return '/app/my-tournaments';
  if (additionalData?.type === 'tournament_checkin_open') {
    return additionalData.tournament_id
      ? `/app/tournament-home/${additionalData.tournament_id}`
      : '/app';
  }
  if (additionalData?.type === 'score_verified') return '/app/tournament';
  if (additionalData?.type === 'table_assignment') return '/app/tournament';

  // League push notification routing — all league types land on My Leagues
  if (additionalData?.type === 'league_registration') return '/app/leagues';
  if (additionalData?.type === 'league_session_invite') return '/app/leagues';
  if (additionalData?.type === 'league_assignments_published') return '/app/leagues';
  if (additionalData?.type === 'league_rsvp_reminder') return '/app/leagues';
  if (additionalData?.type === 'league_waitlist_promotion') return '/app/leagues';
  if (additionalData?.type === 'league_prize_payout') return '/app/leagues';
  if (additionalData?.type === 'league_score_verification') return '/app/leagues';
  if (additionalData?.type === 'league_board_post') return '/app/leagues';

  let path = null;
  if (launchUrl) {
    try {
      const parsed = launchUrl.includes('://')
        ? new URL(launchUrl)
        : new URL(launchUrl.startsWith('/') ? launchUrl : `/${launchUrl}`, window.location.origin);
      path = parsed.pathname + parsed.search;
    } catch {
      path = null;
    }
  }

  if (!path || path === '/') return '/app';

  const titleLower = String(title).toLowerCase();
  const messageLower = String(message).toLowerCase();
  if (path === '/app' || path.startsWith('/app?')) {
    if (titleLower.includes('score')) return '/app/scorecard';
    if (titleLower.includes('raffle') || titleLower.includes('ticket') || messageLower.includes('raffle')) {
      return '/app/my-tournaments';
    }
    if (titleLower.includes('bid') || messageLower.includes('auction')) return '/app/my-tournaments';
    return '/app';
  }
  return path;
}

function inferCategory({ title = '', message = '', targetPath = '', additionalData = {} }) {
  const blob = `${title} ${message} ${targetPath}`.toLowerCase();
  if (additionalData?.type === 'raffle_winner' || blob.includes('raffle')) return 'raffle';
  if (blob.includes('auction') || blob.includes('bid')) return 'auction';
  if (blob.includes('league')) return 'league';
  if (blob.includes('score') || targetPath.includes('scorecard')) return 'scorecard';
  if (blob.includes('table') || blob.includes('tournament') || targetPath.includes('tournament')) {
    return 'tournament';
  }
  return 'general';
}

export function parsePushEvent(event) {
  const notification = event?.notification ?? event ?? {};
  const additionalData =
    notification.additionalData || notification.data || event?.additionalData || {};

  return {
    title: notification.title || notification.heading || additionalData.title || 'Notification',
    message:
      notification.body ||
      notification.message ||
      additionalData.message ||
      additionalData.body ||
      '',
    launchUrl:
      notification.launchURL ||
      event?.result?.url ||
      additionalData.url ||
      null,
    additionalData,
  };
}

function recordNotification(payload) {
  const { title, message, launchUrl, additionalData } = payload;
  const targetPath = resolveTargetPath({ launchUrl, additionalData, title, message });
  return {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: String(title || 'Notification').trim(),
    message: String(message || '').trim(),
    receivedAt: new Date().toISOString(),
    read: false,
    targetPath,
    category: inferCategory({ title, message, targetPath, additionalData }),
    launchUrl: launchUrl || null,
  };
}

/**
 * Capacitor launch URL from a notification tap (not OAuth).
 */
export function isNotificationLaunchUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(String(url));
    if (parsed.searchParams.get('access_token')) return false;
    if (parsed.searchParams.get('redirect_url') || parsed.searchParams.get('next')) {
      return false;
    }
    const path = parsed.pathname || '';
    if (!path || path === '/' || isNotificationCenterPath(path)) return false;
    return (
      path === '/app' ||
      path.startsWith('/app/') ||
      path.startsWith('/tournament/') ||
      path.startsWith('/league-rsvp') ||
      path.startsWith('/checkin')
    );
  } catch {
    return false;
  }
}

/**
 * Single handler for notification taps (OneSignal click + Capacitor launch URL).
 */
export function handleNotificationOpen(eventOrPayload) {
  const payload = eventOrPayload?.notification
    ? parsePushEvent(eventOrPayload)
    : eventOrPayload;

  const fp = fingerprint(payload);
  const existing = findRecentDuplicate(fp);
  const entry = existing || recordNotification(payload);
  if (!existing) {
    saveInbox([entry, ...loadInbox()]);
  }

  if (entry.targetPath && entry.targetPath !== NOTIFICATION_CENTER_PATH) {
    if (_navigate) {
      _navigate(entry.targetPath, { replace: true });
      _pendingPath = null;
    } else {
      _pendingPath = entry.targetPath;
    }
  } else {
    stashPendingHighlight(entry.id);
    goToNotificationCenter(entry.id);
  }
  return entry;
}