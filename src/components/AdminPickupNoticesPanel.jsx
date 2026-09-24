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
import AdminPickupLocationsPanel from './AdminPickupLocationsPanel';
import { formatDateInputValue, toIsoBoundary } from '../utils/centralTime';

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
  fulfillmentStatus: '',
  noticeStatus: '',
  sortBy: 'paidAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

const DEFAULT_REMINDER_QUERY = {
  ...DEFAULT_QUERY,
  fulfillmentMethod: 'PICKUP',
  fulfillmentStatus: 'PENDING_PICKUP',
  noticeStatus: 'SENT',
};

const DEFAULT_ALLOCATION_FILTERS = {
  startDate: '',
  endDate: '',
  q: '',
  batchNumber: '',
  location: '',
  noticeStatus: 'NOT_SENT',
};

function PickupNoticeTabIcon({ type }) {
  if (type === 'reminders') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M12 6v6l3 2" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }

  if (type === 'allocation') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M4 6h7v7H4z" />
        <path d="M13 6h7v7h-7z" />
        <path d="M4 15h7v3H4z" />
        <path d="M13 15h7v3h-7z" />
      </svg>
    );
  }

  if (type === 'general') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M4 6h16v12H4z" />
        <path d="m4 8 8 5 8-5" />
        <path d="M8 18v2" />
        <path d="M16 18v2" />
      </svg>
    );
  }

  if (type === 'templates') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h6" />
        <path d="M10 17h4" />
      </svg>
    );
  }

  if (type === 'locations') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 5h16v12H5.5L4 19.5z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

const LOCATION_NOT_SET_FILTER = '__LOCATION_NOT_SET__';

const createAllocationStockRow = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  batchNumber: '',
  quantity: '',
});

function normalizeAllocationValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeProduceOptionName(value) {
  return String(value || '').trim().replace(/^[A-Z]{1,4}\d{1,4}\s+/, '').trim();
}

const DEFAULT_PICKUP_EMAIL_BODY = `Hello {{name}},


Your paid order is now ready for pickup.


Order reference: {{orderReference}}
Items: {{items}}


Preferred pickup location: {{preferredPickupLocation}}


Pickup Address: {{pickupAddress}}
Date: {{readyDate}}
Time: {{timeWindow}}


{{defaultPickupInstructions}}


Please arrive within the stated time window to receive your order.


Regards,
EazziBulkBuy.`;

const DEFAULT_REMINDER_EMAIL_BODY = `Hello {{name}},


We noticed that your order has not been picked up. We sincerely apologise if you came yesterday and we were unable to fulfill the items/order due to mix up in logistics beyond our control.

You can please pickup your item(s) from 4:00 PM today at the same location.

Order reference: {{orderReference}}
Items: {{items}}

Preferred pickup location: {{preferredPickupLocation}}

Pickup Address: {{pickupAddress}}
Date: {{readyDate}}
Time: {{timeWindow}}

We appreciate your understanding.

Thank you
Titilayo
EazziBulkBuy.`;

const DEFAULT_DELIVERY_EMAIL_BODY = `Hello {{name}},


Your paid order is now ready for delivery coordination.


Order reference: {{orderReference}}
Items: {{items}}


Dispatch / meeting address: {{address}}
Date: {{readyDate}}
Time: {{timeWindow}}


{{additionalInstructions}}


Please watch for further coordination from our team if needed.


Regards,
EazziBulkBuy.`;

const DEFAULT_TEMPLATE_FORM = {
  name: '',
  templateType: 'PICKUP_NOTICE',
  address: '',
  readyDate: formatDateInputValue(),
  timeWindow: '2:00 PM - 5:00 PM',
  emailSubject: 'Your order is ready for pickup',
  emailBody: DEFAULT_PICKUP_EMAIL_BODY,
  instructions: '',
  sortOrder: '0',
  isActive: true,
};

function getTemplateDefaults(templateType) {
  if (templateType === 'PICKUP_REMINDER') {
    return {
      timeWindow: '4:00 PM - 6:00 PM or 7:00 PM - 10:00 PM',
      emailSubject: 'Pickup reminder for order {{orderReference}}',
      emailBody: DEFAULT_REMINDER_EMAIL_BODY,
    };
  }

  if (templateType === 'DELIVERY_NOTICE') {
    return {
      timeWindow: '2:00 PM - 5:00 PM',
      emailSubject: 'Your order is ready for delivery',
      emailBody: DEFAULT_DELIVERY_EMAIL_BODY,
    };
  }

  return {
    timeWindow: '2:00 PM - 5:00 PM',
    emailSubject: 'Your order is ready for pickup',
    emailBody: DEFAULT_PICKUP_EMAIL_BODY,
  };
}

function getTemplateTypeLabel(templateType) {
  if (templateType === 'PICKUP_REMINDER') return 'Pickup reminder';
  if (templateType === 'DELIVERY_NOTICE') return 'Delivery notice';
  return 'Pickup notice';
}

function getTemplateTypeTone(templateType) {
  if (templateType === 'PICKUP_REMINDER') return 'warning';
  if (templateType === 'DELIVERY_NOTICE') return 'neutral';
  return 'success';
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PERIOD_OPTIONS = ['AM', 'PM'];

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

function isCompletedFulfillment(row) {
  return row?.fulfillmentStatus === 'PICKED_UP' || row?.fulfillmentStatus === 'DELIVERED';
}

function normalizeSortOrder(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
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

function clampHourValue(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 2);
  if (!digits) {
    return '';
  }

  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) {
    return '';
  }

  return String(Math.min(12, Math.max(1, parsed)));
}

function clampMinuteValue(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 2);
  if (!digits) {
    return '';
  }

  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) {
    return '';
  }

  return String(Math.min(59, Math.max(0, parsed)));
}

function formatTimeParts({ hour, minute, period }) {
  if (!hour || minute === '' || !period) {
    return '';
  }

  return `${hour}:${String(minute || '').padStart(2, '0')} ${period}`;
}

