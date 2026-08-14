import api from '@/services/api';
import { clearStoredAuth, getStoredUser, getToken, isAuthenticated, storeAuth, storeUser } from '@/services/authToken';

export { clearStoredAuth, getStoredUser, getToken, isAuthenticated };

export async function login(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password });

  if (!data?.token) {
    throw new Error('The server did not return a token.');
  }

  storeAuth(data.token, data.user);
  return data.user;
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/api/auth/me');
  if (data?.user) storeUser(data.user);
  return data?.user ?? null;
}

export function logout() {
  clearStoredAuth();
}
