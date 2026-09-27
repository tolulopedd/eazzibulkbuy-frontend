import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import {
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
} from './AdminTablePrimitives';

const DEFAULT_QUERY = {
  q: '',
  status: '',
  page: 1,
  limit: 15,
};

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function getFirstName(value) {
  return String(value || 'Customer').trim().split(/\s+/)[0] || 'Customer';
}

function formatMessageType(value) {
  if (!value) return 'Message';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDefaultReply(message) {
  return [
    `Hello ${getFirstName(message?.customer?.name)},`,
    '',
    '',
    '',
    'Regards,',
    'EazziBulkBuy.',
  ].join('\n');
}

export default function AdminMessagingPanel({
  onLoadCustomerMessages,
  onReplyCustomerMessage,
}) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [messages, setMessages] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_QUERY.limit, total: 0, totalPages: 1 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function loadMessages(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadCustomerMessages(nextQuery);
      const items = response.items || [];
      setMessages(items);
      setMeta({
        page: response.page || nextQuery.page,
        limit: response.limit || nextQuery.limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
      setSelectedMessage((current) => {
        if (!current) return items[0] || null;
        return items.find((item) => item.id === current.id) || items[0] || null;
      });
    } catch (err) {
      setError(err.message || 'Unable to load messages right now.');
    } finally {
      setLoading(false);
    }
  }

  function selectMessage(message) {
    setSelectedMessage(message);
    setReplySubject(`Re: ${message.messageType === 'CUSTOMER_FEEDBACK' ? 'Your note to EazziBulkBuy' : 'Your message to EazziBulkBuy'}`);
    setReplyMessage(buildDefaultReply(message));
    setStatus('');
    setError('');
  }

  async function sendReply() {
    if (!selectedMessage?.id || !replySubject.trim() || !replyMessage.trim()) {
      return;
    }

    setSending(true);
    setError('');
    setStatus('');
    try {
      const result = await onReplyCustomerMessage(selectedMessage.id, {
        subject: replySubject.trim(),
        message: replyMessage.trim(),
      });
      setStatus(result.message || 'Reply sent successfully.');
      await loadMessages(query);
      setReplyMessage('');
    } catch (err) {
      setError(err.message || 'Unable to send reply right now.');
    } finally {
      setSending(false);
    }
  }

  function applyFilters() {
    const nextQuery = { ...query, q: query.q.trim(), page: 1 };
    setQuery(nextQuery);
    loadMessages(nextQuery);
  }

  function clearFilters() {
    setQuery(DEFAULT_QUERY);
    setSelectedMessage(null);
    loadMessages(DEFAULT_QUERY);
  }

  function goToPage(page) {
    const nextPage = Math.max(1, Math.min(page, meta.totalPages || 1));
    const nextQuery = { ...query, page: nextPage };
    setQuery(nextQuery);
    loadMessages(nextQuery);
  }

  useEffect(() => {
    loadMessages(DEFAULT_QUERY);
  }, []);

  useEffect(() => {
    if (selectedMessage) {
      setReplySubject((current) => current || `Re: ${selectedMessage.messageType === 'CUSTOMER_FEEDBACK' ? 'Your note to EazziBulkBuy' : 'Your message to EazziBulkBuy'}`);
      setReplyMessage((current) => current || buildDefaultReply(selectedMessage));
    }
  }, [selectedMessage?.id]);

  const selectedTrail = selectedMessage?.trail?.length
    ? selectedMessage.trail
    : selectedMessage
      ? [selectedMessage]
      : [];

  return (
    <section className="space-y-5">
      <section className={ui.card}>
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Messaging</h1>
          </div>

          {status ? <p className={ui.success}>{status}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className={`${ui.filterPanel} grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem_auto]`}>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input
                className={ui.input}
                value={query.q}
                onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyFilters();
                  }
                }}
                placeholder="Customer, email, order, message"
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Status</label>
              <select className={ui.select} value={query.status} onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value }))}>
                <option value="">All messages</option>
                <option value="UNREAD">Unread</option>
                <option value="READ">Read</option>
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <button type="button" className={ui.buttonPrimary} onClick={applyFilters} disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </button>
              <button type="button" className={ui.buttonGhost} onClick={clearFilters} disabled={loading}>
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(22rem,0.95fr)_minmax(0,1.35fr)]">
            <div className={ui.tableWrap}>
              <table className={`${ui.table} min-w-[760px]`}>
                <thead>
                  <tr className={ui.tableHeadRow}>
                    <th className={ui.tableHeaderCell}>Customer</th>
                    <th className={ui.tableHeaderCell}>Message</th>
                    <th className={ui.tableHeaderCell}>Status</th>
                    <th className={ui.tableHeaderCell}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => {
                    const isSelected = selectedMessage?.id === message.id;
                    return (
                      <tr
                        key={message.id}
                        className={`${ui.tableRow} cursor-pointer ${isSelected ? 'bg-emerald-50' : ''}`}
                        onClick={() => selectMessage(message)}
                      >
                        <td className={`${ui.tableCell} font-semibold text-slate-950`}>
                          <div>{message.customer?.name || '-'}</div>
                          <div className="text-xs font-semibold text-slate-500">{message.customer?.email || '-'}</div>
                        </td>
                        <td className={`${ui.tableCell} max-w-[20rem]`}>
                          <div className="line-clamp-2 whitespace-pre-wrap text-sm leading-5">{message.note || '-'}</div>
                          {message.orderReference ? <div className="mt-1 text-xs font-bold text-slate-500">{message.orderReference}</div> : null}
                        </td>
                        <td className={ui.tableCell}>
                          <AdminStatusBadge value={message.readAt ? 'Read' : 'Unread'} tone={message.readAt ? 'neutral' : 'warning'} />
                        </td>
                        <td className={ui.tableCell}>{formatDateTime(message.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loading ? <AdminTableEmpty message="Loading messages..." /> : null}
              {!loading && messages.length === 0 ? <AdminTableEmpty message="No messages found." /> : null}
              <AdminPagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPrev={() => goToPage(meta.page - 1)}
                onNext={() => goToPage(meta.page + 1)}
              />
            </div>

            <div className={`${ui.filterPanel} space-y-5`}>
              {selectedMessage ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-emerald-950">{selectedMessage.customer?.name || 'Customer'}</h2>
                      <p className="text-sm font-semibold text-slate-500">{selectedMessage.customer?.email || ''}</p>
                    </div>
                    <AdminStatusBadge value={selectedMessage.readAt ? 'Read' : 'Unread'} tone={selectedMessage.readAt ? 'neutral' : 'warning'} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-emerald-950">Mail trail</h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedTrail.length} message{selectedTrail.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded-3xl border border-[#deded4] bg-white p-4">
                      {selectedTrail.map((trailItem) => {
                        const isAdminReply = trailItem.source === 'ADMIN';
                        return (
                          <article
                            key={trailItem.id}
                            className={`max-w-[92%] rounded-2xl border px-4 py-3 ${
                              isAdminReply
                                ? 'ml-auto border-emerald-200 bg-emerald-50'
                                : 'mr-auto border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {isAdminReply ? trailItem.createdBy?.name || 'EazziBulkBuy Admin' : selectedMessage.customer?.name || 'Customer'}
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {isAdminReply ? 'Admin response' : formatMessageType(trailItem.messageType)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-slate-500">{formatDateTime(trailItem.createdAt)}</p>
                                {trailItem.orderReference ? <p className="mt-1 text-xs font-bold text-emerald-800">{trailItem.orderReference}</p> : null}
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{trailItem.note}</p>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Reply subject</label>
                    <input
                      className={ui.input}
                      value={replySubject}
                      onChange={(event) => setReplySubject(event.target.value)}
                    />
                  </div>

                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Reply</label>
                    <textarea
                      className={ui.textarea}
                      rows={8}
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Write reply to customer"
                    />
                  </div>

                  <button type="button" className={ui.buttonPrimary} onClick={sendReply} disabled={sending || !replySubject.trim() || !replyMessage.trim()}>
                    {sending ? 'Sending...' : 'Send reply'}
                  </button>
                </>
              ) : (
                <AdminTableEmpty message="Select a message to view and reply." />
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
