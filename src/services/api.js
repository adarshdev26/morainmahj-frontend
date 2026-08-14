import axios from 'axios';
import { clearStoredAuth, getToken } from '@/services/authToken';

// Vite exposes both prefixes (see envPrefix in vite.config.js). Trailing slashes
// are stripped so callers can always pass paths beginning with "/api".
//
// Empty is the normal case rather than a misconfiguration: requests then go to
// /api on the current origin, which the dev server proxies and Nginx serves
// directly in production. An absolute URL is only needed when the app runs
// somewhere that is not in front of either, such as a Capacitor build.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  ''
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turns axios failures into a predictable { message, status } shape and drops a
// rejected token so the next guarded route sends the user back to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? null;

    if (status === 401) {
      clearStoredAuth();
    }

    let message;
    if (status) {
      message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        `Request failed with status ${status}`;
    } else if (error.code === 'ECONNABORTED') {
      message = 'The server took too long to respond. Please try again.';
    } else {
      message = `Could not reach the server at ${API_BASE_URL || 'the configured API URL'}.`;
    }

    return Promise.reject(Object.assign(new Error(message), { status, cause: error }));
  }
);

export default api;
