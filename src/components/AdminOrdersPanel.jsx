import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import { formatOrderReferenceDisplay } from '../utils/orderReference';
import {
  AdminIconButton,
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
  CloseIcon,
  EyeIcon,
} from './AdminTablePrimitives';

const DEFAULT_QUERY = {
  q: '',
  batchNumber: '',
  paidOnly: 'true',
  status: '',
  paymentStatus: '',
  paymentMethod: '',
  fulfillmentMethod: '',
  fulfillmentStatus: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 15,
};

function formatLabel(value) {
  if (!value) return 'Unknown';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function getFulfillmentTone(value) {
  if (value === 'DELIVERY') return 'warning';
  if (value === 'PICKUP') return 'success';
  return 'info';
}

function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Order details</h2>
            <p className="text-sm text-slate-600">
              {order.displayOrderReference || formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user, { batchNumber: order.salesItem?.batchNumber, orderSequence: order.orderSequence })} · {order.salesItem?.name || 'Order items'}
            </p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close order details">
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Buyer</p>
            <p className="text-sm font-semibold text-slate-900">{order.user?.name || 'Unknown buyer'}</p>
            <p className="text-sm text-slate-600">{order.user?.email || '—'}</p>
          </div>
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</p>
            <p className="text-base font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
            <p className="text-sm text-slate-600">Qty {order.quantity}</p>
          </div>
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Batch</p>
            <p className="text-base font-semibold text-slate-900">{order.salesItem?.batchNumber || '—'}</p>
            <p className="text-sm text-slate-600">{order.salesItem?.name || 'Order items'}</p>
          </div>
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment method</p>
            <p className="text-base font-semibold text-slate-900">{formatLabel(order.paymentMethod)}</p>
            <p className="text-sm text-slate-600">{formatLabel(order.fulfillmentMethod)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className={`${ui.section} space-y-2`}>
            <p className="text-sm leading-6 text-slate-700">Phone: <span className="font-semibold text-slate-900">{order.user?.phone || '—'}</span></p>
            <p className="text-sm leading-6 text-slate-700">Address: <span className="font-semibold text-slate-900">{order.user?.address || '—'}</span></p>
            <p className="text-sm leading-6 text-slate-700">City: <span className="font-semibold text-slate-900">{order.user?.city || '—'}</span></p>
            <p className="text-sm leading-6 text-slate-700">Province: <span className="font-semibold text-slate-900">{order.user?.province || '—'}</span></p>
            <p className="text-sm leading-6 text-slate-700">Postal code: <span className="font-semibold text-slate-900">{order.user?.postalCode || '—'}</span></p>
          </div>
          <div className={`${ui.section} space-y-2`}>
            <p className="text-sm leading-6 text-slate-700">Created: <span className="font-semibold text-slate-900">{formatDateTime(order.createdAt)}</span></p>
            <p className="text-sm leading-6 text-slate-700">Paid at: <span className="font-semibold text-slate-900">{formatDateTime(order.paidAt)}</span></p>
            <p className="text-sm leading-6 text-slate-700">Order status: <span className="font-semibold text-slate-900">{formatLabel(order.status)}</span></p>
            <p className="text-sm leading-6 text-slate-700">Payment status: <span className="font-semibold text-slate-900">{formatLabel(order.paymentStatus)}</span></p>
            <p className="text-sm leading-6 text-slate-700">Fulfilment status: <span className="font-semibold text-slate-900">{formatLabel(order.fulfillmentStatus)}</span></p>
            <p className="text-sm leading-6 text-slate-700">Location: <span className="font-semibold text-slate-900">{order.salesItem?.pickupInstructions || '—'}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [selectedOrder, setSelectedOrder] = useState(null);

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

  async function applyFilters() {
    const nextQuery = { ...query, q: query.q.trim(), batchNumber: query.batchNumber.trim(), page: 1 };
    setQuery(nextQuery);
    await loadOrders(nextQuery);
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Orders</h1>
            <p className="leading-6 text-slate-600">Track all paid orders in a cleaner ledger view and open a row only when you need full buyer or fulfilment details.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_200px_200px_200px_200px]">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input
                className={ui.input}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                placeholder="Order number, buyer, email"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyFilters();
                  }
                }}
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Batch number</label>
              <input
                className={ui.input}
                value={query.batchNumber}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    batchNumber: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3),
                  }))
                }
                placeholder="AZ1"
                maxLength={3}
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Payment method</label>
              <select className={ui.select} value={query.paymentMethod} onChange={(event) => setQuery((current) => ({ ...current, paymentMethod: event.target.value }))}>
                <option value="">All methods</option>
                <option value="INTERAC_E_TRANSFER">Interac e-Transfer</option>
                <option value="STRIPE_CARD">Stripe card</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Pickup or delivery</label>
              <select className={ui.select} value={query.fulfillmentMethod} onChange={(event) => setQuery((current) => ({ ...current, fulfillmentMethod: event.target.value }))}>
                <option value="">All orders</option>
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Fulfilment status</label>
              <select className={ui.select} value={query.fulfillmentStatus} onChange={(event) => setQuery((current) => ({ ...current, fulfillmentStatus: event.target.value }))}>
                <option value="">All statuses</option>
                <option value="PENDING_PICKUP">Pending pickup</option>
                <option value="PICKED_UP">Picked up</option>
                <option value="PENDING_DELIVERY">Pending delivery</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
            <div className="xl:col-span-5 flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonPrimary} onClick={applyFilters} disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>

          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[1180px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Date</th>
                  <th className={ui.tableHeaderCell}>Buyer</th>
                  <th className={ui.tableHeaderCell}>Batch</th>
                  <th className={ui.tableHeaderCell}>Fulfilment</th>
                  <th className={ui.tableHeaderCell}>Fulfilment status</th>
                  <th className={ui.tableHeaderCell}>Method</th>
                  <th className={ui.tableHeaderCell}>Amount</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={ui.tableRow}>
                    <td className={ui.tableCell}>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{order.displayOrderReference || formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user, { batchNumber: order.salesItem?.batchNumber, orderSequence: order.orderSequence })}</p>
                        <p className="text-xs text-slate-500">{order.salesItem?.name || 'Order items'} · Qty {order.quantity}</p>
                      </div>
                    </td>
                    <td className={ui.tableCell}>{formatDate(order.createdAt)}</td>
                      <td className={ui.tableCell}>
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{order.user?.name || 'Unknown buyer'}</p>
                          <p className="text-xs text-slate-500">{order.user?.email || '—'}</p>
                        </div>
                      </td>
                      <td className={`${ui.tableCell} font-medium text-slate-900`}>{order.salesItem?.batchNumber || '—'}</td>
                      <td className={ui.tableCell}>
                        <AdminStatusBadge value={formatLabel(order.fulfillmentMethod)} tone={getFulfillmentTone(order.fulfillmentMethod)} />
                      </td>
                      <td className={ui.tableCell}>
                        <AdminStatusBadge value={formatLabel(order.fulfillmentStatus)} tone={order.fulfillmentStatus === 'PICKED_UP' || order.fulfillmentStatus === 'DELIVERED' ? 'success' : 'warning'} />
                      </td>
                      <td className={ui.tableCell}>{formatLabel(order.paymentMethod)}</td>
                    <td className={`${ui.tableCell} font-semibold text-slate-900`}>{formatCurrency(order.totalAmount)}</td>
                    <td className={ui.tableCell}>
                      <div className="flex flex-wrap gap-2">
                        <AdminStatusBadge value={formatLabel(order.status)} tone={order.status === 'CONFIRMED' ? 'success' : 'info'} />
                        <AdminStatusBadge value={formatLabel(order.paymentStatus)} tone={order.paymentStatus === 'PAID' ? 'success' : 'warning'} />
                      </div>
                    </td>
                    <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                      <AdminIconButton label="View order" onClick={() => setSelectedOrder(order)}>
                        <EyeIcon />
                      </AdminIconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && orders.length === 0 ? <AdminTableEmpty message="No orders match the current view." /> : null}
            <AdminPagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              label={`Showing ${listStart}-${listEnd} of ${meta.total}`}
              onPrev={() => goToPage(meta.page - 1)}
              onNext={() => goToPage(meta.page + 1)}
            />
          </div>
        </div>
      </section>

      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </section>
  );
}
