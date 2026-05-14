import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
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
  hasOrders: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 15,
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatCurrency(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function CustomerDetailsModal({ customer, onClose }) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Buyer details</h2>
            <p className="text-sm text-slate-600">{customer.name} · {customer.email}</p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close buyer details">
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total orders</p>
            <p className="text-2xl font-bold text-slate-900">{customer.totalOrders}</p>
          </div>
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Paid orders</p>
            <p className="text-2xl font-bold text-slate-900">{customer.paidOrders}</p>
          </div>
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lifetime paid</p>
            <p className="text-base font-semibold text-slate-900">{formatCurrency(customer.totalPaidAmount)}</p>
          </div>
          <div className={ui.metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last order</p>
            <p className="text-sm font-semibold text-slate-900">{formatDateTime(customer.lastOrderAt)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className={`${ui.section} space-y-2`}>
            <p className="text-sm leading-6 text-slate-700">Phone: <span className="font-semibold text-slate-900">{customer.phone || 'Not provided'}</span></p>
            <p className="text-sm leading-6 text-slate-700">Address: <span className="font-semibold text-slate-900">{customer.address || 'Not provided'}</span></p>
            <p className="text-sm leading-6 text-slate-700">City: <span className="font-semibold text-slate-900">{customer.city || '—'}</span></p>
            <p className="text-sm leading-6 text-slate-700">Province: <span className="font-semibold text-slate-900">{customer.province || '—'}</span></p>
            <p className="text-sm leading-6 text-slate-700">Postal code: <span className="font-semibold text-slate-900">{customer.postalCode || '—'}</span></p>
          </div>
          <div className={`${ui.section} space-y-2`}>
            <p className="text-sm leading-6 text-slate-700">Status:</p>
            <div>
              <AdminStatusBadge value={customer.isActive ? 'Active' : 'Inactive'} tone={customer.isActive ? 'success' : 'neutral'} />
            </div>
            <p className="text-sm leading-6 text-slate-700">Created: <span className="font-semibold text-slate-900">{formatDateTime(customer.createdAt)}</span></p>
            <p className="text-sm leading-6 text-slate-700">Updated: <span className="font-semibold text-slate-900">{formatDateTime(customer.updatedAt)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);

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

  async function applyFilters() {
    const nextQuery = {
      ...query,
      q: query.q.trim(),
      batchNumber: query.batchNumber.trim(),
      page: 1,
    };
    setQuery(nextQuery);
    await loadCustomers(nextQuery);
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Buyers</h1>
            <p className="leading-6 text-slate-600">Review buyer profiles in a simple customer table and open a record only when you need the full address or order history summary.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_220px_220px]">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input
                className={ui.input}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                placeholder="Buyer name, email, phone"
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
              <label className={ui.label}>Order state</label>
              <select className={ui.select} value={query.hasOrders} onChange={(event) => setQuery((current) => ({ ...current, hasOrders: event.target.value }))}>
                <option value="">All buyers</option>
                <option value="true">With orders</option>
                <option value="false">Without orders</option>
              </select>
            </div>
            <div className="xl:col-span-3 flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonPrimary} onClick={applyFilters} disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>

          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Buyer</th>
                  <th className={ui.tableHeaderCell}>Phone</th>
                  <th className={ui.tableHeaderCell}>Orders</th>
                  <th className={ui.tableHeaderCell}>Lifetime paid</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={ui.tableRow}>
                    <td className={ui.tableCell}>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.email}</p>
                      </div>
                    </td>
                    <td className={ui.tableCell}>{customer.phone || 'Not provided'}</td>
                    <td className={ui.tableCell}>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{customer.totalOrders}</p>
                        <p className="text-xs text-slate-500">{customer.paidOrders} paid</p>
                      </div>
                    </td>
                    <td className={`${ui.tableCell} font-semibold text-slate-900`}>{formatCurrency(customer.totalPaidAmount)}</td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={customer.isActive ? 'Active' : 'Inactive'} tone={customer.isActive ? 'success' : 'neutral'} />
                    </td>
                    <td className={`${ui.tableCell} text-right`}>
                      <AdminIconButton label="View buyer" onClick={() => setSelectedCustomer(customer)}>
                        <EyeIcon />
                      </AdminIconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && customers.length === 0 ? <AdminTableEmpty message="No buyers found for the current view." /> : null}
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

      <CustomerDetailsModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    </section>
  );
}
