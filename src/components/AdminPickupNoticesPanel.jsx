import { useEffect, useMemo, useRef, useState } from 'react';
import { ui } from '../ui/classes';
import {
  AdminIconButton,
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
  CloseIcon,
  MailIcon,
} from './AdminTablePrimitives';

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY_FILTER = formatDateInputValue(new Date());

function toIsoBoundary(value, endOfDay = false) {
  if (!value) return '';
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).toISOString();
}

function formatDisplayDate(value) {
  if (!value) {
    return 'Select date';
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DateFilterField({ label, value, onChange }) {
  return (
    <div className={ui.fieldWrap}>
      <label className={ui.label}>{label}</label>
      <div className="relative">
        <input
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          type="date"
          value={value}
          onChange={onChange}
          aria-label={label}
        />
        <div className={`${ui.input} pointer-events-none flex min-h-[46px] items-center justify-between gap-3`}>
          <span className={value ? 'text-emerald-950' : 'text-slate-400'}>{formatDisplayDate(value)}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_QUERY = {
  startDate: '',
  endDate: '',
  q: '',
  batchNumber: '',
  location: '',
  fulfillmentMethod: 'PICKUP',
  noticeStatus: '',
  sortBy: 'paidAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatLabel(value) {
  if (!value) return 'Unknown';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getNoticeTone(status) {
  return status === 'SENT' ? 'success' : 'warning';
}

function formatChannelSummary(lastResults = {}) {
  const parts = [];
  if (lastResults.email) {
    parts.push(`Email: ${formatLabel(lastResults.email.status)}`);
  }
  if (lastResults.whatsapp) {
    parts.push(`WhatsApp: ${formatLabel(lastResults.whatsapp.status)}`);
  }
  return parts.join(' · ') || 'No notice sent yet';
}

function NoticeModal({ rows, onClose, onSubmit, submitting }) {
  const [channels, setChannels] = useState({ EMAIL: true, WHATSAPP: true });
  const [address, setAddress] = useState(rows[0]?.location || 'Winnipeg Manitoba');
  const [readyDate, setReadyDate] = useState(TODAY_FILTER);
  const [timeWindow, setTimeWindow] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!rows.length) {
    return null;
  }

  const selectedCount = rows.length;
  const selectedOrders = [...new Set(rows.map((row) => row.displayOrderReference))];
  const channelValues = Object.entries(channels).filter(([, enabled]) => enabled).map(([key]) => key);

  async function handleSubmit() {
    if (!channelValues.length) {
      setError('Select at least one delivery channel.');
      return;
    }

    if (address.trim().length < 3) {
      setError('Enter the pickup address or location.');
      return;
    }

    if (!readyDate) {
      setError('Select the ready date.');
      return;
    }

    if (timeWindow.trim().length < 3) {
      setError('Enter the pickup time window.');
      return;
    }

    setError('');
    await onSubmit({
      items: rows.map((row) => ({
        orderReference: row.orderReference,
        itemIndex: row.itemIndex,
      })),
      channels: channelValues,
      address: address.trim(),
      readyDate,
      timeWindow: timeWindow.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      note: note.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Send pickup notice</h2>
            <p className="text-sm text-slate-600">
              {selectedCount} item{selectedCount === 1 ? '' : 's'} across {selectedOrders.length} order{selectedOrders.length === 1 ? '' : 's'} selected
            </p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close pickup notice">
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-5">
          <div className={`${ui.section} space-y-4`}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={`${ui.section} flex items-center gap-3 px-4 py-3 text-sm text-slate-700`}>
                <input
                  type="checkbox"
                  checked={channels.EMAIL}
                  onChange={(event) => setChannels((current) => ({ ...current, EMAIL: event.target.checked }))}
                />
                <span>Email</span>
              </label>
              <label className={`${ui.section} flex items-center gap-3 px-4 py-3 text-sm text-slate-700`}>
                <input
                  type="checkbox"
                  checked={channels.WHATSAPP}
                  onChange={(event) => setChannels((current) => ({ ...current, WHATSAPP: event.target.checked }))}
                />
                <span>WhatsApp</span>
              </label>
            </div>
            <p className="text-xs text-slate-500">WhatsApp will begin sending live once Meta Business credentials are configured.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Pickup address / location</label>
              <input className={ui.input} value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <DateFilterField label="Ready date" value={readyDate} onChange={(event) => setReadyDate(event.target.value)} />
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Time window</label>
              <input className={ui.input} value={timeWindow} onChange={(event) => setTimeWindow(event.target.value)} placeholder="2:00 PM - 5:00 PM" />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Contact name</label>
              <input className={ui.input} value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Pickup contact" />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Contact phone</label>
              <input className={ui.input} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="4315571137" />
            </div>
          </div>

          <div className={ui.fieldWrap}>
            <label className={ui.label}>Instructions</label>
            <textarea className={ui.textarea} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Share any pickup instructions for buyers" />
          </div>

          <div className={`${ui.section} space-y-3`}>
            <p className="text-sm font-semibold text-slate-900">Selected items</p>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={`${row.orderReference}:${row.itemIndex}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e7e8df] bg-white px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900">{row.displayOrderReference}</span>
                  <span className="text-slate-600">{row.name} x{row.quantity}</span>
                  <span className="text-slate-500">{row.user?.name || 'Unknown buyer'}</span>
                </div>
              ))}
            </div>
          </div>

          {error ? <p className={ui.error}>{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" className={ui.buttonPrimary} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send notice'}
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

export default function AdminPickupNoticesPanel({ onLoadPickupNotices, onSendPickupNotices }) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [filterOptions, setFilterOptions] = useState({ locations: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [modalRows, setModalRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const didInitFiltersRef = useRef(false);

  async function loadNotices(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadPickupNotices({
        ...nextQuery,
        startDate: toIsoBoundary(nextQuery.startDate),
        endDate: toIsoBoundary(nextQuery.endDate, true),
      });
      setRows(response.items || []);
      setFilterOptions(response.filterOptions || { locations: [] });
      setMeta({
        page: response.page || nextQuery.page,
        limit: response.limit || nextQuery.limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
      setSelectedKeys([]);
    } catch (err) {
      setError(err.message || 'Unable to load pickup notices right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotices(DEFAULT_QUERY);
  }, []);

  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const nextQuery = {
        ...query,
        q: query.q.trim(),
        batchNumber: query.batchNumber.trim(),
        page: 1,
      };
      setQuery((current) => ({ ...current, page: 1 }));
      loadNotices(nextQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query.startDate, query.endDate, query.q, query.batchNumber, query.location, query.fulfillmentMethod, query.noticeStatus]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.includes(`${row.orderReference}:${row.itemIndex}`)),
    [rows, selectedKeys],
  );

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedKeys.includes(`${row.orderReference}:${row.itemIndex}`));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedKeys([]);
      return;
    }

    setSelectedKeys(rows.map((row) => `${row.orderReference}:${row.itemIndex}`));
  }

  function toggleRow(row) {
    const key = `${row.orderReference}:${row.itemIndex}`;
    setSelectedKeys((current) => (current.includes(key) ? current.filter((value) => value !== key) : [...current, key]));
  }

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadNotices(nextQuery);
  }

  async function handleSend(payload) {
    setSubmitting(true);
    setError('');
    setStatus('');
    try {
      const result = await onSendPickupNotices(payload);
      setStatus(result.message || 'Pickup notices sent successfully.');
      setModalRows([]);
      await loadNotices(query);
    } catch (err) {
      setError(err.message || 'Unable to send pickup notices right now.');
    } finally {
      setSubmitting(false);
    }
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Pickup Notices</h1>
            <p className="leading-6 text-slate-600">Select paid items that are ready, then notify buyers by email and WhatsApp with the pickup or delivery details.</p>
          </div>

          <div className={`${ui.filterPanel} grid gap-4 md:grid-cols-2 xl:grid-cols-4`}>
            <DateFilterField label="Start date" value={query.startDate} onChange={(event) => setQuery((current) => ({ ...current, startDate: event.target.value }))} />
            <DateFilterField label="End date" value={query.endDate} onChange={(event) => setQuery((current) => ({ ...current, endDate: event.target.value }))} />
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input
                className={`${ui.input} focus:placeholder-transparent`}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                placeholder="Name, order number, email"
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Batch number</label>
              <input
                className={`${ui.input} focus:placeholder-transparent`}
                value={query.batchNumber}
                onChange={(event) => setQuery((current) => ({ ...current, batchNumber: event.target.value.toUpperCase().replace(/[^A-Z0-9,\s]/g, '') }))}
                placeholder="AZ1, AZ2, AZ3"
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Pickup location</label>
              <select className={ui.select} value={query.location} onChange={(event) => setQuery((current) => ({ ...current, location: event.target.value }))}>
                <option value="">All locations</option>
                {filterOptions.locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
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
              <label className={ui.label}>Notice status</label>
              <select className={ui.select} value={query.noticeStatus} onChange={(event) => setQuery((current) => ({ ...current, noticeStatus: event.target.value }))}>
                <option value="">All statuses</option>
                <option value="NOT_SENT">Not sent</option>
                <option value="SENT">Sent</option>
              </select>
            </div>
            <div className="xl:col-span-1 flex items-end">
              <button
                type="button"
                className={ui.buttonPrimary}
                onClick={() => setModalRows(selectedRows)}
                disabled={!selectedRows.length}
              >
                {selectedRows.length ? `Notify selected (${selectedRows.length})` : 'Select items to notify'}
              </button>
            </div>
          </div>

          {status ? <p className={ui.success}>{status}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[1180px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all visible items" />
                  </th>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Item</th>
                  <th className={ui.tableHeaderCell}>Buyer</th>
                  <th className={ui.tableHeaderCell}>Batch</th>
                  <th className={ui.tableHeaderCell}>Method</th>
                  <th className={ui.tableHeaderCell}>Location</th>
                  <th className={ui.tableHeaderCell}>Notice</th>
                  <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowKey = `${row.orderReference}:${row.itemIndex}`;
                  return (
                    <tr key={rowKey} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <input type="checkbox" checked={selectedKeys.includes(rowKey)} onChange={() => toggleRow(row)} aria-label={`Select ${row.displayOrderReference}`} />
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[12rem] space-y-0.5">
                          <p className="font-semibold text-slate-900">{row.displayOrderReference}</p>
                          <p className="text-xs text-slate-500">{formatDate(row.paidAt || row.createdAt)}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[14rem] space-y-0.5">
                          <p className="truncate font-medium text-slate-900" title={row.name}>{row.name}</p>
                          <p className="text-xs text-slate-500">Qty {row.quantity}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[13rem] space-y-0.5">
                          <p className="truncate font-medium text-slate-900">{row.user?.name || 'Unknown buyer'}</p>
                          <p className="truncate text-xs text-slate-500">{row.user?.email || row.user?.phone || '—'}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>{row.batchNumber || '—'}</td>
                      <td className={ui.tableCell}>
                        <AdminStatusBadge value={formatLabel(row.fulfillmentMethod)} tone={row.fulfillmentMethod === 'DELIVERY' ? 'warning' : 'success'} />
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[13rem] space-y-0.5">
                          <p className="truncate text-slate-900">{row.location || '—'}</p>
                          <p className="text-xs text-slate-500">{row.noticeSentAt ? `Last sent ${formatDateTime(row.noticeSentAt)}` : 'Not sent yet'}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[14rem] space-y-1">
                          <AdminStatusBadge value={formatLabel(row.noticeStatus)} tone={getNoticeTone(row.noticeStatus)} />
                          <p className="text-xs text-slate-500">{formatChannelSummary(row.noticeChannels)}</p>
                        </div>
                      </td>
                      <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                        <div className="flex justify-end gap-2">
                          <AdminIconButton label={row.noticeStatus === 'SENT' ? 'Resend notice' : 'Send notice'} onClick={() => setModalRows([row])}>
                            <MailIcon />
                          </AdminIconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && rows.length === 0 ? <AdminTableEmpty message="No paid items are waiting for pickup notice in the current view." /> : null}
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

      {modalRows.length ? (
        <NoticeModal rows={modalRows} onClose={() => setModalRows([])} onSubmit={handleSend} submitting={submitting} />
      ) : null}
    </section>
  );
}
