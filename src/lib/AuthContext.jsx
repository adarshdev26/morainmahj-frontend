import React, { createContext, useState, useContext, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  handleCapacitorRedirect,
  cleanupRedirectParams,
  redirectToLogin as capacitorRedirectToLogin,
  resolvePostLoginPath,
} from '@/lib/capacitor-utils';
import { syncPushUser, logoutOneSignal } from '@/lib/onesignal';
import { syncPushUserWeb } from '@/lib/onesignal-web';
import {
  clearStoredAuth,
  fetchCurrentUser,
  isAuthenticated as hasBackendToken,
  logout as apiLogout,
  me,
  setToken,
} from '@/services/authApi';
import { getToken } from '@/services/authToken';

const PREF_TOKEN_KEY = 'mm_auth_token';

const saveTokenToPrefs = async (token) => {
  if (!Capacitor.isNativePlatform() || !token) return;
  try {
    await Preferences.set({ key: PREF_TOKEN_KEY, value: token });
  } catch (e) {
    console.warn('[Auth] saveTokenToPrefs failed:', e);
  }
};

const getTokenFromPrefs = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { value } = await Preferences.get({ key: PREF_TOKEN_KEY });
    return value || null;
  } catch {
    return null;
  }
};

const nukeAllStorage = async () => {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (!name) return;
      const exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `${name}=;${exp};path=/`;
      document.cookie = `${name}=;${exp};path=/;domain=.morainmahj.com`;
    });
  } catch {}
  try {
    const dbs = await window.indexedDB?.databases?.();
    if (dbs?.length) {
      await Promise.all(dbs.map((db) => db.name && window.indexedDB.deleteDatabase(db.name)));
    }
  } catch {}
  if (Capacitor.isNativePlatform()) {
    try { await Preferences.clear(); } catch {}
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      setIsLoadingPublicSettings(false);
      await checkUserAuth();
    } catch (error) {
      console.error('[Auth] Unexpected error in checkAppState:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      if (hasBackendToken()) {
        try {
          const backendUser = await fetchCurrentUser();
          if (backendUser) {
            setUser(backendUser);
            setIsAuthenticated(true);
            setAuthError(null);
            setIsLoadingAuth(false);
            return;
          }
        } catch (error) {
          console.error('[Auth] backend session check failed:', error);
          if (error.status === 401 || error.status === 403) clearStoredAuth();
        }
      }

      if (Capacitor.isNativePlatform()) {
        let token = await getTokenFromPrefs();
        console.log('[Auth] Preferences token:', token ? 'found' : 'null');

        if (!token) {
          token = localStorage.getItem('authToken') || localStorage.getItem('token');
          console.log('[Auth] localStorage token:', token ? 'found' : 'null');
        }

        if (!token) {
          console.log('[Auth] No JWT found → not authenticated (skipping me())');
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          return;
        }

        setToken(token, true);
        await saveTokenToPrefs(token);
      }

      if (!getToken()) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      const currentUser = await me();
      console.log('[Auth] me() succeeded — user:', currentUser?.email || currentUser?.full_name);
      setUser(currentUser);
      setIsAuthenticated(true);

      if (currentUser?.id || currentUser?.email) {
        const pushLinked = Capacitor.isNativePlatform()
          ? await syncPushUser({
              id: currentUser.id,
              email: currentUser.email,
            })
          : await syncPushUserWeb({
              id: currentUser.id,
              email: currentUser.email,
            });
        console.log('[Auth] OneSignal sync result:', pushLinked ? 'success' : 'failed');
      }

      if (Capacitor.isNativePlatform()) {
        const liveToken = getToken();
        if (liveToken) await saveTokenToPrefs(liveToken);
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('[Auth] checkUserAuth failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);

      if (error.status === 401 || error.status === 403) {
        await nukeAllStorage();
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const logout = async () => {
    logoutOneSignal();

    try {
      await apiLogout();
    } catch {}

    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.clear();
      }
    } catch {}

    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}

    try {
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim();
        if (!name) return;
        const exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = `${name}=;${exp};path=/`;
        document.cookie = `${name}=;${exp};path=/;domain=.morainmahj.com`;
      });
    } catch {}

    try {
      const dbs = await indexedDB.databases?.();
      if (dbs?.length) {
        await Promise.all(dbs.map((db) => db.name && indexedDB.deleteDatabase(db.name)));
      }
    } catch {}

    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);

    if (Capacitor.isNativePlatform()) {
      window.location.href = '/';
    } else {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = (nextUrl) => {
    if (Capacitor.isNativePlatform()) {
      const path = resolvePostLoginPath(nextUrl || '/app');
      capacitorRedirectToLogin(path);
      return;
    }
    window.location.href = '/login';
  };

  useEffect(() => {
    const handleRedirect = async () => {
      const redirectPath = await handleCapacitorRedirect();
      if (redirectPath) {
        cleanupRedirectParams();
      }
    };
    handleRedirect();
  }, []);

  const organizationId = user?.data?.organization_id || user?.organization_id || null;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      organizationId,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
