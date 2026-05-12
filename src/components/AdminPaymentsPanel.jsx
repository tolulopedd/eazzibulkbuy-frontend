import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import { formatOrderReferenceDisplay } from '../utils/orderReference';

const DEFAULT_QUERY = {
  q: '',
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

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function formatStatusLabel(value) {
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
    return isPaidLike(order) ? 'PAID' : 'PENDING_PAYMENT';
  }

  return order?.paymentStatus || 'UNKNOWN';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [confirmingReference, setConfirmingReference] = useState('');
  const [resendingReference, setResendingReference] = useState('');
  const [expandedReference, setExpandedReference] = useState('');
  const [proofViewUrls, setProofViewUrls] = useState({});
  const [loadingProofReference, setLoadingProofReference] = useState('');

  async function loadPayments(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadOrders(nextQuery);
      setPayments(response.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments(DEFAULT_QUERY);
  }, []);

  async function applySearch() {
    const nextQuery = {
      ...query,
      q: query.q.trim(),
      page: 1,
    };
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

  async function handleToggleDetails(order) {
    const isClosing = expandedReference === order.orderReference;
    setExpandedReference(isClosing ? '' : order.orderReference);
    if (isClosing || order.paymentMethod !== 'INTERAC_E_TRANSFER') {
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

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Payments</h1>
          <p className="leading-6 text-slate-600">Review Interac and Stripe payments, confirm Interac transfers, and resend payment confirmations.</p>
        </div>

        <div className={`${ui.section} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
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
                    applySearch();
                  }
                }}
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
            <div className="flex items-end gap-3">
              <button type="button" className={ui.buttonGhost} onClick={applySearch} disabled={loading}>
                {loading ? 'Loading payments...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {actionStatus ? <p className={ui.note}>{actionStatus}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {payments.map((order, index) => {
            const transferProof = order.payment?.providerPayloadJson?.transferProof;
            const transferProofImageSrc = proofViewUrls[order.orderReference] || transferProof?.screenshotDataUrl || '';
            const isExpanded = expandedReference === order.orderReference;
            const canConfirmInterac = order.paymentMethod === 'INTERAC_E_TRANSFER' && order.paymentStatus === 'PENDING_REVIEW';
            const canResendConfirmation = order.paymentStatus === 'PAID' || order.status === 'CONFIRMED';
            const displayPaymentStatus = getDisplayPaymentStatus(order);
            return (
              <article key={order.id} className={`space-y-2.5 px-4 py-3 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
                <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-base font-semibold text-slate-900">
                      {formatOrderReferenceDisplay(order.orderReference, order.createdAt, order.user)}
                    </p>
                    <p className="text-sm text-slate-600">{order.user?.name || 'Unknown buyer'} · {order.user?.email || '—'}</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {formatStatusLabel(displayPaymentStatus)}
                  </div>
                </div>

                <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_120px_160px_220px_auto] xl:items-center">
                  <p className="text-sm leading-6 text-slate-700">Item: <span className="font-semibold text-slate-900">{order.salesItem?.name || 'Unknown item'}</span></p>
                  <p className="text-sm leading-6 text-slate-700">Quantity: <span className="font-semibold text-slate-900">{order.quantity}</span></p>
                  <p className="text-sm leading-6 text-slate-700">Total: <span className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</span></p>
                  <p className="text-sm leading-6 text-slate-700">Method: <span className="font-semibold text-slate-900">{formatStatusLabel(order.paymentMethod)}</span></p>
                  <div className="xl:justify-self-end">
                    <button
                      type="button"
                      className={ui.buttonGhost}
                      onClick={() => handleToggleDetails(order)}
                    >
                      {isExpanded ? 'Close details' : 'View details'}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-2">
                      <p className="text-sm leading-6 text-slate-700">
                        Created: <span className="font-semibold text-slate-900">{formatDateTime(order.createdAt)}</span>
                      </p>
                      <p className="text-sm leading-6 text-slate-700">
                        Paid at: <span className="font-semibold text-slate-900">{formatDateTime(order.paidAt)}</span>
                      </p>
                      {order.paymentMethod === 'INTERAC_E_TRANSFER' ? (
                        <>
                          <p className="text-sm leading-6 text-slate-700">
                            Proof uploaded: <span className="font-semibold text-slate-900">{transferProof?.fileName || 'No screenshot found'}</span>
                          </p>
                          {transferProof?.storage ? (
                            <p className="text-sm leading-6 text-slate-700">
                              Storage: <span className="font-semibold text-slate-900">{transferProof.storage}</span>
                            </p>
                          ) : null}
                          <p className="text-sm leading-6 text-slate-700">
                            Proof time: <span className="font-semibold text-slate-900">{formatDateTime(transferProof?.uploadedAt)}</span>
                          </p>
                          {transferProof?.objectKey ? (
                            <p className="text-sm leading-6 text-slate-700">
                              Proof link:{' '}
                              {proofViewUrls[order.orderReference] ? (
                                <a
                                  href={proofViewUrls[order.orderReference]}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-emerald-700 underline underline-offset-2"
                                >
                                  Open uploaded receipt
                                </a>
                              ) : loadingProofReference === order.orderReference ? (
                                <span className="font-semibold text-slate-600">Preparing private link...</span>
                              ) : (
                                <button
                                  type="button"
                                  className="font-semibold text-emerald-700 underline underline-offset-2"
                                  onClick={() => handleToggleDetails(order)}
                                >
                                  Load receipt link
                                </button>
                              )}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {canConfirmInterac ? (
                        <button
                          type="button"
                          className={`${ui.buttonPrimary} w-fit min-w-[220px] ${confirmingReference === order.orderReference ? 'cursor-not-allowed opacity-60' : ''}`}
                          onClick={() => handleConfirm(order.orderReference)}
                          disabled={confirmingReference === order.orderReference}
                        >
                          {confirmingReference === order.orderReference ? 'Confirming payment...' : 'Confirm Interac payment'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${ui.buttonGhost} w-fit min-w-[220px] ${resendingReference === order.orderReference ? 'cursor-not-allowed opacity-60' : ''}`}
                        onClick={() => handleResend(order.orderReference)}
                        disabled={resendingReference === order.orderReference || !canResendConfirmation}
                        title={canResendConfirmation ? '' : 'Payment must be paid before confirmation can be resent.'}
                      >
                        {resendingReference === order.orderReference ? 'Resending confirmation...' : 'Resend payment confirmation'}
                      </button>
                      {!canResendConfirmation ? (
                        <p className="text-xs leading-5 text-slate-500">Available once payment status is Paid.</p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-sm font-semibold text-slate-700">Payment proof</p>
                      {order.paymentMethod === 'INTERAC_E_TRANSFER' && transferProof?.objectKey && loadingProofReference === order.orderReference && !transferProofImageSrc ? (
                        <p className={ui.note}>Loading private receipt preview...</p>
                      ) : order.paymentMethod === 'INTERAC_E_TRANSFER' && transferProofImageSrc ? (
                        <img
                          src={transferProofImageSrc}
                          alt={`Transfer proof for ${order.orderReference}`}
                          className="max-h-[280px] w-full rounded-xl object-contain"
                        />
                      ) : (
                        <p className={ui.note}>
                          {order.paymentMethod === 'STRIPE_CARD'
                            ? 'No payment proof is required for Stripe card payments.'
                            : 'No payment screenshot available for this payment.'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {!loading && payments.length === 0 ? <p className={ui.note}>No payments found for the current filters.</p> : null}
      </section>
    </section>
  );
}
