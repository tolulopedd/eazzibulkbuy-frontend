import { buildApiUrl } from './config';

export async function fetchSalesItemById(salesItemId) {
  const response = await fetch(buildApiUrl(`/api/sales-items/${salesItemId}`));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load sales item. Please try again.');
  }
  return response.json();
}

export async function fetchActiveSalesItems() {
  const response = await fetch(buildApiUrl('/api/sales-items'));
  if (!response.ok) {
    throw new Error('Unable to load active sales items. Please try again.');
  }
  return response.json();
}
