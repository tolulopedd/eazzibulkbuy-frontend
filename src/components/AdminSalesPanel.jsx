import { useEffect, useMemo, useRef, useState } from 'react';
import { ui } from '../ui/classes';
import {
  AdminIconButton,
  AdminPagination,
  AdminStatusBadge,
  AdminTableEmpty,
  CloseIcon,
  EyeIcon,
  PencilIcon,
} from './AdminTablePrimitives';

const SALES_ITEM_OPTIONS = ['Tomatoes', 'Red Habanero', 'Yellow Habanero', 'Chocolate Habanero', 'Green Bell Pepper', 'Crimson Pepper', 'Cayenne Pepper', 'Scorpion Pepper', 'Sheppard Pepper', 'Yam', 'Onion', 'Red Bell Pepper', 'Sweet potatoes', 'Ghost Pepper'];
const SALES_TYPE_OPTIONS = [
  { value: 'NORMAL_SALE', label: 'Normal Sale' },
  { value: 'BUNDLE_DISCOUNTED_SALE', label: 'Bundle Discounted Sale' },
];

function formatSaleTypeLabel(value) {
  return value === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle Discounted Sale' : 'Normal Sale';
}

function BundleItemsEditor({ bundleItems = [], onChange }) {
  function updateItem(index, field, value) {
    onChange(bundleItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    onChange([...bundleItems, { name: '', quantity: '1' }]);
  }

  function removeItem(index) {
    if (bundleItems.length <= 2) {
      return;
    }
    onChange(bundleItems.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className={`${ui.section} space-y-4`}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-900">Bundle items</h3>
        <p className="text-sm leading-6 text-slate-600">Add the items and quantities included in this discounted bundle.</p>
      </div>
      <div className="space-y-3">
        {bundleItems.map((item, index) => (
          <div key={`bundle-${index}`} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
            <select className={ui.select} value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)}>
              <option value="">Select bundled item</option>
              {SALES_ITEM_OPTIONS.map((itemName) => (
                <option key={`${itemName}-${index}`} value={itemName}>
                  {itemName}
                </option>
              ))}
            </select>
            <input
              className={ui.input}
              type="number"
              min="1"
              step="1"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              placeholder="Qty"
            />
            <button type="button" className={ui.buttonGhost} onClick={() => removeItem(index)} disabled={bundleItems.length <= 2}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={ui.buttonGhost} onClick={addItem}>
        Add bundled item
      </button>
    </div>
  );
}

function isEditableSalesItem(item) {
  return item.status === 'ACTIVE' && new Date(item.closingDate) > new Date();
}

function isDeletableSalesItem(item) {
  return isEditableSalesItem(item) && (item._count?.orders || 0) === 0;
}

function formatMoney(value) {
  return `CAD ${(value / 100).toFixed(2)}`;
}

function SalesDetailsModal({
  item,
  mode,
  editForm,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  saveLoadingId,
  deleteLoadingId,
  onDeleteItem,
  formatStatusLabel,
}) {
  if (!item) {
    return null;
  }

  const editing = mode === 'edit' && isEditableSalesItem(item);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 sm:items-center">
      <div className="absolute inset-0" onClick={onCancelEdit} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:max-h-[calc(100vh-3rem)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">{editing ? 'Edit sale' : 'Sale details'}</h2>
            <p className="text-sm text-slate-600">{item.name} · {formatMoney(item.pricePerUnit)} · closes {new Date(item.closingDate).toLocaleString()}</p>
          </div>
          <button type="button" className={ui.iconButton} onClick={onCancelEdit} aria-label="Close sales details">
            <CloseIcon />
          </button>
        </div>

        {editing ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-5">
                <div className={`${ui.section} space-y-4`}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Sales type</label>
                      <select className={ui.select} value={editForm.saleType} onChange={(e) => onEditFormChange('saleType', e.target.value)}>
                        {SALES_TYPE_OPTIONS.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Batch number</label>
                      <input
                        className={ui.input}
                        value={editForm.batchNumber}
                        maxLength={3}
                        placeholder="AZ1"
                        onChange={(e) => onEditFormChange('batchNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                      />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>{editForm.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle title' : 'Item name'}</label>
                      {editForm.saleType === 'BUNDLE_DISCOUNTED_SALE' ? (
                        <input
                          className={ui.input}
                          value={editForm.name}
                          placeholder="Tomatoes + Yam Bundle"
                          onChange={(e) => onEditFormChange('name', e.target.value)}
                        />
                      ) : (
                        <select className={ui.select} value={editForm.name} onChange={(e) => onEditFormChange('name', e.target.value)}>
                          <option value="">Select an item</option>
                          {SALES_ITEM_OPTIONS.map((itemName) => (
                            <option key={itemName} value={itemName}>
                              {itemName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>{editForm.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle price (CAD)' : 'Price per unit (CAD)'}</label>
                      <input className={ui.input} type="number" min="0.01" step="0.01" value={editForm.pricePerUnit} onChange={(e) => onEditFormChange('pricePerUnit', e.target.value)} />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Closing date &amp; Time</label>
                      <input className={ui.input} type="datetime-local" value={editForm.closingDate} onChange={(e) => onEditFormChange('closingDate', e.target.value)} />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Status</label>
                      <select className={ui.select} value={editForm.status} onChange={(e) => onEditFormChange('status', e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`${ui.section} space-y-4`}>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Location of sales</label>
                    <textarea className={ui.textarea} rows={2} value={editForm.pickupInstructions} onChange={(e) => onEditFormChange('pickupInstructions', e.target.value)} />
                  </div>

                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Item description</label>
                    <textarea className={ui.textarea} rows={3} value={editForm.description} onChange={(e) => onEditFormChange('description', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {editForm.saleType === 'BUNDLE_DISCOUNTED_SALE' ? (
                  <BundleItemsEditor bundleItems={editForm.bundleItems || []} onChange={(value) => onEditFormChange('bundleItems', value)} />
                ) : null}

                <div className={`${ui.section} space-y-4`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Delivery pricing</h3>
                      <p className="text-sm leading-6 text-slate-600">Adjust delivery charges for this sales window.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.deliveryEnabled)}
                        onChange={(e) => onEditFormChange('deliveryEnabled', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                      />
                      Delivery available
                    </label>
                  </div>

                  {editForm.deliveryEnabled ? (
                    <div className="grid gap-4">
                      <div className={ui.fieldWrap}>
                        <label className={ui.label}>Base quantity range</label>
                        <input className={ui.input} type="number" min="1" value={editForm.deliveryBaseRangeMax} onChange={(e) => onEditFormChange('deliveryBaseRangeMax', e.target.value)} />
                      </div>
                      <div className={ui.fieldWrap}>
                        <label className={ui.label}>Flat delivery price (CAD)</label>
                        <input className={ui.input} type="number" min="0" step="0.01" value={editForm.deliveryBasePrice} onChange={(e) => onEditFormChange('deliveryBasePrice', e.target.value)} />
                      </div>
                      <div className={ui.fieldWrap}>
                        <label className={ui.label}>Additional item fee (CAD)</label>
                        <input className={ui.input} type="number" min="0" step="0.01" value={editForm.deliveryAdditionalUnitPrice} onChange={(e) => onEditFormChange('deliveryAdditionalUnitPrice', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <p className={ui.note}>Pickup only for this sales event.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={ui.buttonPrimary} onClick={onSaveEdit} disabled={saveLoadingId === item.id}>
                {saveLoadingId === item.id ? 'Saving changes...' : 'Save changes'}
              </button>
              <button type="button" className={ui.buttonGhost} onClick={onCancelEdit}>Close</button>
              {isDeletableSalesItem(item) ? (
                <button type="button" className={ui.buttonDanger} onClick={() => onDeleteItem(item)} disabled={deleteLoadingId === item.id}>
                  {deleteLoadingId === item.id ? 'Deleting item...' : 'Delete item'}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Batch</p>
                <p className="text-base font-semibold text-slate-900">{item.batchNumber}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</p>
                <p className="text-base font-semibold text-slate-900">{formatSaleTypeLabel(item.saleType)}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Price</p>
                <p className="text-base font-semibold text-slate-900">{formatMoney(item.pricePerUnit)}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Orders</p>
                <p className="text-base font-semibold text-slate-900">{item._count?.orders || 0}</p>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                <div className="pt-1">
                  <AdminStatusBadge value={formatStatusLabel(item.status)} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} />
                </div>
              </div>
              <div className={ui.metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Closes</p>
                <p className="text-sm font-semibold text-slate-900">{new Date(item.closingDate).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className={`${ui.section} space-y-2`}>
                <p className="text-sm leading-6 text-slate-700">Location: <span className="font-semibold text-slate-900">{item.pickupInstructions || '—'}</span></p>
                <p className="text-sm leading-6 text-slate-700">Description: <span className="font-semibold text-slate-900">{item.description || '—'}</span></p>
                {item.saleType === 'BUNDLE_DISCOUNTED_SALE' && Array.isArray(item.bundleItemsJson) && item.bundleItemsJson.length ? (
                  <div className="pt-1 text-sm leading-6 text-slate-700">
                    Bundle contents:
                    <ul className="mt-1 list-disc pl-5 text-slate-900">
                      {item.bundleItemsJson.map((bundleItem, index) => (
                        <li key={`${bundleItem.name}-${index}`}>{bundleItem.quantity} × {bundleItem.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className={`${ui.section} space-y-2`}>
                <p className="text-sm leading-6 text-slate-700">
                  Fulfilment: <span className="font-semibold text-slate-900">{item.deliveryEnabled
                    ? `Pickup or delivery (up to ${item.deliveryBaseRangeMax} items for ${formatMoney(item.deliveryBasePrice)}, then ${formatMoney(item.deliveryAdditionalUnitPrice)} per extra item)`
                    : 'Pickup only'}</span>
                </p>
                {!isEditableSalesItem(item) ? <p className={ui.note}>Inactive or expired sales are view-only and cannot be changed.</p> : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSalesPanel({
  form,
  onFormChange,
  createLoading,
  createStatus,
  onCreate,
  salesQuery,
  onSalesQueryChange,
  loadingSalesItems,
  onApplyFilters,
  salesMeta,
  salesItemError,
  actionStatus,
  salesItems,
  editingId,
  editForm,
  onEditFormChange,
  saveLoadingId,
  deleteLoadingId,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDeleteItem,
  onPrevPage,
  onNextPage,
  formatStatusLabel,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSalesItem, setSelectedSalesItem] = useState(null);
  const [selectedMode, setSelectedMode] = useState('view');
  const didInitFiltersRef = useRef(false);

  const activeSalesItems = useMemo(
    () => salesItems.filter((item) => item.status === 'ACTIVE' && new Date(item.closingDate) > new Date()),
    [salesItems],
  );
  const closedSalesItems = useMemo(
    () => salesItems.filter((item) => item.status !== 'ACTIVE' || new Date(item.closingDate) <= new Date()),
    [salesItems],
  );

  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      onApplyFilters();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [salesQuery.q, salesQuery.batchNumber]);

  function openSalesItem(item, mode) {
    if (mode === 'edit') {
      onStartEdit(item);
    } else {
      onCancelEdit();
    }
    setSelectedSalesItem(item);
    setSelectedMode(mode);
  }

  function closeSalesItemModal() {
    setSelectedSalesItem(null);
    setSelectedMode('view');
    onCancelEdit();
  }

  function renderSalesTable(title, items, tone) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-emerald-950">{title}</h2>
          <AdminStatusBadge value={String(items.length)} tone={tone} />
        </div>

        <div className={ui.tableWrap}>
          <table className={`${ui.table} min-w-[980px]`}>
            <thead>
              <tr className={ui.tableHeadRow}>
                <th className={ui.tableHeaderCell}>Item</th>
                <th className={ui.tableHeaderCell}>Batch</th>
                <th className={ui.tableHeaderCell}>Type</th>
                <th className={ui.tableHeaderCell}>Price</th>
                <th className={ui.tableHeaderCell}>Orders</th>
                <th className={ui.tableHeaderCell}>Closing date</th>
                <th className={ui.tableHeaderCell}>Status</th>
                <th className={`${ui.tableHeaderCell} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={ui.tableRow}>
                  <td className={ui.tableCell}>
                    <div className="max-w-[14rem] space-y-0.5">
                      <p className="truncate font-semibold text-slate-900" title={item.name}>{item.name}</p>
                      <p
                        className="truncate text-xs text-slate-500"
                        title={item.description || item.pickupInstructions || 'No extra details yet'}
                      >
                        {item.description || item.pickupInstructions || 'No extra details yet'}
                      </p>
                    </div>
                  </td>
                  <td className={`${ui.tableCell} font-medium text-slate-900`}>{item.batchNumber}</td>
                  <td className={ui.tableCell}>
                    <AdminStatusBadge value={formatSaleTypeLabel(item.saleType)} tone={item.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'warning' : 'info'} />
                  </td>
                  <td className={`${ui.tableCell} font-semibold text-slate-900`}>{formatMoney(item.pricePerUnit)}</td>
                  <td className={ui.tableCell}>{item._count?.orders || 0}</td>
                  <td className={ui.tableCell}>{new Date(item.closingDate).toLocaleString()}</td>
                  <td className={ui.tableCell}>
                    <AdminStatusBadge value={formatStatusLabel(item.status)} tone={isEditableSalesItem(item) ? 'success' : 'neutral'} />
                  </td>
                  <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                    <div className="flex justify-end gap-2">
                      <AdminIconButton label="View sale" onClick={() => openSalesItem(item, 'view')}>
                        <EyeIcon />
                      </AdminIconButton>
                      {isEditableSalesItem(item) ? (
                        <AdminIconButton label="Edit sale" onClick={() => openSalesItem(item, 'edit')}>
                          <PencilIcon />
                        </AdminIconButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loadingSalesItems && items.length === 0 ? (
            <AdminTableEmpty message={title === 'Active Sales' ? 'No active sales are available right now.' : 'No closed sales are available right now.'} />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Sales Events</h1>
            <p className="leading-6 text-slate-600">Manage normal sales and bundle discounted sales events in a structured table view.</p>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Close Create Sales Event' : 'Create Sales Event'}
          </button>
        </div>

        {showCreateForm ? (
          <form className={`${ui.section} space-y-5`} onSubmit={onCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Sales type</label>
                <select className={ui.select} value={form.saleType} onChange={(e) => onFormChange('saleType', e.target.value)}>
                  {SALES_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Batch number</label>
                <input
                  className={ui.input}
                  placeholder="AZ1"
                  required
                  maxLength={3}
                  value={form.batchNumber}
                  onChange={(e) => onFormChange('batchNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>{form.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle title' : 'Item name'}</label>
                {form.saleType === 'BUNDLE_DISCOUNTED_SALE' ? (
                  <input
                    className={ui.input}
                    placeholder="Tomatoes + Yam Bundle"
                    required
                    value={form.name}
                    onChange={(e) => onFormChange('name', e.target.value)}
                  />
                ) : (
                  <select className={ui.select} required value={form.name} onChange={(e) => onFormChange('name', e.target.value)}>
                    <option value="">Select an item</option>
                    {SALES_ITEM_OPTIONS.map((itemName) => (
                      <option key={itemName} value={itemName}>
                        {itemName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>{form.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle price (CAD)' : 'Price per unit (CAD)'}</label>
                <input className={ui.input} type="number" min="0.01" step="0.01" placeholder="25.00" required value={form.pricePerUnit} onChange={(e) => onFormChange('pricePerUnit', e.target.value)} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Closing date &amp; Time</label>
                <input className={ui.input} type="datetime-local" required value={form.closingDate} onChange={(e) => onFormChange('closingDate', e.target.value)} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Status</label>
                <select className={ui.select} value={form.status} onChange={(e) => onFormChange('status', e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Item description</label>
              <textarea className={ui.textarea} rows={3} placeholder="Describe the item and include the size for each unit." value={form.description} onChange={(e) => onFormChange('description', e.target.value)} />
            </div>
            {form.saleType === 'BUNDLE_DISCOUNTED_SALE' ? (
              <BundleItemsEditor bundleItems={form.bundleItems || []} onChange={(value) => onFormChange('bundleItems', value)} />
            ) : null}
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Location of sales</label>
              <textarea className={ui.textarea} rows={2} placeholder="Winnipeg Manitoba" value={form.pickupInstructions} onChange={(e) => onFormChange('pickupInstructions', e.target.value)} />
            </div>
            <div className={`${ui.section} space-y-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Delivery pricing</h3>
                  <p className="text-sm leading-6 text-slate-600">Set delivery charges for this sales window.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={Boolean(form.deliveryEnabled)} onChange={(e) => onFormChange('deliveryEnabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-emerald-700" />
                  Delivery available
                </label>
              </div>
              {form.deliveryEnabled ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Base quantity range</label>
                    <input className={ui.input} type="number" min="1" value={form.deliveryBaseRangeMax} onChange={(e) => onFormChange('deliveryBaseRangeMax', e.target.value)} />
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Flat delivery price (CAD)</label>
                    <input className={ui.input} type="number" min="0" step="0.01" value={form.deliveryBasePrice} onChange={(e) => onFormChange('deliveryBasePrice', e.target.value)} />
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Additional item fee (CAD)</label>
                    <input className={ui.input} type="number" min="0" step="0.01" value={form.deliveryAdditionalUnitPrice} onChange={(e) => onFormChange('deliveryAdditionalUnitPrice', e.target.value)} />
                  </div>
                </div>
              ) : (
                <p className={ui.note}>Pickup only for this sales event.</p>
              )}
            </div>

            <div className="flex justify-center pt-1">
              <button type="submit" className={`${ui.buttonPrimary} min-w-44`} disabled={createLoading}>
                {createLoading ? 'Creating sales event...' : 'Create Sales Event'}
              </button>
            </div>
            {createStatus ? <p className={ui.success}>{createStatus}</p> : null}
          </form>
        ) : null}

        <div className={`${ui.filterPanel} grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_260px]`}>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Search</label>
            <input
              className={ui.input}
              value={salesQuery.q}
              onChange={(e) => onSalesQueryChange('q', e.target.value)}
              placeholder="Item name, batch number, description"
            />
          </div>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Batch number</label>
            <input
              className={ui.input}
              value={salesQuery.batchNumber || ''}
              maxLength={3}
              onChange={(e) => onSalesQueryChange('batchNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
              placeholder="AZ1"
            />
          </div>
          <div className="xl:col-span-2">
            <p className="text-sm text-slate-500">Filters update automatically as you type.</p>
          </div>
        </div>
      </section>

      <section className={`${ui.card} space-y-5`}>
        {salesItemError ? <p className={ui.error}>{salesItemError}</p> : null}
        {actionStatus ? <p className={ui.success}>{actionStatus}</p> : null}

        {renderSalesTable('Active Sales', activeSalesItems, 'success')}
        {renderSalesTable('Closed Sales', closedSalesItems, 'neutral')}

        {salesMeta.totalPages > 1 ? (
          <AdminPagination
            page={salesMeta.page}
            totalPages={salesMeta.totalPages}
            total={salesMeta.total}
            label={`Page ${salesMeta.page} of ${salesMeta.totalPages}`}
            onPrev={onPrevPage}
            onNext={onNextPage}
          />
        ) : null}
      </section>

      <SalesDetailsModal
        item={selectedSalesItem}
        mode={selectedMode}
        editForm={editForm}
        onEditFormChange={onEditFormChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={closeSalesItemModal}
        saveLoadingId={saveLoadingId}
        deleteLoadingId={deleteLoadingId}
        onDeleteItem={onDeleteItem}
        formatStatusLabel={formatStatusLabel}
      />
    </section>
  );
}
