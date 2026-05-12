import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import { formatOrderReferenceDisplay } from '../utils/orderReference';

const DEFAULT_QUERY = {
  q: '',
  paidOnly: 'true',
  status: '',
  paymentStatus: '',
  paymentMethod: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 15,
};

function formatLabel(value) {
  if (!value) {
    return 'Unknown';
  }
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

export default function AdminOrdersPanel({ onLoadOrders }) {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [meta, setMeta] = useState({
    page: 1,
    limit: DEFAULT_QUERY.limit,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadOrders(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadOrders(nextQuery);
      setOrders(response.items || []);
      setMeta({
        page: response.page || nextQuery.page,
        limit: response.limit || nextQuery.limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Unable to load orders list. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders(DEFAULT_QUERY);
  }, []);

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadOrders(nextQuery);
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Orders</h1>
          <p className="leading-6 text-slate-600">Track paid orders, payment states, and buyer delivery details.</p>
        </div>

        {error ? <p className={ui.error}>{error}</p> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {orders.map((order, index) => (
            <article key={order.id} className={`space-y-2.5 px-4 py-3 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">
                    {formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user)}
                  </p>
                  <p className="text-sm text-slate-600">{order.user?.name || 'Unknown buyer'} · {order.salesItem?.name || 'Unknown item'}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_150px_140px_170px_170px] xl:items-center">
                <p className="text-sm leading-6 text-slate-700">Email: <span className="font-semibold text-slate-900">{order.user?.email || '—'}</span></p>
                <p className="text-sm leading-6 text-slate-700">Quantity: <span className="font-semibold text-slate-900">{order.quantity}</span></p>
                <p className="text-sm leading-6 text-slate-700">Method: <span className="font-semibold text-slate-900">{formatLabel(order.paymentMethod)}</span></p>
                <p className="text-sm leading-6 text-slate-700">Order status: <span className="font-semibold text-slate-900">{formatLabel(order.status)}</span></p>
                <p className="text-sm leading-6 text-slate-700">Payment status: <span className="font-semibold text-slate-900">{formatLabel(order.paymentStatus)}</span></p>
              </div>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-[160px_220px_220px] xl:items-center">
                <p className="text-sm leading-6 text-slate-700">Phone: <span className="font-semibold text-slate-900">{order.user?.phone || '—'}</span></p>
                <p className="text-sm leading-6 text-slate-700">Created: <span className="font-semibold text-slate-900">{formatDateTime(order.createdAt)}</span></p>
                <p className="text-sm leading-6 text-slate-700">Paid: <span className="font-semibold text-slate-900">{formatDateTime(order.paidAt)}</span></p>
              </div>
            </article>
          ))}
        </div>

        {!loading && orders.length === 0 ? <p className={ui.note}>No orders match your filters.</p> : null}

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
