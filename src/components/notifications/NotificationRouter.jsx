import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  registerNotificationNavigate,
  getPendingNotificationHighlightId,
  notificationCenterPath,
  isNotificationCenterPath,
} from '@/lib/notifications-center';

/**
 * Ensures a pending push tap always lands on Notification Center (any app state, any auth).
 */
export default function NotificationRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    registerNotificationNavigate(navigate);

    const highlightId = getPendingNotificationHighlightId();
    if (!highlightId) return;
    if (isNotificationCenterPath(location.pathname)) return;

    navigate(notificationCenterPath(highlightId), { replace: true });
  }, [navigate, location.pathname, location.search]);

  return null;
}
