// Session storage for the morainmahj-backend JWT. Kept free of axios so the
// router can check for a token at boot without pulling in the HTTP client.

export const TOKEN_STORAGE_KEY = 'authToken';
export const USER_STORAGE_KEY = 'authUser';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

// The user cached at login, so the dashboard can render before /api/auth/me returns.
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('[auth] could not cache user:', err);
  }
}

export function storeAuth(token, user) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.warn('[auth] could not persist session:', err);
  }
  if (user) storeUser(user);
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
