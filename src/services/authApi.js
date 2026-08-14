import { get, patch, post } from '@/services/http';
import {
  clearStoredAuth,
  getStoredUser,
  getToken,
  isAuthenticated,
  storeAuth,
  storeUser,
} from '@/services/authToken';

export { clearStoredAuth, getStoredUser, getToken, isAuthenticated, storeAuth, storeUser };

/** POST /api/auth/login → stores JWT + user, returns the user object. */
export async function login(email, password) {
  const data = await post('/api/auth/login', { email, password });
  if (!data?.token) {
    throw new Error('The server did not return a token.');
  }
  storeAuth(data.token, data.user);
  return data.user;
}

/** SDK-shaped login used by NativeLogin — returns { access_token, user }. */
export async function loginViaEmailPassword(email, password) {
  const data = await post('/api/auth/login', { email, password });
  if (!data?.token) {
    throw new Error('The server did not return a token.');
  }
  storeAuth(data.token, data.user);
  return { access_token: data.token, user: data.user };
}

/** GET /api/auth/me → current user (also refreshes the local cache). */
export async function me() {
  const data = await get('/api/auth/me');
  const user = data?.user ?? null;
  if (user) storeUser(user);
  return user;
}

/** Alias used by older call sites / AuthContext. */
export const fetchCurrentUser = me;

/** PATCH /api/auth/me → update profile fields. */
export async function updateMe(fields) {
  const data = await patch('/api/auth/me', fields || {});
  const user = data?.user ?? null;
  if (user) storeUser(user);
  return user;
}

/** Persist JWT (and optional user) for axios + Preferences sync. */
export function setToken(token, saveToStorage = true) {
  if (saveToStorage && token) storeAuth(token);
}

/** POST /api/auth/logout + clear local session. Optional redirect path. */
export async function logout(redirectTo) {
  try {
    if (getToken()) await post('/api/auth/logout', {});
  } catch {
    // Local session is cleared regardless.
  }
  clearStoredAuth();
  if (typeof redirectTo === 'string' && redirectTo) {
    window.location.href = redirectTo;
  }
}

export const signOut = logout;

export async function checkAuthenticated() {
  if (!getToken()) return false;
  try {
    await me();
    return true;
  } catch {
    return false;
  }
}

/** @deprecated alias — prefer checkAuthenticated */
export const isAuthenticatedAsync = checkAuthenticated;

export function redirectToLogin(returnPath) {
  const target = returnPath
    ? `/login?from=${encodeURIComponent(returnPath)}`
    : '/login';
  window.location.href = target;
}

export async function register() {
  const err = new Error('Self-service registration is not available yet.');
  err.status = 501;
  throw err;
}

export async function resetPasswordRequest() {
  const err = new Error(
    'Password reset is not available yet. An administrator can set a password directly.',
  );
  err.status = 501;
  throw err;
}

export async function verifyOtp() {
  const err = new Error('Email verification is not available yet.');
  err.status = 501;
  throw err;
}

export default {
  login,
  loginViaEmailPassword,
  me,
  fetchCurrentUser,
  updateMe,
  setToken,
  logout,
  signOut,
  checkAuthenticated,
  isAuthenticated: checkAuthenticated,
  redirectToLogin,
  register,
  resetPasswordRequest,
  verifyOtp,
  getToken,
  clearStoredAuth,
};
