import { buildApiUrl } from './config';

export async function searchCustomers(query) {
  const response = await fetch(buildApiUrl(`/api/customers/search?q=${encodeURIComponent(query)}`));
  if (!response.ok) {
    throw new Error('Unable to search buyers. Please try again.');
  }
  return response.json();
}

export async function saveCustomerDetails(payload) {
  const response = await fetch(buildApiUrl('/api/customers/save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Unable to save customer details. Please try again.');
  }

  return response.json();
}
