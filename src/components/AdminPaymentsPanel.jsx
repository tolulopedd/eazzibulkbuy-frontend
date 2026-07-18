import { useEffect, useRef, useState } from 'react';
import { ui } from '../ui/classes';
import { formatOrderReferenceDisplay } from '../utils/orderReference';
import {
  AdminIconButton,
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  MailIcon,
} from './AdminTablePrimitives';
import { exportAdminOrders } from '../api/admin';
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
  paidOnly: '',
  status: '',
  paymentStatus: '',
  paymentMethod: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

function formatCurrency(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

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

function isPaidLike(order) {
  return (
    order?.paymentStatus === 'PAID' ||
    order?.paymentStatus === 'SUCCEEDED' ||
    order?.status === 'CONFIRMED' ||
    Boolean(order?.paidAt)
  );
}

function getDisplayPaymentStatus(order) {
  if (order?.paymentMethod === 'STRIPE_CARD') {
    return isPaidLike(order) ? 'PAID' : 'PENDING_PAYMENT';
  }

  if (order?.paymentMethod === 'INTERAC_E_TRANSFER') {
    if (isPaidLike(order)) return 'PAID';
    if (order?.paymentStatus === 'PENDING_REVIEW') return 'PENDING_REVIEW';
    return 'PENDING_PAYMENT';
  }

  return order?.paymentStatus || 'UNKNOWN';
}

function getStatusTone(status) {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING_REVIEW') return 'warning';
  if (status === 'PENDING_PAYMENT') return 'info';
  return 'neutral';
}

function getOrderFulfillmentItems(order) {
  return Array.isArray(order?.fulfillmentItems) && order.fulfillmentItems.length
    ? order.fulfillmentItems
    : [
        {
          name: order?.salesItem?.name || 'Order items',
          quantity: order?.quantity || 0,
          batchNumber: order?.salesItem?.batchNumber || '',
        },
      ];
}

function getOrderBatchSummary(order) {
  const batches = [...new Set(getOrderFulfillmentItems(order).map((item) => item.batchNumber).filter(Boolean))];
  return batches.length ? batches.join(', ') : '—';
}

function getOrderItemSummary(order) {
  const groupedItems = new Map();

  getOrderFulfillmentItems(order).forEach((item) => {
    const name = item?.name || 'Order items';
    const quantity = Number(item?.quantity) || 0;
    groupedItems.set(name, (groupedItems.get(name) || 0) + quantity);
  });

  return [...groupedItems.entries()]
    .map(([name, quantity]) => `${name} x${quantity}`)
    .join(' + ');
}

function PaymentDetailsModal({
  order,
  proofViewUrl,
  loadingProofReference,
  onClose,
  onConfirm,
  onResend,
  confirmingReference,
  resendingReference,
}) {
  if (!order) {
    return null;
  }

  const transferProof = order.payment?.providerPayloadJson?.transferProof;
  const isInterac = order.paymentMethod === 'INTERAC_E_TRANSFER';
  const canConfirmInterac = isInterac && order.paymentStatus === 'PENDING_REVIEW';
  const canResendConfirmation = order.paymentStatus === 'PAID' || order.status === 'CONFIRMED';
  const transferProofImageSrc = proofViewUrl || transferProof?.screenshotDataUrl || '';
  const batchSummary = getOrderBatchSummary(order);
  const itemSummary = getOrderItemSummary(order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-5xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Payment details</h2>
            <p className="text-sm text-slate-600">
              {order.displayOrderReference || formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user, { batchNumber: order.salesItem?.batchNumber, orderSequence: order.orderSequence })} · {order.user?.name || 'Unknown buyer'}
            </p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close payment details">
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Buyer</p>
                <p className="text-sm font-semibold text-slate-900">{order.user?.name || 'Unknown buyer'}</p>
                <p className="text-sm text-slate-600">{order.user?.email || '—'}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                <p className="text-sm text-slate-600">{itemSummary}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Batch</p>
                <p className="text-base font-semibold text-slate-900">{batchSummary}</p>
                <p className="text-sm text-slate-600">{order.salesItem?.pickupInstructions || 'Location not set'}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                <div className="pt-1">
                  <AdminStatusBadge value={formatLabel(getDisplayPaymentStatus(order))} tone={getStatusTone(getDisplayPaymentStatus(order))} />
                </div>
                <p className="pt-1 text-sm text-slate-600">{formatLabel(order.paymentMethod)}</p>
              </div>
            </div>

            <div className={`${ui.section} space-y-2`}>
              <p className="text-sm leading-6 text-slate-700">Submitted: <span className="font-semibold text-slate-900">{formatDateTime(order.createdAt)}</span></p>
              <p className="text-sm leading-6 text-slate-700">Paid at: <span className="font-semibold text-slate-900">{formatDateTime(order.paidAt)}</span></p>
              <p className="text-sm leading-6 text-slate-700">Quantity: <span className="font-semibold text-slate-900">{order.quantity}</span></p>
              <p className="text-sm leading-6 text-slate-700">Order status: <span className="font-semibold text-slate-900">{formatLabel(order.status)}</span></p>
              {isInterac ? (
                <>
                  <p className="text-sm leading-6 text-slate-700">Receipt file: <span className="font-semibold text-slate-900">{transferProof?.fileName || 'No receipt uploaded'}</span></p>
                  <p className="text-sm leading-6 text-slate-700">Receipt time: <span className="font-semibold text-slate-900">{formatDateTime(transferProof?.uploadedAt)}</span></p>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              {canConfirmInterac ? (
                <button
                  type="button"
                  className={ui.buttonPrimary}
                  onClick={() => onConfirm(order.orderReference)}
                  disabled={confirmingReference === order.orderReference}
                >
                  {confirmingReference === order.orderReference ? 'Confirming payment...' : 'Confirm Interac payment'}
                </button>
              ) : null}
              <button
                type="button"
                className={ui.buttonGhost}
                onClick={() => onResend(order.orderReference)}
                disabled={resendingReference === order.orderReference || !canResendConfirmation}
                title={canResendConfirmation ? 'Resend confirmation email' : 'Available once payment status is paid.'}
              >
                {resendingReference === order.orderReference ? 'Resending confirmation...' : 'Resend confirmation'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Payment proof</h3>
              {isInterac && proofViewUrl ? (
                <a href={proofViewUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-700 underline underline-offset-2">
                  Open full receipt
                </a>
              ) : null}
            </div>
            {isInterac && loadingProofReference === order.orderReference && !transferProofImageSrc ? (
              <p className={ui.note}>Loading private receipt preview...</p>
            ) : isInterac && transferProofImageSrc ? (
              <img src={transferProofImageSrc} alt={`Transfer proof for ${order.orderReference}`} className="max-h-[420px] w-full rounded-xl object-contain" />
            ) : (
              <p className={ui.note}>
                {order.paymentMethod === 'STRIPE_CARD'
                  ? `${formatLabel(order.paymentMethod)} payments do not require a screenshot receipt.`
                  : 'No payment screenshot is available for this transfer.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPanel({
  onLoadOrders,
  onConfirmInteracPayment,
  onResendPaymentConfirmation,
  onLoadPaymentProofViewUrl,
  onRefreshReports,
}) {
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [meta, setMeta] = useState({
    page: 1,
    limit: DEFAULT_QUERY.limit,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [confirmingReference, setConfirmingReference] = useState('');
  const [resendingReference, setResendingReference] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [proofViewUrls, setProofViewUrls] = useState({});
  const [loadingProofReference, setLoadingProofReference] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const didInitFiltersRef = useRef(false);

  async function loadPayments(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadOrders({
        ...nextQuery,
        startDate: toIsoBoundary(nextQuery.startDate),
        endDate: toIsoBoundary(nextQuery.endDate, true),
      });
      setPayments(response.items || []);
      setMeta({
        page: response.page || nextQuery.page,
        limit: response.limit || nextQuery.limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Unable to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments(DEFAULT_QUERY);
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
      loadPayments(nextQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query.startDate, query.endDate, query.q, query.batchNumber, query.paidOnly, query.status, query.paymentStatus, query.paymentMethod]);

  async function applySearch() {
    const nextQuery = {
      ...query,
      q: query.q.trim(),
      page: 1,
    };
    setQuery(nextQuery);
    await loadPayments(nextQuery);
  }

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadPayments(nextQuery);
  }

  async function handleConfirm(orderReference) {
    setConfirmingReference(orderReference);
    setActionStatus('');
    setError('');
    try {
      const result = await onConfirmInteracPayment(orderReference);
      setActionStatus(result.message || 'Payment confirmed successfully.');
      await loadPayments(query);
      if (selectedOrder?.orderReference === orderReference) {
        setSelectedOrder((current) => current ? { ...current, paymentStatus: 'PAID', status: 'CONFIRMED', paidAt: new Date().toISOString() } : current);
      }
      if (onRefreshReports) {
        await onRefreshReports();
      }
    } catch (err) {
      setError(err.message || 'Unable to confirm this transfer.');
    } finally {
      setConfirmingReference('');
    }
  }

  async function handleResend(orderReference) {
    setResendingReference(orderReference);
    setActionStatus('');
    setError('');
    try {
      const result = await onResendPaymentConfirmation(orderReference);
      setActionStatus(result.message || 'Payment confirmation email sent successfully.');
    } catch (err) {
      setError(err.message || 'Unable to resend payment confirmation.');
    } finally {
      setResendingReference('');
    }
  }

  async function handleView(order) {
    setSelectedOrder(order);
    if (order.paymentMethod !== 'INTERAC_E_TRANSFER') {
      return;
    }

    const transferProof = order.payment?.providerPayloadJson?.transferProof;
    if (!transferProof?.objectKey || proofViewUrls[order.orderReference]) {
      return;
    }

    try {
      setLoadingProofReference(order.orderReference);
      const outcome = await onLoadPaymentProofViewUrl(order.orderReference);
      setProofViewUrls((current) => ({
        ...current,
        [order.orderReference]: outcome.viewUrl,
      }));
    } catch (err) {
      setError(err.message || 'Unable to load the private receipt preview.');
    } finally {
      setLoadingProofReference('');
    }
  }

  async function handleExportPayments() {
    setExporting(true);
    setError('');
    try {
      const { blob, fileName } = await exportAdminOrders({
        startDate: toIsoBoundary(query.startDate),
        endDate: toIsoBoundary(query.endDate, true),
        q: query.q.trim(),
        batchNumber: query.batchNumber.trim(),
        paidOnly: query.paidOnly,
        status: query.status,
        paymentStatus: query.paymentStatus,
        paymentMethod: query.paymentMethod,
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
      setError(err.message || 'Unable to export payments right now.');
    } finally {
      setExporting(false);
    }
  }

  async function handlePdfExport() {
    setExportingPdf(true);
    setError('');
    try {
      openPdfExport({
        title: 'Payments',
        subtitle: 'Current payment view',
        fileName: 'payments-export',
        columns: [
          { key: 'displayOrderReference', label: 'Order', render: (row) => row.displayOrderReference || formatOrderReferenceDisplay(row.orderReference, row.createdAt, row.user, { batchNumber: row.salesItem?.batchNumber, orderSequence: row.orderSequence }) },
          { key: 'createdAt', label: 'Date', render: (row) => formatDate(row.createdAt) },
          { key: 'buyer', label: 'Buyer', render: (row) => row.user?.name || 'Unknown buyer' },
          { key: 'batch', label: 'Batch', render: (row) => getOrderBatchSummary(row) },
          { key: 'paymentMethod', label: 'Method', render: (row) => formatLabel(row.paymentMethod) },
          { key: 'totalAmount', label: 'Amount', render: (row) => formatCurrency(row.totalAmount) },
          { key: 'status', label: 'Status', render: (row) => formatLabel(getDisplayPaymentStatus(row)) },
        ],
        rows: payments,
      });
    } catch (err) {
      setError(err.message || 'Unable to export payments to PDF right now.');
    } finally {
      setExportingPdf(false);
    }
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <section className="space-y-5">
      <section className={ui.card}>
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Payments</h1>
              <p className="leading-6 text-slate-600">Review Interac and Stripe payments, view receipt proof where needed, and take action from one table.</p>
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
              <input
                className={`${ui.input} focus:placeholder-transparent`}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                placeholder="Order number, buyer, email"
              />
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
              <label className={ui.label}>Payment method</label>
              <select
                className={ui.select}
                value={query.paymentMethod}
                onChange={(event) => setQuery((current) => ({ ...current, paymentMethod: event.target.value }))}
              >
                <option value="">All methods</option>
                <option value="INTERAC_E_TRANSFER">Interac e-Transfer</option>
                <option value="STRIPE_CARD">Stripe card</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Payment status</label>
              <select
                className={ui.select}
                value={query.paymentStatus}
                onChange={(event) => setQuery((current) => ({ ...current, paymentStatus: event.target.value }))}
              >
                <option value="">All statuses</option>
                <option value="PENDING_PAYMENT">Pending payment</option>
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div className="xl:col-span-2 flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonGhost} onClick={handleExportPayments} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Download to Excel'}
              </button>
              <button type="button" className={ui.buttonGhost} onClick={handlePdfExport} disabled={exportingPdf}>
                {exportingPdf ? 'Preparing PDF...' : 'Download to PDF'}
              </button>
            </div>
          </div>

          {actionStatus ? <p className={ui.success}>{actionStatus}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[980px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Order</th>
                  <th className={ui.tableHeaderCell}>Date</th>
                  <th className={ui.tableHeaderCell}>Buyer</th>
                  <th className={ui.tableHeaderCell}>Batch</th>
                  <th className={ui.tableHeaderCell}>Method</th>
                  <th className={ui.tableHeaderCell}>Amount</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                  <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((order) => {
                  const displayPaymentStatus = getDisplayPaymentStatus(order);
                  const canConfirmInterac = order.paymentMethod === 'INTERAC_E_TRANSFER' && order.paymentStatus === 'PENDING_REVIEW';
                  const canResendConfirmation = order.paymentStatus === 'PAID' || order.status === 'CONFIRMED';
                  const batchSummary = getOrderBatchSummary(order);
                  const itemSummary = getOrderItemSummary(order);

                  return (
                    <tr key={order.id} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <div className="max-w-[15rem] space-y-0.5">
                          <p className="font-semibold text-slate-900">
                            {order.displayOrderReference || formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user, { batchNumber: order.salesItem?.batchNumber, orderSequence: order.orderSequence })}
                          </p>
                          <p className="truncate text-xs text-slate-500" title={itemSummary}>{itemSummary}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>{formatDate(order.createdAt)}</td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[13rem] space-y-0.5">
                          <p className="truncate font-medium text-slate-900" title={order.user?.name || 'Unknown buyer'}>{order.user?.name || 'Unknown buyer'}</p>
                          <p className="truncate text-xs text-slate-500" title={order.user?.email || '—'}>{order.user?.email || '—'}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[9rem] space-y-0.5">
                          <p className="truncate font-medium text-slate-900" title={batchSummary}>{batchSummary}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>{formatLabel(order.paymentMethod)}</td>
                      <td className={`${ui.tableCell} font-semibold text-slate-900`}>{formatCurrency(order.totalAmount)}</td>
                      <td className={ui.tableCell}>
                        <AdminStatusBadge value={formatLabel(displayPaymentStatus)} tone={getStatusTone(displayPaymentStatus)} />
                      </td>
                      <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                        <div className="flex justify-end gap-2">
                          <AdminIconButton label="View payment" onClick={() => handleView(order)}>
                            <EyeIcon />
                          </AdminIconButton>
                          {canConfirmInterac ? (
                            <AdminIconButton
                              label="Confirm Interac payment"
                              onClick={() => handleConfirm(order.orderReference)}
                              disabled={confirmingReference === order.orderReference}
                            >
                              <CheckIcon />
                            </AdminIconButton>
                          ) : null}
                          <AdminIconButton
                            label="Resend confirmation"
                            onClick={() => handleResend(order.orderReference)}
                            disabled={resendingReference === order.orderReference || !canResendConfirmation}
                          >
                            <MailIcon />
                          </AdminIconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && payments.length === 0 ? <AdminTableEmpty message="No payments found for the current filters." /> : null}
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

      <PaymentDetailsModal
        order={selectedOrder}
        proofViewUrl={selectedOrder ? proofViewUrls[selectedOrder.orderReference] : ''}
        loadingProofReference={loadingProofReference}
        onClose={() => setSelectedOrder(null)}
        onConfirm={handleConfirm}
        onResend={handleResend}
        confirmingReference={confirmingReference}
        resendingReference={resendingReference}
      />
    </section>
  );
}
