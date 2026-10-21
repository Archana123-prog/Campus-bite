import { useAuthStore } from '../store/useAuthStore';

const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
const cleanApiUrl = rawApiUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');

const BASE = cleanApiUrl ? `${cleanApiUrl}/api/v1` : '/api/v1';

const rawSocketUrl = (import.meta.env.VITE_SOCKET_URL || cleanApiUrl || '').trim();
export const SOCKET_URL = rawSocketUrl
  ? rawSocketUrl.replace(/\/+$/, '')
  : (typeof window !== 'undefined' ? window.location.origin : '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body, retries = 1) {
  const token = useAuthStore.getState().token;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.warn(`[API Network Error] ${method} ${BASE}${path}:`, err);
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return request(method, path, body, retries - 1);
    }
    throw new ApiError('Cannot reach the server. Please check your connection or verify the backend is running.', 0);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok || json?.success === false) {
    if (res.status === 401 && token) useAuthStore.getState().logout();
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status);
  }
  return json;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