function TimePartField({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</label>
      <div className="grid grid-cols-[72px_72px_78px] gap-2">
        <input
          className={`${ui.input} min-h-[42px]`}
          inputMode="numeric"
          placeholder="Hour"
          value={value.hour}
          onChange={(event) => onChange((current) => ({ ...current, hour: clampHourValue(event.target.value) }))}
          list={`${label.replace(/\s+/g, '-').toLowerCase()}-hours`}
        />
        <input
          className={`${ui.input} min-h-[42px]`}
          inputMode="numeric"
          placeholder="Min"
          value={value.minute}
          onChange={(event) => onChange((current) => ({ ...current, minute: clampMinuteValue(event.target.value) }))}
          onBlur={() =>
            onChange((current) => ({
              ...current,
              minute: current.minute === '' ? '' : String(current.minute).padStart(2, '0'),
            }))
          }
          list={`${label.replace(/\s+/g, '-').toLowerCase()}-minutes`}
        />
        <select
          className={`${ui.select} min-h-[42px] min-w-[78px]`}
          value={value.period}
          onChange={(event) => onChange((current) => ({ ...current, period: event.target.value }))}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <datalist id={`${label.replace(/\s+/g, '-').toLowerCase()}-hours`}>
        {HOUR_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={`${label.replace(/\s+/g, '-').toLowerCase()}-minutes`}>
        {MINUTE_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}

function PickupNoticeTemplateManager({
  templates,
  pickupLocations,
  loading,
  saving,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const pickupLocationOptions = pickupLocations
    .filter((location) => location.isActive !== false)
    .map((location) => location.name)
    .filter(Boolean);
  const [form, setForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [error, setError] = useState('');

  function buildPayload(source) {
    return {
      name: source.name.trim(),
      templateType: source.templateType,
      address: source.address.trim(),
      readyDate: source.readyDate,
      timeWindow: source.timeWindow.trim(),
      emailSubject: source.emailSubject.trim(),
      emailBody: source.emailBody.trim(),
      instructions: source.instructions.trim(),
      sortOrder: Number(source.sortOrder || 0),
      isActive: source.isActive,
    };
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.address.trim() || !form.readyDate || !form.timeWindow.trim() || !form.emailSubject.trim() || !form.emailBody.trim()) {
      setError('Fill template name, pickup address/location, ready date, time window, subject, and email details.');
      return;
    }

    await onCreate(buildPayload(form));
    setForm(DEFAULT_TEMPLATE_FORM);
  }

  function startEdit(template) {
    setEditingId(template.id);
    setEditForm({
      name: template.name || '',
      templateType: template.templateType || 'PICKUP_NOTICE',
      address: template.address || '',
      readyDate: template.readyDate || formatDateInputValue(),
      timeWindow: template.timeWindow || '',
      emailSubject: template.emailSubject || getTemplateDefaults(template.templateType).emailSubject,
      emailBody: template.emailBody || getTemplateDefaults(template.templateType).emailBody,
      instructions: template.instructions || '',
      sortOrder: String(template.sortOrder || 0),
      isActive: template.isActive !== false,
    });
    setError('');
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setError('');
    if (!editForm.name.trim() || !editForm.address.trim() || !editForm.readyDate || !editForm.timeWindow.trim() || !editForm.emailSubject.trim() || !editForm.emailBody.trim()) {
      setError('Fill template name, pickup address/location, ready date, time window, subject, and email details.');
      return;
    }

    await onUpdate(editingId, buildPayload(editForm));
    setEditingId('');
  }

  async function handleToggleActive(template) {
    await onUpdate(template.id, { isActive: !template.isActive });
    if (editingId === template.id) {
      setEditingId('');
    }
  }

  async function handleDelete(template) {
    if (!window.confirm(`Delete "${template.name}"? Existing sent notice history will remain on orders.`)) {
      return;
    }

    await onDelete(template.id);
    if (editingId === template.id) {
      setEditingId('');
    }
  }

  const formIsValid = form.name.trim() && form.address.trim() && form.readyDate && form.timeWindow.trim() && form.emailSubject.trim() && form.emailBody.trim();
  const editFormIsValid = editForm.name.trim() && editForm.address.trim() && editForm.readyDate && editForm.timeWindow.trim() && editForm.emailSubject.trim() && editForm.emailBody.trim();

  return (
    <section className={`${ui.section} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-emerald-950">Templates</h2>
        </div>
        {loading ? <AdminStatusBadge value="Loading templates" tone="neutral" /> : null}
      </div>

      <form className="grid gap-3 rounded-[24px] border border-[#e5e7de] bg-white p-4 xl:grid-cols-[170px_1fr_1fr_150px_170px_90px_120px]" onSubmit={handleCreate}>
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Template type</label>
          <select
            className={ui.select}
            value={form.templateType}
            onChange={(event) => {
              const templateType = event.target.value;
              setForm((current) => ({
                ...current,
                templateType,
                ...getTemplateDefaults(templateType),
              }));
            }}
          >
            <option value="PICKUP_NOTICE">Pickup notice</option>
            <option value="PICKUP_REMINDER">Pickup reminder</option>
            <option value="DELIVERY_NOTICE">Delivery notice</option>
          </select>
        </div>
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Template name</label>
          <input className={ui.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={form.templateType === 'PICKUP_REMINDER' ? 'Sage Creek reminder' : 'Sage Creek Aug 29 afternoon'} />
        </div>
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Pickup address / location</label>
          <input
            className={ui.input}
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Select or type location"
            list="pickup-notice-template-addresses"
          />
          <datalist id="pickup-notice-template-addresses">
            {pickupLocationOptions.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </div>
        <DateFilterField label="Ready date" value={form.readyDate} onChange={(event) => setForm((current) => ({ ...current, readyDate: event.target.value }))} />
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Time window</label>
          <input className={ui.input} value={form.timeWindow} onChange={(event) => setForm((current) => ({ ...current, timeWindow: event.target.value }))} placeholder="2:00 PM - 5:00 PM" />
        </div>
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Sort</label>
          <input className={ui.input} inputMode="numeric" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: normalizeSortOrder(event.target.value) }))} placeholder="0" />
        </div>
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Status</label>
          <select className={ui.select} value={form.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'ACTIVE' }))}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="xl:col-span-7">
          <label className={ui.label}>Subject</label>
          <input className={ui.input} value={form.emailSubject} onChange={(event) => setForm((current) => ({ ...current, emailSubject: event.target.value }))} placeholder="Your order is ready for pickup" />
        </div>
        <div className="xl:col-span-7">
          <label className={ui.label}>Email details</label>
          <textarea className={ui.textarea} rows={10} value={form.emailBody} onChange={(event) => setForm((current) => ({ ...current, emailBody: event.target.value }))} />
        </div>
        <div className="xl:col-span-6">
          <label className={ui.label}>Instructions</label>
          <textarea className={ui.textarea} rows={3} value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Optional additional pickup instructions" />
        </div>
        <div className="flex items-end">
          <button type="submit" className={ui.buttonPrimary} disabled={saving || !formIsValid}>
            {saving ? 'Adding...' : formIsValid ? 'Add template' : 'Fill details'}
          </button>
        </div>
      </form>

      {error ? <p className={ui.error}>{error}</p> : null}

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[1480px]`}>
          <thead>
            <tr className={ui.tableHeadRow}>
              <th className={ui.tableHeaderCell}>Type</th>
              <th className={ui.tableHeaderCell}>Template</th>
              <th className={ui.tableHeaderCell}>Pickup address / location</th>
              <th className={ui.tableHeaderCell}>Ready date</th>
              <th className={ui.tableHeaderCell}>Time window</th>
              <th className={ui.tableHeaderCell}>Subject</th>
              <th className={ui.tableHeaderCell}>Email details</th>
              <th className={ui.tableHeaderCell}>Sort</th>
              <th className={ui.tableHeaderCell}>Status</th>
              <th className={ui.tableHeaderCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const isEditing = false;
              return (
                <tr key={template.id} className={ui.tableRow}>
                  <td className={ui.tableCell}>
                    <AdminStatusBadge value={getTemplateTypeLabel(template.templateType)} tone={getTemplateTypeTone(template.templateType)} />
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <input className={ui.input} value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                    ) : (
                      <span className="font-semibold text-slate-900">{template.name}</span>
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <input className={ui.input} value={editForm.address} list="pickup-notice-template-addresses" onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))} />
                    ) : (
                      <span>{template.address}</span>
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <DateFilterField label="Ready date" value={editForm.readyDate} onChange={(event) => setEditForm((current) => ({ ...current, readyDate: event.target.value }))} />
                    ) : (
                      formatDisplayDate(template.readyDate)
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <input className={ui.input} value={editForm.timeWindow} onChange={(event) => setEditForm((current) => ({ ...current, timeWindow: event.target.value }))} />
                    ) : (
                      template.timeWindow
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <input className={ui.input} value={editForm.emailSubject} onChange={(event) => setEditForm((current) => ({ ...current, emailSubject: event.target.value }))} />
                    ) : (
                      <span className="block max-w-[16rem] truncate" title={template.emailSubject || getTemplateDefaults(template.templateType).emailSubject}>
                        {template.emailSubject || getTemplateDefaults(template.templateType).emailSubject}
                      </span>
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <textarea className={ui.textarea} rows={8} value={editForm.emailBody} onChange={(event) => setEditForm((current) => ({ ...current, emailBody: event.target.value }))} />
                    ) : (
                      <span className="block max-h-[4.5rem] max-w-[20rem] overflow-hidden whitespace-pre-wrap text-xs leading-5 text-slate-600">
                        {template.emailBody || getTemplateDefaults(template.templateType).emailBody}
                      </span>
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <input className={ui.input} inputMode="numeric" value={editForm.sortOrder} onChange={(event) => setEditForm((current) => ({ ...current, sortOrder: normalizeSortOrder(event.target.value) }))} />
                    ) : (
                      template.sortOrder || 0
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <select className={ui.select} value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'ACTIVE' }))}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    ) : (
                      <AdminStatusBadge value={template.isActive ? 'Active' : 'Inactive'} tone={template.isActive ? 'success' : 'neutral'} />
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button type="button" className={ui.buttonPrimary} disabled={saving || !editFormIsValid} onClick={handleSaveEdit}>
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button type="button" className={ui.buttonGhost} onClick={() => setEditingId('')}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className={ui.buttonGhost} disabled={saving} onClick={() => startEdit(template)}>Edit</button>
                          <button type="button" className={ui.buttonGhost} disabled={saving} onClick={() => handleToggleActive(template)}>
                            {template.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" className={ui.buttonDanger} disabled={saving} onClick={() => handleDelete(template)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && templates.length === 0 ? <AdminTableEmpty message="No pickup notice templates yet. Add one before sending notices." /> : null}
      </div>

      {editingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="absolute inset-0" onClick={() => setEditingId('')} aria-hidden="true" />
          <div className="relative z-10 max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Edit template</h2>
              <button type="button" className={ui.iconButton} onClick={() => setEditingId('')} aria-label="Close template editor">
                <CloseIcon />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Template type</label>
                <select
                  className={ui.select}
                  value={editForm.templateType}
                  onChange={(event) => {
                    const templateType = event.target.value;
                    setEditForm((current) => ({
                      ...current,
                      templateType,
                      ...getTemplateDefaults(templateType),
                    }));
                  }}
                >
                  <option value="PICKUP_NOTICE">Pickup notice</option>
                  <option value="PICKUP_REMINDER">Pickup reminder</option>
                  <option value="DELIVERY_NOTICE">Delivery notice</option>
                </select>
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Template name</label>
                <input className={ui.input} value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Pickup address / location</label>
                <input className={ui.input} value={editForm.address} list="pickup-notice-template-addresses" onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))} />
              </div>
              <DateFilterField label="Ready date" value={editForm.readyDate} onChange={(event) => setEditForm((current) => ({ ...current, readyDate: event.target.value }))} />
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Time window</label>
                <input className={ui.input} value={editForm.timeWindow} onChange={(event) => setEditForm((current) => ({ ...current, timeWindow: event.target.value }))} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Sort</label>
                <input className={ui.input} inputMode="numeric" value={editForm.sortOrder} onChange={(event) => setEditForm((current) => ({ ...current, sortOrder: normalizeSortOrder(event.target.value) }))} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Status</label>
                <select className={ui.select} value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'ACTIVE' }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={ui.label}>Subject</label>
                <input className={ui.input} value={editForm.emailSubject} onChange={(event) => setEditForm((current) => ({ ...current, emailSubject: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className={ui.label}>Email details</label>
                <textarea className={ui.textarea} rows={12} value={editForm.emailBody} onChange={(event) => setEditForm((current) => ({ ...current, emailBody: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className={ui.label}>Instructions</label>
                <textarea className={ui.textarea} rows={4} value={editForm.instructions} onChange={(event) => setEditForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Optional additional pickup instructions" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className={ui.buttonPrimary} disabled={saving || !editFormIsValid} onClick={handleSaveEdit}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className={ui.buttonGhost} onClick={() => setEditingId('')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function NoticeModal({
  rows,
  templates,
  onClose,
  onSubmit,
  submitting,
  title = 'Send pickup notice',
  submitLabel = 'Send notice',
  templateType = 'PICKUP_NOTICE',
}) {
  const activeTemplates = templates.filter((template) => template.isActive !== false && (template.templateType || 'PICKUP_NOTICE') === templateType);
  const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplates[0]?.id || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedTemplateId && activeTemplates[0]?.id) {
      setSelectedTemplateId(activeTemplates[0].id);
    }
  }, [templates, selectedTemplateId]);

  if (!rows.length) {
    return null;
  }

  const selectedCount = rows.length;
  const selectedOrders = [...new Set(rows.map((row) => row.displayOrderReference))];
  const selectedTemplate = activeTemplates.find((template) => template.id === selectedTemplateId) || null;

  async function handleSubmit() {
    if (!selectedTemplate) {
      setError('Select a pickup notice template before sending.');
      return;
    }

    setError('');
    await onSubmit({
      items: rows.map((row) => ({
        orderReference: row.orderReference,
        itemIndex: row.itemIndex,
      })),
      channels: ['EMAIL'],
      templateId: selectedTemplate.id,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">{title}</h2>
            <p className="text-sm text-slate-600">
              {selectedCount} item{selectedCount === 1 ? '' : 's'} across {selectedOrders.length} order{selectedOrders.length === 1 ? '' : 's'} selected
            </p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onClose} aria-label="Close pickup notice">
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Message template</label>
              <select className={ui.select} value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">Select {templateType === 'PICKUP_REMINDER' ? 'pickup reminder' : 'pickup notice'} template</option>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              {!activeTemplates.length ? (
                <p className="text-xs text-amber-700">No active templates.</p>
              ) : null}
            </div>
          </div>

          <div className={`${ui.section} space-y-3`}>
            <p className="text-sm font-semibold text-slate-900">Selected items</p>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={`${row.orderReference}:${row.itemIndex}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e7e8df] bg-white px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900">{row.displayOrderReference}</span>
                  <span className="text-slate-600">{row.name} x{row.quantity}</span>
                  <span className="text-slate-500">{row.user?.name || 'Unknown buyer'}</span>
                  {row.preferredPickupLocation ? <span className="text-slate-500">{row.preferredPickupLocation}</span> : null}
                </div>
              ))}
            </div>
          </div>

          {error ? <p className={ui.error}>{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" className={ui.buttonPrimary} onClick={handleSubmit} disabled={submitting || !activeTemplates.length}>
              {submitting ? 'Sending...' : submitLabel}
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

function PickupAllocationPanel({
  templates,
  pickupLocations,
  produceOptions,
  salesEventOptions,
  onLoadPendingSummary,
  onPreview,
  onSend,
  fulfillmentMethod = 'PICKUP',
}) {
  const [filters, setFilters] = useState(DEFAULT_ALLOCATION_FILTERS);
  const [stockRows, setStockRows] = useState([createAllocationStockRow()]);
  const [preview, setPreview] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPendingSummary, setLoadingPendingSummary] = useState(false);
  const [pendingSummaryItems, setPendingSummaryItems] = useState([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const isDeliveryAllocation = fulfillmentMethod === 'DELIVERY';
  const allocationTitle = isDeliveryAllocation ? 'Delivery Allocation' : 'Pickup Allocation';
  const locationLabel = isDeliveryAllocation ? 'Delivery location' : 'Pickup location';
  const templateType = isDeliveryAllocation ? 'DELIVERY_NOTICE' : 'PICKUP_NOTICE';
  const activeTemplates = templates.filter((template) => template.isActive !== false && (template.templateType || 'PICKUP_NOTICE') === templateType);
  const pickupLocationOptions = pickupLocations
    .filter((location) => location.isActive !== false)
    .map((location) => location.name)
    .filter(Boolean);
  const productOptions = useMemo(() => {
    const names = [
      ...(produceOptions || []),
      ...(salesEventOptions || []).map((item) => item.name),
      ...(pendingSummaryItems || []).map((item) => item.name),
    ];

    return [...new Set(names.map(normalizeProduceOptionName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [produceOptions, salesEventOptions, pendingSummaryItems]);
  const batchOptionsByProduce = useMemo(() => {
    const options = new Map();

    (salesEventOptions || []).forEach((item) => {
      const produceName = normalizeProduceOptionName(item.name);
      const batchNumber = String(item.batchNumber || '').trim();
      if (!produceName || !batchNumber) return;

      const key = produceName.toLowerCase();
      const current = options.get(key) || [];
      if (!current.some((entry) => entry.batchNumber === batchNumber)) {
        current.push({
          batchNumber,
          label: batchNumber,
        });
      }
      options.set(key, current);
    });

    options.forEach((entries) => entries.sort((a, b) => a.batchNumber.localeCompare(b.batchNumber)));
    return options;
  }, [salesEventOptions]);
  const selectedSuggestions = (preview?.suggestions || []).filter((suggestion) => selectedOrders.includes(suggestion.orderReference));
  const allSuggestionsSelected = (preview?.suggestions || []).length > 0 && (preview?.suggestions || []).every((suggestion) => selectedOrders.includes(suggestion.orderReference));
  const pendingSummaryByProduct = useMemo(() => {
    const summary = new Map();

    pendingSummaryItems.forEach((item) => {
      const productKey = normalizeAllocationValue(item.name);
      const batchKey = normalizeAllocationValue(item.batchNumber);
      const exactKey = `${productKey}::${batchKey}`;
      const productEntry = summary.get(productKey) || { pendingQuantity: 0, pendingOrders: 0, batches: new Map() };
      const exactEntry = productEntry.batches.get(exactKey) || { pendingQuantity: 0, pendingOrders: 0 };

      productEntry.pendingQuantity += Number(item.pendingQuantity) || 0;
      productEntry.pendingOrders += Number(item.pendingOrders) || 0;
      exactEntry.pendingQuantity += Number(item.pendingQuantity) || 0;
      exactEntry.pendingOrders += Number(item.pendingOrders) || 0;
      productEntry.batches.set(exactKey, exactEntry);
      summary.set(productKey, productEntry);
    });

    return summary;
  }, [pendingSummaryItems]);

  useEffect(() => {
    if (!selectedTemplateId && activeTemplates[0]?.id) {
      setSelectedTemplateId(activeTemplates[0].id);
    }
  }, [activeTemplates, selectedTemplateId]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(async () => {
      if (!onLoadPendingSummary) {
        return;
      }

      setLoadingPendingSummary(true);
      try {
        const response = await onLoadPendingSummary({
          startDate: toIsoBoundary(filters.startDate),
          endDate: toIsoBoundary(filters.endDate, true),
          q: filters.q.trim(),
          batchNumber: filters.batchNumber.trim(),
          location: filters.location,
          noticeStatus: filters.noticeStatus,
          fulfillmentMethod,
        });
        if (mounted) {
          setPendingSummaryItems(response.items || []);
        }
      } catch {
        if (mounted) {
          setPendingSummaryItems([]);
        }
      } finally {
        if (mounted) {
          setLoadingPendingSummary(false);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [filters.startDate, filters.endDate, filters.q, filters.batchNumber, filters.location, filters.noticeStatus, fulfillmentMethod, onLoadPendingSummary]);

  function updateStockRow(rowId, patch) {
    setStockRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    setPreview(null);
    setSelectedOrders([]);
  }

  function removeStockRow(rowId) {
    setStockRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== rowId)));
    setPreview(null);
    setSelectedOrders([]);
  }

  async function handlePreview(event) {
    event.preventDefault();
    setStatus('');
    setError('');
    const availableItems = stockRows
      .map((row) => ({
        name: row.name.trim(),
        batchNumber: row.batchNumber.trim(),
        quantity: Number(row.quantity),
      }))
      .filter((row) => row.name && Number.isInteger(row.quantity) && row.quantity > 0);

    if (!availableItems.length) {
      setError('Enter available items.');
      return;
    }

    setLoading(true);
    try {
      const result = await onPreview({
        availableItems,
        filters: {
          startDate: toIsoBoundary(filters.startDate),
          endDate: toIsoBoundary(filters.endDate, true),
          q: filters.q.trim(),
          batchNumber: filters.batchNumber.trim(),
          location: filters.location,
          noticeStatus: filters.noticeStatus,
          fulfillmentMethod,
        },
      });
      setPreview(result);
      setSelectedOrders((result.suggestions || []).map((suggestion) => suggestion.orderReference));
      setStatus(`${result.suggestedOrders || 0} suggested`);
    } catch (err) {
      setError(err.message || 'Unable to preview allocation.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendSelected() {
    setStatus('');
    setError('');
    if (!selectedTemplateId) {
      setError('Select template.');
      return;
    }

    const items = selectedSuggestions.flatMap((suggestion) =>
      suggestion.items.map((item) => ({
        orderReference: item.orderReference,
        itemIndex: item.itemIndex,
      }))
    );

    if (!items.length) {
      setError('Select allocation.');
      return;
    }

    setSending(true);
    try {
      const result = await onSend({
        items,
        channels: ['EMAIL'],
        templateId: selectedTemplateId,
      });
      setStatus(result.message || `${allocationTitle} notices sent successfully.`);
      setPreview(null);
      setSelectedOrders([]);
    } catch (err) {
      setError(err.message || 'Unable to send pickup notices.');
    } finally {
      setSending(false);
    }
  }

  function toggleSuggestion(orderReference) {
    setSelectedOrders((current) => (
      current.includes(orderReference)
        ? current.filter((value) => value !== orderReference)
        : [...current, orderReference]
    ));
  }

  function toggleAllSuggestions() {
    if (allSuggestionsSelected) {
      setSelectedOrders([]);
      return;
    }
    setSelectedOrders((preview?.suggestions || []).map((suggestion) => suggestion.orderReference));
  }

  function getBatchOptionsForRow(row) {
    return batchOptionsByProduce.get(String(row.name || '').trim().toLowerCase()) || [];
  }

  function getPendingSummaryForRow(row) {
    const productKey = normalizeAllocationValue(row.name);
    if (!productKey) return null;

    const productSummary = pendingSummaryByProduct.get(productKey);
    if (!productSummary) {
      return { pendingQuantity: 0, pendingOrders: 0 };
    }

    const batchKey = normalizeAllocationValue(row.batchNumber);
    if (!batchKey) {
      return productSummary;
    }

    return productSummary.batches.get(`${productKey}::${batchKey}`) || { pendingQuantity: 0, pendingOrders: 0 };
  }

  return (
    <section className={ui.card}>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">{allocationTitle}</h1>
        </div>

        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <form className={`${ui.filterPanel} space-y-4`} onSubmit={handlePreview}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DateFilterField label="Start date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
            <DateFilterField label="End date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input className={ui.input} value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Name, order number, email" />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Batch number</label>
              <input
                className={ui.input}
                value={filters.batchNumber}
                onChange={(event) => setFilters((current) => ({ ...current, batchNumber: event.target.value.toUpperCase().replace(/[^A-Z0-9,\s]/g, '') }))}
                placeholder="RH4, TM1"
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>{locationLabel}</label>
              <select className={ui.select} value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}>
                <option value="">All Location</option>
                <option value={LOCATION_NOT_SET_FILTER}>Location Not Set</option>
                {pickupLocationOptions.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Notice status</label>
              <select className={ui.select} value={filters.noticeStatus} onChange={(event) => setFilters((current) => ({ ...current, noticeStatus: event.target.value }))}>
                <option value="">All statuses</option>
                <option value="NOT_SENT">Not sent</option>
                <option value="SENT">Sent</option>
              </select>
            </div>
            <div className={`${ui.fieldWrap} md:col-span-2`}>
              <label className={ui.label}>Template</label>
              <select className={ui.select} value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">Select {isDeliveryAllocation ? 'delivery' : 'pickup'} template</option>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className={ui.label}>Available items</p>
	            {stockRows.map((row) => {
	              const rowPendingSummary = getPendingSummaryForRow(row);
	              return (
	              <div key={row.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_140px_auto]">
		                <select
		                  className={ui.select}
		                  value={row.name}
	                  onChange={(event) => updateStockRow(row.id, { name: event.target.value, batchNumber: '' })}
	                >
	                  <option value="">Select produce</option>
	                  {productOptions.map((name) => (
	                    <option key={name} value={name}>{name}</option>
	                  ))}
	                </select>
	                <select
	                  className={ui.select}
	                  value={row.batchNumber}
	                  onChange={(event) => updateStockRow(row.id, { batchNumber: event.target.value })}
	                  disabled={!row.name}
	                >
	                  <option value="">All batches</option>
	                  {getBatchOptionsForRow(row).map((item) => (
	                    <option key={item.batchNumber} value={item.batchNumber}>{item.label}</option>
	                  ))}
	                </select>
	                <input
                  className={ui.input}
                  inputMode="numeric"
                  value={row.quantity}
	                  onChange={(event) => updateStockRow(row.id, { quantity: event.target.value.replace(/\D/g, '') })}
	                  placeholder="Qty"
	                />
	                <div className="flex min-h-[46px] items-center rounded-2xl border border-[#e4e6dc] bg-white px-4 text-sm font-semibold text-emerald-950">
	                  {loadingPendingSummary ? 'Pending: ...' : rowPendingSummary ? `Pending: ${rowPendingSummary.pendingQuantity}` : 'Pending: -'}
	                </div>
	                <button type="button" className={ui.buttonGhost} onClick={() => removeStockRow(row.id)} disabled={stockRows.length === 1}>
	                  Remove
	                </button>
	              </div>
	              );
	            })}
            <div className="flex flex-wrap gap-3">
              <button type="button" className={ui.buttonGhost} onClick={() => setStockRows((current) => [...current, createAllocationStockRow()])}>
                Add item
              </button>
              <button type="submit" className={ui.buttonPrimary} disabled={loading}>
                {loading ? 'Checking...' : 'Preview allocation'}
              </button>
              <button type="button" className={ui.buttonPrimary} onClick={handleSendSelected} disabled={sending || !selectedSuggestions.length || !selectedTemplateId}>
                {sending ? 'Sending...' : selectedSuggestions.length ? `Send selected (${selectedSuggestions.length})` : 'Select allocation'}
              </button>
            </div>
          </div>
        </form>

        {preview ? (
          <div className="space-y-5">
            <div className={ui.tableWrap}>
              <table className={`${ui.table} min-w-[1180px]`}>
                <thead>
                  <tr className={ui.tableHeadRow}>
                    <th className={ui.tableHeaderCell}>
                      <input type="checkbox" checked={allSuggestionsSelected} onChange={toggleAllSuggestions} aria-label="Select all suggested allocations" />
                    </th>
                    <th className={ui.tableHeaderCell}>Order</th>
                    <th className={ui.tableHeaderCell}>Buyer</th>
                    <th className={ui.tableHeaderCell}>Paid</th>
                    <th className={ui.tableHeaderCell}>Location</th>
                    <th className={ui.tableHeaderCell}>Items</th>
	                    <th className={ui.tableHeaderCell}>Allocated Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.suggestions || []).map((suggestion) => (
                    <tr key={suggestion.orderReference} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(suggestion.orderReference)}
                          onChange={() => toggleSuggestion(suggestion.orderReference)}
                          aria-label={`Select ${suggestion.displayOrderReference}`}
                        />
                      </td>
                      <td className={`${ui.tableCell} whitespace-nowrap font-semibold text-slate-900`}>{suggestion.displayOrderReference}</td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[14rem]">
                          <p className="truncate font-medium text-slate-900">{suggestion.buyerName}</p>
                          <p className="truncate text-xs text-slate-500">{suggestion.buyerEmail || suggestion.buyerPhone || '-'}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>{formatDate(suggestion.paidAt)}</td>
                      <td className={ui.tableCell}>
                        <span className="block max-w-[16rem] truncate" title={suggestion.pickupLocation}>{suggestion.pickupLocation || '-'}</span>
                      </td>
                      <td className={ui.tableCell}>
                        <span className="block max-w-[24rem] whitespace-normal">
                          {suggestion.items.map((item) => `${item.name}${item.batchNumber ? ` ${item.batchNumber}` : ''} x${item.quantity}`).join(', ')}
                        </span>
                      </td>
	                      <td className={ui.tableCell}>{suggestion.totalQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!preview.suggestions?.length ? <AdminTableEmpty message="No rows." /> : null}
            </div>

            <div className={ui.tableWrap}>
              <table className={`${ui.table} min-w-[640px]`}>
                <thead>
                  <tr className={ui.tableHeadRow}>
                    <th className={ui.tableHeaderCell}>Product</th>
                    <th className={ui.tableHeaderCell}>Batch</th>
                    <th className={ui.tableHeaderCell}>Input qty</th>
                    <th className={ui.tableHeaderCell}>Remaining qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.remainingItems || []).map((item, index) => (
                    <tr key={`${item.name}:${item.batchNumber}:${index}`} className={ui.tableRow}>
                      <td className={ui.tableCell}>{item.name}</td>
                      <td className={ui.tableCell}>{item.batchNumber || '-'}</td>
                      <td className={ui.tableCell}>{item.inputQuantity}</td>
                      <td className={ui.tableCell}>{item.remainingQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GeneralNoticesPanel({
  onLoadCustomers,
  onSendGeneralNotices,
}) {
  const defaultGeneralNoticeMessage = [
    'Dear {{Firstname}},',
    '',
    '',
    '',
    'Regards,',
    'EazziBulkBuy.',
  ].join('\n');
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectAllCustomers, setSelectAllCustomers] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(defaultGeneralNoticeMessage);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const customerSearchRequestRef = useRef(0);

  async function searchCustomers(searchTerm = query) {
    const requestId = customerSearchRequestRef.current + 1;
    customerSearchRequestRef.current = requestId;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await onLoadCustomers({
        q: searchTerm.trim(),
        page: 1,
        limit: 25,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      if (requestId !== customerSearchRequestRef.current) {
        return;
      }
      setCustomers(response.items || []);
      setSelectAllCustomers(false);
    } catch (err) {
      if (requestId === customerSearchRequestRef.current) {
        setError(err.message || 'Unable to load customers right now.');
      }
    } finally {
      if (requestId === customerSearchRequestRef.current) {
        setLoading(false);
      }
    }
  }

  function toggleCustomer(customer) {
    setSelectAllCustomers(false);
    setSelectedCustomers((current) => (
      current.some((entry) => entry.id === customer.id)
        ? current.filter((entry) => entry.id !== customer.id)
        : [...current, customer]
    ));
  }

  function toggleVisibleCustomers(event) {
    const checked = event.target.checked;
    setSelectAllCustomers(false);
    setSelectedCustomers((current) => {
      if (!checked) {
        const visibleIds = new Set(customers.map((customer) => customer.id));
        return current.filter((customer) => !visibleIds.has(customer.id));
      }

      const next = [...current];
      for (const customer of customers) {
        if (!next.some((entry) => entry.id === customer.id)) {
          next.push(customer);
        }
      }
      return next;
    });
  }

  function toggleAllCustomersForNotice(event) {
    const checked = event.target.checked;
    setSelectAllCustomers(checked);
    if (checked) {
      setSelectedCustomers([]);
    }
  }

  async function sendNotice() {
    if ((!selectedCustomers.length && !selectAllCustomers) || !subject.trim() || !message.trim()) {
      return;
    }

    setSending(true);
    setError('');
    setStatus('');
    try {
      const result = await onSendGeneralNotices({
        customerIds: selectAllCustomers ? [] : selectedCustomers.map((customer) => customer.id),
        selectAllMatching: selectAllCustomers,
        q: selectAllCustomers ? '' : query.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setStatus(result.message || 'General notice sent.');
    } catch (err) {
      setError(err.message || 'Unable to send general notice right now.');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchCustomers(query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const canSend = (selectedCustomers.length > 0 || selectAllCustomers) && subject.trim() && message.trim();
  const selectedLabel = selectAllCustomers
    ? 'All customers selected'
    : `${selectedCustomers.length.toLocaleString()} selected`;
  const visibleCustomersSelected = customers.length > 0 && customers.every((customer) => (
    selectedCustomers.some((entry) => entry.id === customer.id)
  ));

  return (
    <section className={ui.card}>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">General Notices</h1>
        </div>

        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <div className={`${ui.filterPanel} grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]`}>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Search customer</label>
            <input
              className={ui.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  searchCustomers();
                }
              }}
              placeholder="Name, email, phone"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" className={ui.buttonGhost} onClick={searchCustomers} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <label className={`flex min-h-[3rem] items-center gap-3 rounded-full border border-[#deded4] bg-white px-5 py-2 text-base font-semibold text-slate-800 shadow-sm ${!customers.length ? 'cursor-not-allowed opacity-60' : ''}`}>
              <input
                type="checkbox"
                checked={visibleCustomersSelected}
                onChange={toggleVisibleCustomers}
                disabled={!customers.length}
                className="h-5 w-5 accent-emerald-500 disabled:cursor-not-allowed"
              />
              Select visible
            </label>
            <label className="flex min-h-[3rem] items-center gap-3 rounded-full border border-[#deded4] bg-white px-5 py-2 text-base font-semibold text-slate-800 shadow-sm">
              <input
                type="checkbox"
                checked={selectAllCustomers}
                onChange={toggleAllCustomersForNotice}
                className="h-5 w-5 accent-emerald-500"
              />
              All Customer
            </label>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]">
          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[760px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Select</th>
                  <th className={ui.tableHeaderCell}>Customer</th>
                  <th className={ui.tableHeaderCell}>Email</th>
                  <th className={ui.tableHeaderCell}>Phone</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const selected = selectedCustomers.some((entry) => entry.id === customer.id);
                  return (
                    <tr key={customer.id} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCustomer(customer)}
                          className="h-4 w-4 accent-emerald-500"
                        />
                      </td>
                      <td className={`${ui.tableCell} font-semibold text-slate-900`}>{customer.name || '-'}</td>
                      <td className={ui.tableCell}>{customer.email || '-'}</td>
                      <td className={ui.tableCell}>{customer.phone || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && customers.length === 0 ? <AdminTableEmpty message="No customers found." /> : null}
          </div>

          <div className={`${ui.filterPanel} space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-emerald-950">Notice</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                {selectedLabel}
              </span>
            </div>

            {selectAllCustomers ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                All customers will receive this notice.
              </div>
            ) : selectedCustomers.length ? (
              <div className="max-h-28 overflow-y-auto rounded-2xl border border-[#deded4] bg-white p-2">
                {selectedCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700">
                    <span>{customer.name || customer.email}</span>
                    <button type="button" className="text-xs font-bold text-red-600" onClick={() => toggleCustomer(customer)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={ui.fieldWrap}>
              <label className={ui.label}>Subject</label>
              <input
                className={ui.input}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Notice subject"
              />
            </div>

            <div className={ui.fieldWrap}>
              <label className={ui.label}>Message</label>
              <textarea
                className={ui.textarea}
                rows={8}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Message to send"
              />
            </div>

            <button type="button" className={ui.buttonPrimary} onClick={sendNotice} disabled={sending || !canSend}>
              {sending ? 'Sending...' : 'Send notice'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminPickupNoticesPanel({
  onLoadPickupNotices,
  onLoadPickupAllocationPendingSummary,
  onPreviewPickupAllocation,
  onLoadPickupNoticeTemplates,
  onCreatePickupNoticeTemplate,
  onUpdatePickupNoticeTemplate,
  onDeletePickupNoticeTemplate,
  onSendPickupNotices,
  onLoadCustomers,
  onSendGeneralNotices,
  onLoadPickupLocations,
  onCreatePickupLocation,
  onUpdatePickupLocation,
  onDeletePickupLocation,
  pickupLocations = [],
  produceOptions = [],
  salesEventOptions = [],
}) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [filterOptions, setFilterOptions] = useState({ locations: [] });
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [modalRows, setModalRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notices');
  const didInitFiltersRef = useRef(false);
  const isReminderTab = activeTab === 'reminders';

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

  async function loadTemplates() {
    setLoadingTemplates(true);
    setError('');
    try {
      const response = await onLoadPickupNoticeTemplates({ status: 'ALL' });
      setTemplates(response.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load pickup notice templates right now.');
    } finally {
      setLoadingTemplates(false);
    }
  }

  useEffect(() => {
    loadNotices(DEFAULT_QUERY);
    loadTemplates();
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
  }, [query.startDate, query.endDate, query.q, query.batchNumber, query.location, query.fulfillmentMethod, query.fulfillmentStatus, query.noticeStatus]);

  const selectedRows = useMemo(
    () => rows.filter((row) => !isCompletedFulfillment(row) && selectedKeys.includes(`${row.orderReference}:${row.itemIndex}`)),
    [rows, selectedKeys],
  );

  const selectableRows = useMemo(() => rows.filter((row) => !isCompletedFulfillment(row)), [rows]);
  const allVisibleSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedKeys.includes(`${row.orderReference}:${row.itemIndex}`));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedKeys([]);
      return;
    }

    setSelectedKeys(selectableRows.map((row) => `${row.orderReference}:${row.itemIndex}`));
  }

  function toggleRow(row) {
    if (isCompletedFulfillment(row)) {
      return;
    }

    const key = `${row.orderReference}:${row.itemIndex}`;
    setSelectedKeys((current) => (current.includes(key) ? current.filter((value) => value !== key) : [...current, key]));
  }

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, meta.totalPages || 1));
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    await loadNotices(nextQuery);
  }

	  async function switchTab(tab) {
	    setActiveTab(tab);
	    setStatus('');
	    setError('');
	    setModalRows([]);
    if (tab === 'notices') {
      setQuery(DEFAULT_QUERY);
      await loadNotices(DEFAULT_QUERY);
    }
	    if (tab === 'reminders') {
	      setQuery(DEFAULT_REMINDER_QUERY);
	      await loadNotices(DEFAULT_REMINDER_QUERY);
	    }
	  }

  async function handleSend(payload) {
    setSubmitting(true);
    setError('');
    setStatus('');
    try {
      const result = await onSendPickupNotices(payload);
      if (isReminderTab) {
        const sentCount = Array.isArray(result.results)
          ? result.results.filter((entry) => entry.sentSuccessfully).length
          : 0;
        setStatus(sentCount ? `Pickup reminder sent for ${sentCount} order${sentCount === 1 ? '' : 's'}.` : result.message || 'Pickup reminder processed.');
      } else {
        setStatus(result.message || 'Pickup notices sent successfully.');
      }
      setModalRows([]);
      await loadNotices(query);
    } catch (err) {
      setError(err.message || 'Unable to send pickup notices right now.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTemplate(payload) {
    setTemplateSaving(true);
    setError('');
    setStatus('');
    try {
      const result = await onCreatePickupNoticeTemplate(payload);
      setStatus(result.message || 'Pickup notice template created successfully.');
      await loadTemplates();
    } catch (err) {
      setError(err.message || 'Unable to create pickup notice template right now.');
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleUpdateTemplate(templateId, payload) {
    setTemplateSaving(true);
    setError('');
    setStatus('');
    try {
      const result = await onUpdatePickupNoticeTemplate(templateId, payload);
      setStatus(result.message || 'Pickup notice template updated successfully.');
      await loadTemplates();
    } catch (err) {
      setError(err.message || 'Unable to update pickup notice template right now.');
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleDeleteTemplate(templateId) {
    setTemplateSaving(true);
    setError('');
    setStatus('');
    try {
      const result = await onDeletePickupNoticeTemplate(templateId);
      setStatus(result.message || 'Pickup notice template deleted successfully.');
      await loadTemplates();
    } catch (err) {
      setError(err.message || 'Unable to delete pickup notice template right now.');
    } finally {
      setTemplateSaving(false);
    }
  }

  const listStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const listEnd = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);
  const viewTitle = isReminderTab ? 'Pickup Reminder' : 'Pickup Notices';
  const actionVerb = isReminderTab ? 'remind' : 'notify';
  const selectedActionLabel = selectedRows.length
    ? `${isReminderTab ? 'Remind' : 'Notify'} selected (${selectedRows.length})`
    : `Select items to ${actionVerb}`;
  const tabButtonClass = (tab) => (
    `inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
      activeTab === tab
        ? 'bg-[#46d2b8] text-[#0f1612] shadow-sm'
        : 'border border-[#d7d9cf] bg-white text-[#4f574c] hover:bg-[#f7f8f4]'
    }`
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-full border border-[#e4e6dc] bg-[#fbfbf8] p-2">
        <button type="button" className={tabButtonClass('notices')} onClick={() => switchTab('notices')}>
          <PickupNoticeTabIcon type="notices" />
          Pickup Notices
        </button>
	        <button type="button" className={tabButtonClass('reminders')} onClick={() => switchTab('reminders')}>
	          <PickupNoticeTabIcon type="reminders" />
	          Pickup Reminder
	        </button>
	        <button type="button" className={tabButtonClass('general')} onClick={() => switchTab('general')}>
	          <PickupNoticeTabIcon type="general" />
	          General Notices
	        </button>
        <button type="button" className={tabButtonClass('allocation')} onClick={() => switchTab('allocation')}>
          <PickupNoticeTabIcon type="allocation" />
          Pickup Allocation
	        </button>
        <button type="button" className={tabButtonClass('delivery-allocation')} onClick={() => switchTab('delivery-allocation')}>
          <PickupNoticeTabIcon type="allocation" />
          Delivery Allocation
	        </button>
        <button type="button" className={tabButtonClass('templates')} onClick={() => switchTab('templates')}>
          <PickupNoticeTabIcon type="templates" />
          Templates
	        </button>
	        <button type="button" className={tabButtonClass('locations')} onClick={() => switchTab('locations')}>
	          <PickupNoticeTabIcon type="locations" />
	          Locations
	        </button>
	      </div>

      {status ? <p className={ui.success}>{status}</p> : null}
      {error ? <p className={ui.error}>{error}</p> : null}

	      {activeTab === 'general' ? (
	        <GeneralNoticesPanel
	          onLoadCustomers={onLoadCustomers}
	          onSendGeneralNotices={onSendGeneralNotices}
	        />
	      ) : activeTab === 'locations' ? (
	        <AdminPickupLocationsPanel
	          onLoadPickupLocations={onLoadPickupLocations}
	          onCreatePickupLocation={onCreatePickupLocation}
	          onUpdatePickupLocation={onUpdatePickupLocation}
	          onDeletePickupLocation={onDeletePickupLocation}
	        />
	      ) : activeTab === 'templates' ? (
	        <PickupNoticeTemplateManager
          templates={templates}
          pickupLocations={pickupLocations}
          loading={loadingTemplates}
          saving={templateSaving}
          onCreate={handleCreateTemplate}
	          onUpdate={handleUpdateTemplate}
	          onDelete={handleDeleteTemplate}
	        />
	      ) : activeTab === 'allocation' ? (
	        <PickupAllocationPanel
	          templates={templates}
	          pickupLocations={pickupLocations}
	          produceOptions={produceOptions}
	          salesEventOptions={salesEventOptions}
          onLoadPendingSummary={onLoadPickupAllocationPendingSummary}
          onPreview={onPreviewPickupAllocation}
          onSend={onSendPickupNotices}
        />
      ) : activeTab === 'delivery-allocation' ? (
        <PickupAllocationPanel
          templates={templates}
          pickupLocations={pickupLocations}
          produceOptions={produceOptions}
          salesEventOptions={salesEventOptions}
          onLoadPendingSummary={onLoadPickupAllocationPendingSummary}
          onPreview={onPreviewPickupAllocation}
          onSend={onSendPickupNotices}
          fulfillmentMethod="DELIVERY"
        />
      ) : (
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">{viewTitle}</h1>
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
            <div className="xl:col-span-1 flex items-end">
              <button
                type="button"
                className={ui.buttonPrimary}
                onClick={() => setModalRows(selectedRows)}
                disabled={!selectedRows.length}
              >
                {selectedActionLabel}
              </button>
            </div>
          </div>

          <div className={ui.tableWrap}>
            <table className={`${ui.table} min-w-[1180px]`}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all visible items" disabled={!selectableRows.length} />
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
                  const noticeDisabled = isCompletedFulfillment(row);
                  return (
                    <tr key={rowKey} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <input
                          type="checkbox"
                          checked={!noticeDisabled && selectedKeys.includes(rowKey)}
                          onChange={() => toggleRow(row)}
                          aria-label={`Select ${row.displayOrderReference}`}
                          disabled={noticeDisabled}
                          title={noticeDisabled ? 'Fulfilment is already completed.' : undefined}
                        />
                      </td>
                      <td className={`${ui.tableCell} whitespace-nowrap`}>
                        <div className="flex items-center gap-2">
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
                          {row.fulfillmentMethod === 'PICKUP' && row.preferredPickupLocation ? (
                            <p className="truncate text-xs text-slate-500" title={row.preferredPickupLocation}>{row.preferredPickupLocation}</p>
                          ) : null}
                          <p className="text-xs text-slate-500">{row.noticeSentAt ? `Last sent ${formatDateTime(row.noticeSentAt)}` : 'Not sent yet'}</p>
                        </div>
                      </td>
                      <td className={ui.tableCell}>
                        <div className="max-w-[14rem] space-y-1">
                          <AdminStatusBadge value={formatLabel(row.noticeStatus)} tone={getNoticeTone(row.noticeStatus)} />
                          {noticeDisabled ? <AdminStatusBadge value="Fulfilment completed" tone="neutral" /> : null}
                          <p className="text-xs text-slate-500">{formatChannelSummary(row.noticeChannels)}</p>
                        </div>
                      </td>
                      <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                        <div className="flex justify-end gap-2">
	                          <AdminIconButton
	                            label={noticeDisabled ? 'Notice disabled' : row.noticeStatus === 'SENT' ? 'Resend notice' : 'Send notice'}
	                            onClick={() => setModalRows([row])}
	                            disabled={noticeDisabled}
	                            title={noticeDisabled ? 'Fulfilment completed.' : undefined}
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

            {!loading && rows.length === 0 ? (
              <AdminTableEmpty
                message="No rows."
              />
            ) : null}
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
      )}

      {modalRows.length ? (
        <NoticeModal
          rows={modalRows}
          templates={templates}
          onClose={() => setModalRows([])}
          onSubmit={handleSend}
          submitting={submitting}
          title={isReminderTab ? 'Send pickup reminder' : 'Send pickup notice'}
          submitLabel={isReminderTab ? 'Send reminder' : 'Send notice'}
          templateType={isReminderTab ? 'PICKUP_REMINDER' : 'PICKUP_NOTICE'}
        />
      ) : null}
    </section>
  );
}
