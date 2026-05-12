const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

export async function fetchSalesItemById(salesItemId) {
  const response = await fetch(`${API_BASE_URL}/api/sales-items/${salesItemId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load sales item. Please try again.');
  }
  return response.json();
}

export async function fetchActiveSalesItems() {
  const response = await fetch(`${API_BASE_URL}/api/sales-items`);
  if (!response.ok) {
    throw new Error('Unable to load active sales items. Please try again.');
  }
  return response.json();
}
