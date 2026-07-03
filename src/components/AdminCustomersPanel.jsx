import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import {
  AdminIconButton,
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
  CloseIcon,
  PencilIcon,
} from './AdminTablePrimitives';

const DEFAULT_QUERY = {
  q: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 15,
};

function CustomerEditModal({ customer, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });

  useEffect(() => {
    if (!customer) {
      return;
    }

    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      isActive: Boolean(customer.isActive),
    });
  }, [customer]);

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Edit customer</h2>
            <p className="text-sm text-slate-600">Update the saved customer details and status.</p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close customer edit">
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Name</label>
              <input className={ui.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Email</label>
              <input className={ui.input} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Phone</label>
              <input className={ui.input} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Status</label>
              <select className={ui.select} value={form.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'ACTIVE' }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className={ui.fieldWrap}>
            <label className={ui.label}>Address</label>
            <textarea className={ui.textarea} rows={3} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={ui.buttonPrimary}
              onClick={() => onSave(customer.id, form)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save customer'}
            </button>
            <button type="button" className={ui.buttonGhost} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomersPanel({ onLoadCustomers, onUpdateCustomer, onExportCustomers }) {
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
  const [status, setStatus] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      setError(err.message || 'Unable to load customers right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers(DEFAULT_QUERY);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = {
        ...query,
        q: query.q.trim(),
        page: 1,
      };

      setQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
      loadCustomers(nextQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query.q]);

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadCustomers(nextQuery);
  }

  async function handleSave(customerId, payload) {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const result = await onUpdateCustomer(customerId, payload);
      setStatus(result.message || 'Customer updated successfully.');
      setSelectedCustomer(null);
      await loadCustomers(query);
    } catch (err) {
      setError(err.message || 'Unable to update customer right now.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const { blob, fileName } = await onExportCustomers({
        q: query.q.trim(),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Unable to export customers right now.');
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
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Customer</h1>
            <p className="leading-6 text-slate-600">Review and maintain the core customer details in one simple table.</p>
          </div>

          <div className={`${ui.filterPanel} grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]`}>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input
                className={ui.input}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                placeholder="Customer name, email, phone, address"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonGhost} onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Download to Excel'}
              </button>
              <p className="text-sm text-slate-500">Filters update automatically as you type.</p>
            </div>
          </div>

          {status ? <p className={ui.success}>{status}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[900px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Name</th>
                  <th className={ui.tableHeaderCell}>Email</th>
                  <th className={ui.tableHeaderCell}>Phone</th>
                  <th className={ui.tableHeaderCell}>Address</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={ui.tableRow}>
                    <td className={`${ui.tableCell} max-w-[12rem] truncate font-semibold text-slate-900`} title={customer.name || '—'}>{customer.name || '—'}</td>
                    <td className={`${ui.tableCell} max-w-[13rem] truncate`} title={customer.email || '—'}>{customer.email || '—'}</td>
                    <td className={ui.tableCell}>{customer.phone || '—'}</td>
                    <td className={`${ui.tableCell} max-w-[16rem] truncate`} title={customer.address || '—'}>{customer.address || '—'}</td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={customer.isActive ? 'Active' : 'Inactive'} tone={customer.isActive ? 'success' : 'neutral'} />
                    </td>
                    <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                      <AdminIconButton label="Edit customer" onClick={() => setSelectedCustomer(customer)}>
                        <PencilIcon />
                      </AdminIconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && customers.length === 0 ? <AdminTableEmpty message="No customers found for the current view." /> : null}
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

      <CustomerEditModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onSave={handleSave} saving={saving} />
    </section>
  );
}
