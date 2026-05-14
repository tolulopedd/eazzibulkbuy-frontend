import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import { formatOrderReferenceDisplay } from '../utils/orderReference';
import {
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
} from './AdminTablePrimitives';
import { exportAdminOrders } from '../api/admin';

const DEFAULT_QUERY = {
  q: '',
  batchNumber: '',
  fulfillmentMethod: '',
  fulfillmentStatus: '',
  paidOnly: 'true',
  sortBy: 'paidAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
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

function getActionLabel(order) {
  return order.fulfillmentMethod === 'DELIVERY' ? 'Confirm delivery' : 'Confirm pickup';
}

function getNextStatus(order) {
  return order.fulfillmentMethod === 'DELIVERY' ? 'DELIVERED' : 'PICKED_UP';
}

function canConfirm(order) {
  if (order.fulfillmentMethod === 'DELIVERY') {
    return order.fulfillmentStatus !== 'DELIVERED';
  }
  return order.fulfillmentStatus !== 'PICKED_UP';
}

function getStatusTone(status) {
  if (status === 'PICKED_UP' || status === 'DELIVERED') return 'success';
  return 'warning';
}

export default function AdminFulfillmentPanel({ onLoadOrders, onUpdateFulfillmentStatus, onRefreshReports }) {
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
  const [status, setStatus] = useState('');
  const [updatingReference, setUpdatingReference] = useState('');
  const [exporting, setExporting] = useState(false);

  async function loadFulfillment(nextQuery = query) {
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
      setError(err.message || 'Unable to load pickup and delivery orders right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFulfillment(DEFAULT_QUERY);
  }, []);

  async function applyFilters() {
    const nextQuery = {
      ...query,
      q: query.q.trim(),
      batchNumber: query.batchNumber.trim(),
      page: 1,
    };
    setQuery(nextQuery);
    await loadFulfillment(nextQuery);
  }

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadFulfillment(nextQuery);
  }

  async function handleConfirm(order) {
    setUpdatingReference(order.orderReference);
    setStatus('');
    setError('');
    try {
      const result = await onUpdateFulfillmentStatus(order.orderReference, getNextStatus(order));
      setStatus(result.message || 'Fulfilment confirmed successfully.');
      await loadFulfillment(query);
      if (onRefreshReports) {
        await onRefreshReports();
      }
    } catch (err) {
      setError(err.message || 'Unable to confirm this pickup or delivery.');
    } finally {
      setUpdatingReference('');
    }
  }

  async function handleExportPaidDeliveryOrders() {
    setExporting(true);
    setError('');
    try {
      const { blob, fileName } = await exportAdminOrders({
        ...query,
        q: query.q.trim(),
        batchNumber: query.batchNumber.trim(),
        paidOnly: 'true',
        fulfillmentMethod: 'DELIVERY',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\.csv$/i, '.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Unable to export paid delivery orders right now.');
    } finally {
      setExporting(false);
    }
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Fulfilment</h1>
            <p className="leading-6 text-slate-600">Confirm pickup or delivery for paid orders and export delivery orders for field operations.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_200px_220px_220px]">
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
                onChange={(event) => setQuery((current) => ({ ...current, batchNumber: event.target.value }))}
                placeholder="TOM-APR-2026-A"
              />
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
            <div className="xl:col-span-4 flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonPrimary} onClick={applyFilters} disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </button>
              <button type="button" className={ui.buttonGhost} onClick={handleExportPaidDeliveryOrders} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export paid delivery orders'}
              </button>
            </div>
          </div>

          {status ? <p className={ui.success}>{status}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Date</th>
                  <th className={ui.tableHeaderCell}>Buyer</th>
                  <th className={ui.tableHeaderCell}>Batch</th>
                  <th className={ui.tableHeaderCell}>Fulfilment</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={ui.tableHeaderCell}>Amount</th>
                  <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={ui.tableRow}>
                    <td className={ui.tableCell}>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user)}</p>
                        <p className="text-xs text-slate-500">{order.salesItem?.name || 'Order items'} · Qty {order.quantity}</p>
                      </div>
                    </td>
                    <td className={ui.tableCell}>{formatDate(order.paidAt || order.createdAt)}</td>
                    <td className={ui.tableCell}>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{order.user?.name || 'Unknown buyer'}</p>
                        <p className="text-xs text-slate-500">{order.user?.phone || order.user?.email || '—'}</p>
                      </div>
                    </td>
                    <td className={`${ui.tableCell} font-medium text-slate-900`}>{order.salesItem?.batchNumber || '—'}</td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={formatLabel(order.fulfillmentMethod)} tone={order.fulfillmentMethod === 'DELIVERY' ? 'warning' : 'success'} />
                    </td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={formatLabel(order.fulfillmentStatus)} tone={getStatusTone(order.fulfillmentStatus)} />
                    </td>
                    <td className={`${ui.tableCell} font-semibold text-slate-900`}>{formatCurrency(order.totalAmount)}</td>
                    <td className={`${ui.tableCell} text-right`}>
                      {canConfirm(order) ? (
                        <button
                          type="button"
                          className={ui.buttonGhost}
                          onClick={() => handleConfirm(order)}
                          disabled={updatingReference === order.orderReference}
                        >
                          {updatingReference === order.orderReference ? 'Saving...' : getActionLabel(order)}
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-slate-500">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && orders.length === 0 ? <AdminTableEmpty message="No paid pickup or delivery orders match the current view." /> : null}
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
    </section>
  );
}
