import { useEffect, useState } from 'react';
import { searchCustomers } from '../api/customers';
import { ui } from '../ui/classes';

export default function CustomerSearch({ onSelect }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmed = term.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const data = await searchCustomers(trimmed);
        setResults(data);
      } catch (err) {
        setError(err.message || 'Unable to search buyers. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [term]);

  return (
    <div className="space-y-2.5">
      <input
        className={ui.input}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search by name, email, or phone"
      />

      {loading ? <p className={ui.note}>Searching...</p> : null}
      {error ? <p className={ui.error}>{error}</p> : null}

      {results.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-slate-200">
          {results.map((customer) => (
            <li key={customer.id} className="border-b border-slate-200 last:border-b-0">
              <button
                type="button"
                className="w-full bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-800 transition hover:bg-slate-100"
                onClick={() => {
                  onSelect(customer);
                  setTerm('');
                  setResults([]);
                  setError('');
                }}
              >
                <span className="block font-semibold text-slate-900">{customer.fullName}</span>
                <span className="block leading-6 text-slate-600">{customer.email}</span>
                <span className="block leading-6 text-slate-600">{customer.phone || 'No phone available'}</span>
                <span className="block leading-6 text-slate-600">
                  {[customer.address, customer.city, customer.province, customer.postalCode].filter(Boolean).join(', ') || 'No address available'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
