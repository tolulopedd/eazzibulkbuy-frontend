import { buildApiUrl } from './config';

export async function fetchGroupBuys() {
  const response = await fetch(buildApiUrl('/api/group-buys'));
  if (!response.ok) {
    throw new Error('Unable to load group-buy products. Please try again.');
  }
  return response.json();
}
