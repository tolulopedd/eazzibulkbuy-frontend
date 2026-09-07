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
  noticeStatus: '',
  sortBy: 'paidAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

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

const DEFAULT_TEMPLATE_FORM = {
  name: '',
  address: '',
  readyDate: formatDateInputValue(),
  timeWindow: '2:00 PM - 5:00 PM',
  emailSubject: 'Your order is ready for pickup',
  emailBody: DEFAULT_PICKUP_EMAIL_BODY,
  instructions: '',
  sortOrder: '0',
  isActive: true,
};

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
      address: template.address || '',
      readyDate: template.readyDate || formatDateInputValue(),
      timeWindow: template.timeWindow || '',
      emailSubject: template.emailSubject || 'Your order is ready for pickup',
      emailBody: template.emailBody || DEFAULT_PICKUP_EMAIL_BODY,
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

      <form className="grid gap-3 rounded-[24px] border border-[#e5e7de] bg-white p-4 xl:grid-cols-[1fr_1fr_150px_170px_90px_120px]" onSubmit={handleCreate}>
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Template name</label>
          <input className={ui.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Sage Creek Aug 29 afternoon" />
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
        <div className="xl:col-span-6">
          <label className={ui.label}>Subject</label>
          <input className={ui.input} value={form.emailSubject} onChange={(event) => setForm((current) => ({ ...current, emailSubject: event.target.value }))} placeholder="Your order is ready for pickup" />
        </div>
        <div className="xl:col-span-6">
          <label className={ui.label}>Email details</label>
          <textarea className={ui.textarea} rows={10} value={form.emailBody} onChange={(event) => setForm((current) => ({ ...current, emailBody: event.target.value }))} />
        </div>
        <div className="xl:col-span-5">
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
                      <span className="block max-w-[16rem] truncate" title={template.emailSubject || 'Your order is ready for pickup'}>{template.emailSubject || 'Your order is ready for pickup'}</span>
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    {isEditing ? (
                      <textarea className={ui.textarea} rows={8} value={editForm.emailBody} onChange={(event) => setEditForm((current) => ({ ...current, emailBody: event.target.value }))} />
                    ) : (
                      <span className="block max-h-[4.5rem] max-w-[20rem] overflow-hidden whitespace-pre-wrap text-xs leading-5 text-slate-600">{template.emailBody || DEFAULT_PICKUP_EMAIL_BODY}</span>
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

function NoticeModal({ rows, templates, onClose, onSubmit, submitting }) {
  const activeTemplates = templates.filter((template) => template.isActive !== false);
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
          <div className="grid gap-4">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Message template</label>
              <select className={ui.select} value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">Select pickup notice template</option>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              {!activeTemplates.length ? (
                <p className="text-xs text-amber-700">No active pickup notice templates are available. Add one in Pickup notice templates first.</p>
              ) : null}
            </div>
            {selectedTemplate ? (
              <div className={`${ui.section} space-y-3 bg-emerald-50/60`}>
                <p className="text-sm font-semibold text-emerald-950">Template preview</p>
                <div className="grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
                  <p><span className="font-semibold text-slate-900">Pickup address / location:</span><br />{selectedTemplate.address}</p>
                  <p><span className="font-semibold text-slate-900">Ready date:</span><br />{formatDisplayDate(selectedTemplate.readyDate)}</p>
                  <p><span className="font-semibold text-slate-900">Time window:</span><br />{selectedTemplate.timeWindow}</p>
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  <span className="font-semibold text-slate-900">Subject:</span><br />
                  {selectedTemplate.emailSubject || 'Your order is ready for pickup'}
                </p>
                <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                  {selectedTemplate.emailBody || DEFAULT_PICKUP_EMAIL_BODY}
                </p>
                {selectedTemplate.instructions ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-900">Instructions:</span><br />
                    {selectedTemplate.instructions}
                  </p>
                ) : null}
              </div>
            ) : null}
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

export default function AdminPickupNoticesPanel({
  onLoadPickupNotices,
  onLoadPickupNoticeTemplates,
  onCreatePickupNoticeTemplate,
  onUpdatePickupNoticeTemplate,
  onDeletePickupNoticeTemplate,
  onSendPickupNotices,
  pickupLocations = [],
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
  }, [query.startDate, query.endDate, query.q, query.batchNumber, query.location, query.fulfillmentMethod, query.noticeStatus]);

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
  const tabButtonClass = (tab) => (
    `rounded-full px-5 py-2.5 text-sm font-semibold transition ${
      activeTab === tab
        ? 'bg-[#46d2b8] text-[#0f1612] shadow-sm'
        : 'border border-[#d7d9cf] bg-white text-[#4f574c] hover:bg-[#f7f8f4]'
    }`
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-full border border-[#e4e6dc] bg-[#fbfbf8] p-2">
        <button type="button" className={tabButtonClass('notices')} onClick={() => setActiveTab('notices')}>
          Pickup Notices
        </button>
        <button type="button" className={tabButtonClass('templates')} onClick={() => setActiveTab('templates')}>
          Templates
        </button>
      </div>

      {status ? <p className={ui.success}>{status}</p> : null}
      {error ? <p className={ui.error}>{error}</p> : null}

      {activeTab === 'templates' ? (
        <PickupNoticeTemplateManager
          templates={templates}
          pickupLocations={pickupLocations}
          loading={loadingTemplates}
          saving={templateSaving}
          onCreate={handleCreateTemplate}
          onUpdate={handleUpdateTemplate}
          onDelete={handleDeleteTemplate}
        />
      ) : (
      <section className={ui.card}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Pickup Notices</h1>
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
                            label={noticeDisabled ? 'Notice disabled because fulfilment is completed' : row.noticeStatus === 'SENT' ? 'Resend notice' : 'Send notice'}
                            onClick={() => setModalRows([row])}
                            disabled={noticeDisabled}
                            title={noticeDisabled ? 'Fulfilment is already completed. Notice cannot be sent.' : undefined}
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
      )}

      {modalRows.length ? (
        <NoticeModal rows={modalRows} templates={templates} onClose={() => setModalRows([])} onSubmit={handleSend} submitting={submitting} />
      ) : null}
    </section>
  );
}
