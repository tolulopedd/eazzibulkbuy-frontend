import { useEffect, useRef, useState } from 'react';
import { ui } from '../ui/classes';
import {
  AdminStatusBadge,
  AdminTableEmpty,
} from './AdminTablePrimitives';

const DEFAULT_QUERY = {
  q: '',
  page: 1,
  limit: 8,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format((Number(value) || 0) / 100);
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatLabel(value) {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

function getTone(type = '') {
  if (type.includes('CANCELLED') || type.includes('DECLINED')) return 'danger';
  if (type.includes('REFUNDED') || type.includes('STORE_CREDIT') || type.includes('UPDATE')) return 'warning';
  if (type.includes('PAID') || type.includes('COMPLETED') || type.includes('PICKED_UP') || type.includes('DELIVERED') || type.includes('APPROVED')) return 'success';
  return 'neutral';
}

export default function AdminCustomerStatementPanel({
  onLoadCustomers,
  onLoadCustomerStatement,
  initialCustomer,
}) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [loadingCustomerId, setLoadingCustomerId] = useState('');
  const [error, setError] = useState('');
  const statementSectionRef = useRef(null);

  async function loadCustomers(nextQuery = query) {
    setLoadingCustomers(true);
    setError('');
    try {
      const response = await onLoadCustomers(nextQuery);
      setCustomers(response.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load customers right now.');
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadStatement(customer) {
    if (!customer?.id) {
      setError('Unable to load statement because this customer record is missing an ID.');
      return;
    }

    setSelectedCustomer(customer);
    setLoadingStatement(true);
    setLoadingCustomerId(customer.id);
    setStatement(null);
    setError('');
    window.setTimeout(() => {
      statementSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    try {
      setStatement(await onLoadCustomerStatement(customer.id));
    } catch (err) {
      setError(err.message || 'Unable to load customer statement right now.');
    } finally {
      setLoadingStatement(false);
      setLoadingCustomerId('');
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = {
        ...query,
        q: query.q.trim(),
        page: 1,
      };
      loadCustomers(nextQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    if (initialCustomer?.id) {
      loadStatement(initialCustomer);
    }
  }, [initialCustomer?.id]);

  const entries = statement?.entries || [];
  const customer = statement?.customer || selectedCustomer;
  const summary = statement?.summary || {};
  const hasSelectedCustomer = Boolean(customer?.id);

  function handleChangeCustomer() {
    setSelectedCustomer(null);
    setStatement(null);
    setError('');
    setLoadingStatement(false);
    setLoadingCustomerId('');
  }

  return (
    <section className="space-y-5">
      {!hasSelectedCustomer ? (
        <section className={ui.card}>
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Statement</h1>
            </div>

            <div className={`${ui.filterPanel} grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]`}>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Search customer</label>
                <input
                  className={ui.input}
                  value={query.q}
                  onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                  placeholder="Customer name, email, phone"
                />
              </div>
              <div className="flex items-end">
                <button type="button" className={ui.buttonGhost} onClick={() => loadCustomers({ ...query, q: query.q.trim(), page: 1 })} disabled={loadingCustomers}>
                  {loadingCustomers ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {error ? <p className={ui.error}>{error}</p> : null}

            <div className={ui.tableWrap}>
              <table className={`${ui.table} min-w-[760px]`}>
                <thead>
                  <tr className={ui.tableHeadRow}>
                    <th className={ui.tableHeaderCell}>Customer</th>
                    <th className={ui.tableHeaderCell}>Email</th>
                    <th className={ui.tableHeaderCell}>Phone</th>
                    <th className={ui.tableHeaderCell}>Orders</th>
                    <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((entry) => (
                    <tr key={entry.id} className={ui.tableRow}>
                      <td className={`${ui.tableCell} font-semibold text-slate-900`}>{entry.name || '-'}</td>
                      <td className={ui.tableCell}>{entry.email || '-'}</td>
                      <td className={ui.tableCell}>{entry.phone || '-'}</td>
                      <td className={ui.tableCell}>{entry.totalOrders ?? '-'}</td>
                      <td className={`${ui.tableCell} text-right`}>
                        <button type="button" className={ui.buttonGhost} onClick={() => loadStatement(entry)} disabled={loadingStatement && loadingCustomerId === entry.id}>
                          {loadingStatement && loadingCustomerId === entry.id ? 'Opening...' : 'View statement'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loadingCustomers && customers.length === 0 ? <AdminTableEmpty message="No customers found." /> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className={ui.card} ref={statementSectionRef}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-emerald-950">{customer?.name || 'Select a customer'}</h2>
              <p className="text-sm text-slate-600">{customer?.email || ''}</p>
            </div>
            {customer ? (
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusBadge value={customer.isActive === false ? 'Inactive' : 'Active'} tone={customer.isActive === false ? 'neutral' : 'success'} />
                <button type="button" className={ui.buttonGhost} onClick={handleChangeCustomer}>
                  Change customer
                </button>
              </div>
            ) : null}
          </div>

          {hasSelectedCustomer && error ? <p className={ui.error}>{error}</p> : null}

          {customer ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#767c72]">Total orders</p>
                <p className="text-2xl font-bold text-slate-950">{summary.totalOrders ?? 0}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#767c72]">Paid orders</p>
                <p className="text-2xl font-bold text-slate-950">{summary.paidOrders ?? 0}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#767c72]">Total paid</p>
                <p className="text-2xl font-bold text-slate-950">{formatCurrency(summary.totalPaidAmount || 0)}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#767c72]">Store credit</p>
                <p className="text-2xl font-bold text-slate-950">{formatCurrency(summary.storeCreditBalance || 0)}</p>
              </div>
            </div>
          ) : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[1180px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Date / Time</th>
                  <th className={ui.tableHeaderCell}>Event</th>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Items / Details</th>
                  <th className={ui.tableHeaderCell}>Method</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={ui.tableHeaderCell}>Amount</th>
                  <th className={ui.tableHeaderCell}>By</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className={ui.tableRow}>
                    <td className={ui.tableCell}>{formatDateTime(entry.occurredAt)}</td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={entry.title || formatLabel(entry.type)} tone={getTone(entry.type)} />
                    </td>
                    <td className={`${ui.tableCell} font-semibold text-slate-900`}>{entry.orderReference || '-'}</td>
                    <td className={`${ui.tableCell} max-w-[28rem]`}>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{entry.itemSummary || entry.details || '-'}</p>
                        {entry.details && entry.details !== entry.itemSummary ? <p className="text-xs leading-5 text-slate-500">{entry.details}</p> : null}
                        {entry.quantity !== null && entry.quantity !== undefined ? <p className="text-xs text-slate-500">Qty {entry.quantity}</p> : null}
                      </div>
                    </td>
                    <td className={ui.tableCell}>{formatLabel(entry.method)}</td>
                    <td className={ui.tableCell}>{formatLabel(entry.status)}</td>
                    <td className={`${ui.tableCell} font-semibold text-slate-900`}>
                      {entry.amount !== null && entry.amount !== undefined ? formatCurrency(entry.amount) : '-'}
                    </td>
                    <td className={ui.tableCell}>{entry.actor || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loadingStatement ? <AdminTableEmpty message="Loading statement..." /> : null}
            {!loadingStatement && customer && entries.length === 0 ? <AdminTableEmpty message="No statement entries found." /> : null}
            {!customer ? <AdminTableEmpty message="Select a customer to view their statement." /> : null}
          </div>
        </div>
      </section>
    </section>
  );
}
