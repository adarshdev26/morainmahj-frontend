import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '@/lib/AuthContext';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import { syncPushUser } from '@/lib/onesignal';

/**
 * Re-links OneSignal external_id + push opt-in after login and when app resumes.
 */
export default function PushSubscriptionSync() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isCapacitorNative() || isLoadingAuth || !isAuthenticated || (!user?.id && !user?.email)) {
      return undefined;
    }

    const pushUser = { id: user.id, email: user.email };
    console.log('[PushSubscriptionSync] syncing OneSignal user:', {
      loggedInUserId: pushUser.id ?? 'none',
      loggedInUserEmail: pushUser.email ?? 'none',
    });
    syncPushUser(pushUser).then((ok) => {
      console.log('[PushSubscriptionSync] syncPushUser result:', ok ? 'success' : 'failed');
    });

    let listenerHandle;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) syncPushUser(pushUser);
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [isAuthenticated, isLoadingAuth, user?.id, user?.email]);

  return null;
}
