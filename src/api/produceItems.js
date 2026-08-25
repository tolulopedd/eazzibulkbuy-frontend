import { buildApiUrl } from './config';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(buildApiUrl(path), {
      credentials: 'include',
      ...options,
    });
  } catch {
    throw new Error('Unable to reach backend API. Check that the production API base URL is configured correctly.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to complete this request. Please try again.');
  }

  return response.json();
}

export function fetchProduceItems() {
  return request('/api/produce-items');
}
