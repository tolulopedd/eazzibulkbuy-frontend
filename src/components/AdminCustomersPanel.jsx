import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';

const DEFAULT_QUERY = {
  q: '',
  hasOrders: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 15,
};

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function formatCurrency(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

export default function AdminCustomersPanel({ onLoadCustomers }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [meta, setMeta] = useState({
    page: 1,
    limit: DEFAULT_QUERY.limit,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadCustomers(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadCustomers(nextQuery);
      setCustomers(response.items || []);
      setMeta({
        page: response.page || nextQuery.page,
        limit: response.limit || nextQuery.limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Unable to load buyers list. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers(DEFAULT_QUERY);
  }, []);

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadCustomers(nextQuery);
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Buyers</h1>
          <p className="leading-6 text-slate-600">View buyer profiles, contact details, and lifetime order activity.</p>
        </div>

        {error ? <p className={ui.error}>{error}</p> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {customers.map((customer, index) => (
            <article key={customer.id} className={`space-y-2.5 px-4 py-3 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{customer.name}</p>
                  <p className="text-sm text-slate-600">{customer.email}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    customer.isActive
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-[160px_110px_110px_160px_minmax(0,1fr)] xl:items-center">
                <p className="text-sm leading-6 text-slate-700">Phone: <span className="font-semibold text-slate-900">{customer.phone || 'Not provided'}</span></p>
                <p className="text-sm leading-6 text-slate-700">Total orders: <span className="font-semibold text-slate-900">{customer.totalOrders}</span></p>
                <p className="text-sm leading-6 text-slate-700">Paid orders: <span className="font-semibold text-slate-900">{customer.paidOrders}</span></p>
                <p className="text-sm leading-6 text-slate-700">Total paid: <span className="font-semibold text-slate-900">{formatCurrency(customer.totalPaidAmount)}</span></p>
                <p className="text-sm leading-6 text-slate-700 xl:text-right">Last order: <span className="font-semibold text-slate-900">{formatDateTime(customer.lastOrderAt)}</span></p>
              </div>
              <p className="text-sm leading-6 text-slate-700">Address: {customer.address || 'Not provided'}</p>
            </article>
          ))}
        </div>

        {!loading && customers.length === 0 ? <p className={ui.note}>No buyers match your filters.</p> : null}

        {meta.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className={ui.buttonGhost} onClick={() => goToPage(meta.page - 1)} disabled={loading || meta.page <= 1}>
              Previous page
            </button>
            <p className="text-sm text-slate-600">Showing {listStart}-{listEnd} of {meta.total}</p>
            <button
              type="button"
              className={ui.buttonGhost}
              onClick={() => goToPage(meta.page + 1)}
              disabled={loading || meta.page >= meta.totalPages}
            >
              Next page
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
