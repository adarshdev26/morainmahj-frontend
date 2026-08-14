import api from '@/services/api';

/**
 * Thin REST helpers over the shared axios instance.
 * Prefer these (or resource modules) for all API access.
 */

export async function get(path, { params, signal } = {}) {
  const { data } = await api.get(path, { params, signal });
  return data;
}

export async function post(path, body, { params, signal } = {}) {
  const { data } = await api.post(path, body ?? {}, { params, signal });
  return data;
}

export async function put(path, body, { params, signal } = {}) {
  const { data } = await api.put(path, body ?? {}, { params, signal });
  return data;
}

export async function patch(path, body, { params, signal } = {}) {
  const { data } = await api.patch(path, body ?? {}, { params, signal });
  return data;
}

export async function del(path, { params, signal } = {}) {
  const { data } = await api.delete(path, { params, signal });
  return data;
}

export { api };
export default { get, post, put, patch, delete: del, api };
