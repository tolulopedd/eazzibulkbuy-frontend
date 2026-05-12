import { useEffect, useState } from 'react';
import { fetchActiveSalesItems, fetchSalesItemById } from '../api/salesItems';

export function useSalesItem(salesItemId) {
  const [salesItem, setSalesItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (salesItemId) {
          const item = await fetchSalesItemById(salesItemId);
          if (mounted) {
            setSalesItem(item);
          }
          return;
        }

        const items = await fetchActiveSalesItems();
        if (mounted) {
          setSalesItem(items[0] || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load sales item. Please refresh and try again.');
          setSalesItem(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [salesItemId]);

  return { salesItem, loading, error };
}
