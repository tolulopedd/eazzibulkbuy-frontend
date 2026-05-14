const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

if (!rawApiBaseUrl && import.meta.env.PROD) {
  console.warn('VITE_API_BASE_URL is not set for production. API requests will use relative /api paths until a production API base URL is configured.');
}

export const API_BASE_URL = (rawApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5050' : '')).replace(/\/$/, '');

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
