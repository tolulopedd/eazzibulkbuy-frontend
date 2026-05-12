const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

export async function fetchGroupBuys() {
  const response = await fetch(`${API_BASE_URL}/api/group-buys`);
  if (!response.ok) {
    throw new Error('Unable to load group-buy products. Please try again.');
  }
  return response.json();
}
