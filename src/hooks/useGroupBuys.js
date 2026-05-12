import { useEffect, useState } from 'react';
import { fetchGroupBuys } from '../api/groupBuys';

export function useGroupBuys() {
  const [groupBuys, setGroupBuys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchGroupBuys();
        if (mounted) {
          setGroupBuys(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load group-buy products. Please try again.');
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
  }, []);

  return { groupBuys, loading, error };
}
