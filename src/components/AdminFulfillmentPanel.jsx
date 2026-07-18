import { useEffect, useRef, useState } from 'react';
import { ui } from '../ui/classes';
import { formatOrderReferenceDisplay } from '../utils/orderReference';
import {
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
} from './AdminTablePrimitives';
import { exportAdminOrders, fetchAdminCustomers } from '../api/admin';
import { openPdfExport } from '../utils/pdfExport';

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

function DateFilterField({ label, value, onChange, max = TODAY_FILTER }) {
  const inputRef = useRef(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <div className={ui.fieldWrap}>
      <label className={ui.label}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          type="date"
          value={value}
          onChange={onChange}
          max={max}
          tabIndex={-1}
          aria-label={label}
        />
        <button
          type="button"
          className={`${ui.input} flex min-h-[46px] items-center justify-between gap-3 text-left`}
          onClick={openPicker}
        >
          <span className={value ? 'text-emerald-950' : 'text-slate-400'}>{formatDisplayDate(value)}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const TODAY_FILTER = formatDateInputValue(new Date());

const DEFAULT_QUERY = {
  startDate: TODAY_FILTER,
  endDate: TODAY_FILTER,
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

function parseBatchFilters(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function includesInsensitive(value, query) {
  return String(value || '').toLowerCase().includes(String(query || '').toLowerCase());
}

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

function formatLineAmount(item) {
  if (item.isBundleComponent && (item.lineTotal === null || item.lineTotal === undefined)) {
    return `Part of ${formatCurrency(item.totalAmount || 0)}`;
  }
  return formatCurrency(item.lineTotal || 0);
}

function getAmountMetaLabel(item) {
  if (item.isBundleComponent) {
    return 'Bundle';
  }

  return item.quantity > 1 ? `Qty ${item.quantity}` : 'Single item';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function normalizeDisplayName(value) {
  return String(value || '').replace(/\bSheppard Pepper\b/gi, 'Shepherd Pepper');
}

function getActionLabel(item) {
  return item.fulfillmentMethod === 'DELIVERY' ? 'Confirm delivery' : 'Confirm pickup';
}

function getNextStatus(item) {
  return item.fulfillmentMethod === 'DELIVERY' ? 'DELIVERED' : 'PICKED_UP';
}

function canConfirm(item) {
  if (item.fulfillmentMethod === 'DELIVERY') {
    return item.fulfillmentStatus !== 'DELIVERED';
  }
  return item.fulfillmentStatus !== 'PICKED_UP';
}

function getStatusTone(status) {
  if (status === 'PICKED_UP' || status === 'DELIVERED') return 'success';
  return 'warning';
}

function getFulfillmentRowNarration(item, order) {
  const batchNumber = item?.batchNumber || order?.salesItem?.batchNumber || '—';
  const itemName = normalizeDisplayName(item?.name || order?.salesItem?.name || 'Order items');
  const quantity = Number(item?.quantity) || Number(order?.quantity) || 0;
  return `${batchNumber} · ${itemName} x${quantity}`;
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const didInitFiltersRef = useRef(false);

  async function loadFulfillment(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadOrders({
        ...nextQuery,
        startDate: toIsoBoundary(nextQuery.startDate),
        endDate: toIsoBoundary(nextQuery.endDate, true),
      });
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

  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const nextQuery = {
        ...query,
        startDate: query.startDate,
        endDate: query.endDate,
        q: query.q.trim(),
        batchNumber: query.batchNumber.trim(),
        page: 1,
      };
      setQuery((current) => ({ ...current, page: 1 }));
      loadFulfillment(nextQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query.startDate, query.endDate, query.q, query.batchNumber, query.fulfillmentMethod, query.fulfillmentStatus]);

  useEffect(() => {
    const searchTerm = query.q.trim();

    if (searchTerm.length < 2) {
      setSearchSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetchAdminCustomers({
          q: searchTerm,
          page: 1,
          limit: 6,
        });

        if (!active) {
          return;
        }

        setSearchSuggestions(response.items || []);
      } catch {
        if (active) {
          setSearchSuggestions([]);
        }
      } finally {
        if (active) {
          setLoadingSuggestions(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query.q]);

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
    setUpdatingReference(`${order.orderReference}:${order.itemIndex}`);
    setStatus('');
    setError('');
    try {
      const result = await onUpdateFulfillmentStatus(order.orderReference, getNextStatus(order), order.itemIndex);
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
        startDate: toIsoBoundary(query.startDate),
        endDate: toIsoBoundary(query.endDate, true),
        q: query.q.trim(),
        batchNumber: query.batchNumber.trim(),
        paidOnly: 'true',
        fulfillmentMethod: query.fulfillmentMethod || '',
        fulfillmentStatus: query.fulfillmentStatus || '',
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
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

  async function handlePdfExport() {
    setExportingPdf(true);
    setError('');
    try {
      openPdfExport({
        title: 'Fulfilment',
        subtitle: 'Current fulfilment view',
        fileName: 'fulfilment-export',
        columns: [
          { key: 'displayOrderReference', label: 'Order', render: (row) => row.displayOrderReference || formatOrderReferenceDisplay(row.orderReference, row.createdAt, row.user, { batchNumber: row.salesItem?.batchNumber, orderSequence: row.orderSequence }) },
          { key: 'name', label: 'Item', render: (row) => normalizeDisplayName(row.name || row.salesItem?.name || 'Order items') },
          { key: 'date', label: 'Date', render: (row) => formatDate(row.paidAt || row.createdAt) },
          { key: 'buyer', label: 'Buyer', render: (row) => row.user?.name || 'Unknown buyer' },
          { key: 'batch', label: 'Batch', render: (row) => row.batchNumber || row.salesItem?.batchNumber || '—' },
          { key: 'fulfillmentMethod', label: 'Fulfilment', render: (row) => formatLabel(row.fulfillmentMethod) },
          { key: 'fulfillmentStatus', label: 'Status', render: (row) => formatLabel(row.fulfillmentStatus) },
          { key: 'amount', label: 'Amount', render: (row) => formatLineAmount(row) },
        ],
        rows: fulfillmentRows,
      });
    } catch (err) {
      setError(err.message || 'Unable to export fulfilment to PDF right now.');
    } finally {
      setExportingPdf(false);
    }
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);
  const showSuggestions = query.q.trim().length >= 2 && (loadingSuggestions || searchSuggestions.length > 0);
  const activeBatchFilters = parseBatchFilters(query.batchNumber);
  const activeSearchQuery = query.q.trim();
  const fulfillmentRows = orders.flatMap((order) => {
    const items = Array.isArray(order.fulfillmentItems) && order.fulfillmentItems.length
      ? order.fulfillmentItems
      : [
          {
            itemIndex: 0,
            name: order.salesItem?.name || 'Order items',
            quantity: order.quantity,
            lineTotal: order.subtotal || order.totalAmount,
            fulfillmentMethod: order.fulfillmentMethod,
            fulfillmentStatus: order.fulfillmentStatus,
            batchNumber: order.salesItem?.batchNumber || '',
            location: order.salesItem?.pickupInstructions || '',
          },
        ];

    return items
      .filter((item) => {
        const matchesBatch =
          !activeBatchFilters.length
          || activeBatchFilters.some((batch) => includesInsensitive(item.batchNumber, batch));

        const matchesFulfillmentMethod =
          !query.fulfillmentMethod || item.fulfillmentMethod === query.fulfillmentMethod;

        const matchesFulfillmentStatus =
          !query.fulfillmentStatus || item.fulfillmentStatus === query.fulfillmentStatus;

        const matchesSearch =
          !activeSearchQuery
          || [
            order.orderReference,
            order.displayOrderReference,
            order.user?.name,
            order.user?.email,
            order.user?.phone,
            item.batchNumber,
            item.name,
            item.bundleName,
          ].some((value) => includesInsensitive(value, activeSearchQuery));

        return matchesBatch && matchesFulfillmentMethod && matchesFulfillmentStatus && matchesSearch;
      })
      .map((item) => ({
        ...order,
        ...item,
      }));
  });

  return (
    <section className="space-y-5">
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Fulfilment</h1>
            <p className="leading-6 text-slate-600">Confirm pickup or delivery for paid orders and download the current delivery view to Excel.</p>
          </div>

          <div className={`${ui.filterPanel} grid gap-4 md:grid-cols-2 xl:grid-cols-4`}>
            <DateFilterField
              label="Start date"
              value={query.startDate}
              onChange={(event) => setQuery((current) => ({ ...current, startDate: event.target.value }))}
            />
            <DateFilterField
              label="End date"
              value={query.endDate}
              onChange={(event) => setQuery((current) => ({ ...current, endDate: event.target.value }))}
            />
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <div className="relative">
              <input
                className={`${ui.input} focus:placeholder-transparent`}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                placeholder="Name, order number, batch no, email"
              />
                {showSuggestions ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
                    {loadingSuggestions ? (
                      <p className="px-4 py-3 text-sm text-slate-500">Looking up buyers...</p>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto py-1">
                        {searchSuggestions.map((customer) => (
                          <li key={customer.id}>
                            <button
                              type="button"
                              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
                              onClick={() => {
                                setQuery((current) => ({ ...current, q: customer.name || customer.email || '' }));
                                setSearchSuggestions([]);
                              }}
                            >
                              <span className="space-y-1">
                                <span className="block text-sm font-semibold text-slate-900">{customer.name || 'Unnamed buyer'}</span>
                                <span className="block text-xs text-slate-500">{customer.email || customer.phone || 'No contact available'}</span>
                              </span>
                              {customer.phone ? <span className="text-xs text-slate-400">{customer.phone}</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Batch number</label>
              <input
                className={`${ui.input} focus:placeholder-transparent`}
                value={query.batchNumber}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    batchNumber: event.target.value.toUpperCase().replace(/[^A-Z0-9,\s]/g, ''),
                  }))
                }
                placeholder="AZ1, AZ2, AZ3"
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
            <div className="xl:col-span-2 flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonGhost} onClick={handleExportPaidDeliveryOrders} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Download to Excel'}
              </button>
              <button type="button" className={ui.buttonGhost} onClick={handlePdfExport} disabled={exportingPdf}>
                {exportingPdf ? 'Preparing PDF...' : 'Download to PDF'}
              </button>
            </div>
          </div>

          {status ? <p className={ui.success}>{status}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[1120px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Item</th>
                  <th className={ui.tableHeaderCell}>Date</th>
                  <th className={ui.tableHeaderCell}>Buyer</th>
                  <th className={ui.tableHeaderCell}>Batch</th>
                  <th className={ui.tableHeaderCell}>Fulfilment</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={ui.tableHeaderCell}>Amount</th>
                  <th className={`${ui.tableHeaderCell} sticky right-0 z-10 bg-slate-50/95 text-right shadow-[-10px_0_18px_rgba(15,23,42,0.04)]`}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {fulfillmentRows.map((order) => (
                  <tr key={`${order.id}-${order.itemIndex}`} className={ui.tableRow}>
                    <td className={ui.tableCell}>
                      <div className="max-w-[15rem] space-y-0.5">
                        <p className="font-semibold text-slate-900">
                          {order.displayOrderReference || formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user, { batchNumber: order.salesItem?.batchNumber, orderSequence: order.orderSequence })}
                        </p>
                        <p className="truncate text-xs text-slate-500" title={getFulfillmentRowNarration(order, order)}>
                          {getFulfillmentRowNarration(order, order)}
                        </p>
                      </div>
                    </td>
                    <td className={ui.tableCell}>
                      <div className="max-w-[13rem] space-y-0.5">
                        <p className="truncate font-medium text-slate-900" title={normalizeDisplayName(order.name || order.salesItem?.name || 'Order items')}>
                          {normalizeDisplayName(order.name || order.salesItem?.name || 'Order items')}
                        </p>
                        <p
                          className="truncate text-xs text-slate-500"
                          title={`Qty ${order.quantity}${order.isBundleComponent && order.bundleName ? ` · Bundle: ${normalizeDisplayName(order.bundleName)}` : ''}`}
                        >
                          Qty {order.quantity}
                          {order.isBundleComponent && order.bundleName ? ` · Bundle: ${normalizeDisplayName(order.bundleName)}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className={`${ui.tableCell} whitespace-nowrap`}>{formatDate(order.paidAt || order.createdAt)}</td>
                    <td className={ui.tableCell}>
                      <div className="max-w-[12rem] space-y-0.5">
                        <p className="truncate font-medium text-slate-900" title={order.user?.name || 'Unknown buyer'}>{order.user?.name || 'Unknown buyer'}</p>
                        <p className="truncate text-xs text-slate-500" title={order.user?.phone || order.user?.email || '—'}>{order.user?.phone || order.user?.email || '—'}</p>
                      </div>
                    </td>
                    <td className={`${ui.tableCell} font-medium text-slate-900`}>{order.batchNumber || order.salesItem?.batchNumber || '—'}</td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={formatLabel(order.fulfillmentMethod)} tone={order.fulfillmentMethod === 'DELIVERY' ? 'warning' : 'success'} />
                    </td>
                    <td className={ui.tableCell}>
                      <AdminStatusBadge value={formatLabel(order.fulfillmentStatus)} tone={getStatusTone(order.fulfillmentStatus)} />
                    </td>
                    <td className={ui.tableCell}>
                      <div className="min-w-[9.5rem] space-y-0.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">{formatLineAmount(order)}</p>
                        <p className="text-xs text-slate-500">{getAmountMetaLabel(order)}</p>
                      </div>
                    </td>
                    <td className={`${ui.tableCell} sticky right-0 z-10 whitespace-nowrap bg-white text-right shadow-[-10px_0_18px_rgba(15,23,42,0.04)]`}>
                      {canConfirm(order) ? (
                        <button
                          type="button"
                          className={ui.buttonGhost}
                          onClick={() => handleConfirm(order)}
                          disabled={updatingReference === `${order.orderReference}:${order.itemIndex}`}
                        >
                          {updatingReference === `${order.orderReference}:${order.itemIndex}` ? 'Saving...' : getActionLabel(order)}
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-slate-500">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && fulfillmentRows.length === 0 ? <AdminTableEmpty message="No paid pickup or delivery items match the current view." /> : null}
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
