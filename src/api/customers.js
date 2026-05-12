const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

export async function searchCustomers(query) {
  const response = await fetch(`${API_BASE_URL}/api/customers/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Unable to search buyers. Please try again.');
  }
  return response.json();
}

export async function saveCustomerDetails(payload) {
  const response = await fetch(`${API_BASE_URL}/api/customers/save`, {
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
