import { useEffect, useState } from 'react';
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

const MESSAGE_TYPE_OPTIONS = [
  { value: '', label: 'General note' },
  { value: 'PICKUP_NOTICE', label: 'Pickup notice' },
  { value: 'PICKUP_REMINDER', label: 'Pickup reminder' },
  { value: 'DELIVERY_NOTICE', label: 'Delivery notice' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'FULFILMENT', label: 'Fulfilment' },
  { value: 'CUSTOMER_UPDATE', label: 'Customer information update' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'OTHER', label: 'Other' },
];

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatSource(value) {
  return value === 'CUSTOMER' ? 'Customer' : 'Admin';
}

export default function AdminCustomerNotesPanel({
  onLoadCustomers,
  onLoadCustomerNotes,
  onCreateCustomerNote,
  initialCustomer,
}) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [orderOptions, setOrderOptions] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    note: '',
    orderIds: [],
    messageType: '',
  });

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

  async function loadNotes(customer) {
    if (!customer?.id) {
      setError('Unable to load notes because this customer record is missing an ID.');
      return;
    }

    setSelectedCustomer(customer);
    setLoadingNotes(true);
    setNotes([]);
    setError('');
    setStatus('');
    try {
      const response = await onLoadCustomerNotes(customer.id);
      setSelectedCustomer(response.customer || customer);
      setNotes(response.items || []);
      setOrderOptions(response.orderOptions || []);
    } catch (err) {
      setError(err.message || 'Unable to load customer notes right now.');
    } finally {
      setLoadingNotes(false);
    }
  }

  async function handleSaveNote() {
    if (!selectedCustomer?.id || !form.note.trim()) {
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      const result = await onCreateCustomerNote(selectedCustomer.id, {
        note: form.note.trim(),
        orderIds: form.orderIds,
        messageType: form.messageType.trim() || null,
      });
      setNotes((current) => [result.note, ...current].filter(Boolean));
      setForm({ note: '', orderIds: [], messageType: '' });
      setStatus(result.message || 'Customer note saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save customer note right now.');
    } finally {
      setSaving(false);
    }
  }

  function handleChangeCustomer() {
    setSelectedCustomer(null);
    setNotes([]);
    setOrderOptions([]);
    setForm({ note: '', orderIds: [], messageType: '' });
    setError('');
    setStatus('');
  }

  function toggleOrderSelection(orderId) {
    setForm((current) => {
      const selected = current.orderIds.includes(orderId)
        ? current.orderIds.filter((entry) => entry !== orderId)
        : [...current.orderIds, orderId];

      return { ...current, orderIds: selected };
    });
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
      loadNotes(initialCustomer);
    }
  }, [initialCustomer?.id]);

  const hasSelectedCustomer = Boolean(selectedCustomer?.id);

  return (
    <section className="space-y-5">
      {!hasSelectedCustomer ? (
        <section className={ui.card}>
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Notes</h1>
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
                        <button type="button" className={ui.buttonGhost} onClick={() => loadNotes(entry)} disabled={loadingNotes}>
                          {loadingNotes ? 'Opening...' : 'View notes'}
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

      <section className={ui.card}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-emerald-950">{selectedCustomer?.name || 'Select a customer'}</h2>
              <p className="text-sm text-slate-600">{selectedCustomer?.email || ''}</p>
            </div>
            {selectedCustomer ? (
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusBadge value={selectedCustomer.isActive === false ? 'Inactive' : 'Active'} tone={selectedCustomer.isActive === false ? 'neutral' : 'success'} />
                <button type="button" className={ui.buttonGhost} onClick={handleChangeCustomer}>
                  Change customer
                </button>
              </div>
            ) : null}
          </div>

          {hasSelectedCustomer ? (
            <div className={ui.filterPanel}>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
                <div className={ui.fieldWrap}>
                  <label className={ui.label}>Note</label>
                  <textarea
                    className={ui.textarea}
                    rows={7}
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Write a note for this customer"
                  />
                </div>

                <div className="grid gap-4">
                  <div className={ui.fieldWrap}>
	                    <div className="flex items-center justify-between gap-3">
	                      <label className={ui.label}>Order reference</label>
	                      <div className="flex items-center gap-2">
	                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
	                          {form.orderIds.length ? `${form.orderIds.length} selected` : 'Non order related'}
	                        </span>
	                        {form.orderIds.length ? (
	                          <button
	                            type="button"
	                            className="rounded-full border border-[#deded4] bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
	                            onClick={() => setForm((current) => ({ ...current, orderIds: [] }))}
	                          >
	                            Clear
	                          </button>
	                        ) : null}
	                      </div>
	                    </div>
	                    <div className="max-h-32 overflow-y-auto rounded-2xl border border-[#deded4] bg-white p-1.5 shadow-inner">
	                      <button
	                        type="button"
	                        className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold ${
	                          form.orderIds.length === 0
	                            ? 'bg-emerald-50 text-emerald-900'
	                            : 'text-slate-700 hover:bg-emerald-50'
	                        }`}
	                        onClick={() => setForm((current) => ({ ...current, orderIds: [] }))}
	                      >
	                        Non order related
	                      </button>
	                      {orderOptions.length === 0 ? (
	                        <div className="px-3 py-2 text-sm font-semibold text-slate-500">No customer orders found.</div>
	                      ) : null}
	                      {orderOptions.map((order) => {
	                        const label = [order.label, order.itemName].filter(Boolean).join(' - ');

	                        return (
	                          <label key={order.id} className="flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-emerald-50">
	                            <input
	                              type="checkbox"
	                              checked={form.orderIds.includes(order.id)}
	                              onChange={() => toggleOrderSelection(order.id)}
                              className="mt-1 h-4 w-4 accent-emerald-500"
                            />
                            <span className="leading-5">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Message type</label>
                    <select
                      className={ui.select}
                      value={form.messageType}
                      onChange={(event) => setForm((current) => ({ ...current, messageType: event.target.value }))}
                    >
                      {MESSAGE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value || 'GENERAL'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className={ui.buttonPrimary} onClick={handleSaveNote} disabled={saving || !form.note.trim()}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : null}

          {status ? <p className={ui.success}>{status}</p> : null}
          {hasSelectedCustomer && error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[980px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Date / Time</th>
                  <th className={ui.tableHeaderCell}>Source</th>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Message type</th>
                  <th className={ui.tableHeaderCell}>Note</th>
                  <th className={ui.tableHeaderCell}>By</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className={ui.tableRow}>
                    <td className={ui.tableCell}>{formatDateTime(note.createdAt)}</td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={formatSource(note.source)} tone={note.source === 'CUSTOMER' ? 'warning' : 'neutral'} />
                    </td>
                    <td className={`${ui.tableCell} font-semibold text-slate-900`}>{note.orderReference || '-'}</td>
                    <td className={ui.tableCell}>{note.messageType || '-'}</td>
                    <td className={`${ui.tableCell} max-w-[34rem] whitespace-pre-wrap leading-6`}>{note.note || '-'}</td>
                    <td className={ui.tableCell}>{note.createdBy?.email || note.createdBy?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loadingNotes ? <AdminTableEmpty message="Loading customer notes..." /> : null}
            {!loadingNotes && hasSelectedCustomer && notes.length === 0 ? <AdminTableEmpty message="No notes found for this customer." /> : null}
            {!hasSelectedCustomer ? <AdminTableEmpty message="Select a customer to view notes." /> : null}
          </div>
        </div>
      </section>
    </section>
  );
}
