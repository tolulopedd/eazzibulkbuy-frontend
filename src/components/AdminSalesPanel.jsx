import { useMemo, useState } from 'react';
import { ui } from '../ui/classes';

const SALES_ITEM_OPTIONS = ['Tomatoes', 'Habanero', 'Green Pepper', 'Sepherd Pepper', 'Yam', 'Onion', 'Ghost Pepper'];

function isEditableSalesItem(item) {
  return item.status === 'ACTIVE' && new Date(item.closingDate) > new Date();
}

function isDeletableSalesItem(item) {
  return isEditableSalesItem(item) && (item._count?.orders || 0) === 0;
}

export default function AdminSalesPanel({
  form,
  onFormChange,
  createLoading,
  createStatus,
  onCreate,
  loadingSalesItems,
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
  const activeSalesItems = useMemo(
    () => salesItems.filter((item) => item.status === 'ACTIVE' && new Date(item.closingDate) > new Date()),
    [salesItems],
  );
  const closedSalesItems = useMemo(
    () => salesItems.filter((item) => item.status !== 'ACTIVE' || new Date(item.closingDate) <= new Date()),
    [salesItems],
  );

  function renderSalesRow(item) {
    return (
      <div key={item.id} className="space-y-4 px-4 py-4 first:pt-4 last:pb-4">
        <button
          type="button"
          className="flex w-full flex-col gap-3 text-left transition sm:flex-row sm:items-center sm:justify-between"
          onClick={() => {
            if (editingId === item.id) {
              onCancelEdit();
              return;
            }
            onStartEdit(item);
          }}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-slate-900">{item.name}</p>
            <p className="text-sm text-slate-600">
              CAD {(item.pricePerUnit / 100).toFixed(2)} · {formatStatusLabel(item.status)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {(item._count?.orders || 0) === 1 ? '1 order' : `${item._count?.orders || 0} orders`}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              Closes {new Date(item.closingDate).toLocaleString()}
            </span>
            {isEditableSalesItem(item) ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">Edit</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">View</span>
            )}
          </div>
        </button>

        {editingId === item.id ? (
          <>
            {isEditableSalesItem(item) ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Item name</label>
                    <select className={ui.select} value={editForm.name} onChange={(e) => onEditFormChange('name', e.target.value)}>
                      <option value="">Select an item</option>
                      {SALES_ITEM_OPTIONS.map((itemName) => (
                        <option key={itemName} value={itemName}>
                          {itemName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Price per unit (CAD)</label>
                    <input
                      className={ui.input}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="25.00"
                      value={editForm.pricePerUnit}
                      onChange={(e) => onEditFormChange('pricePerUnit', e.target.value)}
                    />
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Closing date &amp; Time</label>
                    <input
                      className={ui.input}
                      type="datetime-local"
                      value={editForm.closingDate}
                      onChange={(e) => onEditFormChange('closingDate', e.target.value)}
                    />
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Status</label>
                    <select className={ui.select} value={editForm.status} onChange={(e) => onEditFormChange('status', e.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className={ui.fieldWrap}>
                  <label className={ui.label}>Location of sales</label>
                  <textarea
                    className={ui.textarea}
                    rows={2}
                    placeholder="Winnipeg Manitoba"
                    value={editForm.pickupInstructions}
                    onChange={(e) => onEditFormChange('pickupInstructions', e.target.value)}
                  />
                </div>

                <div className={ui.fieldWrap}>
                  <label className={ui.label}>Item description</label>
                  <textarea
                    className={ui.textarea}
                    rows={3}
                    placeholder="Describe the item and include the size for each unit."
                    value={editForm.description}
                    onChange={(e) => onEditFormChange('description', e.target.value)}
                  />
                </div>

                <div className={`${ui.section} space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
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
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className={ui.fieldWrap}>
                        <label className={ui.label}>Base quantity range</label>
                        <input
                          className={ui.input}
                          type="number"
                          min="1"
                          value={editForm.deliveryBaseRangeMax}
                          onChange={(e) => onEditFormChange('deliveryBaseRangeMax', e.target.value)}
                        />
                      </div>
                      <div className={ui.fieldWrap}>
                        <label className={ui.label}>Flat delivery price (CAD)</label>
                        <input
                          className={ui.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.deliveryBasePrice}
                          onChange={(e) => onEditFormChange('deliveryBasePrice', e.target.value)}
                        />
                      </div>
                      <div className={ui.fieldWrap}>
                        <label className={ui.label}>Additional item fee (CAD)</label>
                        <input
                          className={ui.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.deliveryAdditionalUnitPrice}
                          onChange={(e) => onEditFormChange('deliveryAdditionalUnitPrice', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className={ui.note}>Pickup only for this bulk sale.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" className={`${ui.buttonPrimary} min-w-32`} onClick={onSaveEdit} disabled={saveLoadingId === item.id}>
                    {saveLoadingId === item.id ? 'Saving changes...' : 'Save changes'}
                  </button>
                  <button type="button" className={ui.buttonGhost} onClick={onCancelEdit}>Close</button>
                  {isDeletableSalesItem(item) ? (
                    <button
                      type="button"
                      className={ui.buttonDanger}
                      onClick={() => onDeleteItem(item)}
                      disabled={deleteLoadingId === item.id}
                    >
                      {deleteLoadingId === item.id ? 'Deleting item...' : 'Delete item'}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm leading-6 text-slate-700">Price: CAD {(item.pricePerUnit / 100).toFixed(2)}</p>
                  <p className="text-sm leading-6 text-slate-700">Status: {formatStatusLabel(item.status)}</p>
                  <p className="text-sm leading-6 text-slate-700">Closes: {new Date(item.closingDate).toLocaleString()}</p>
                  {item.pickupInstructions ? <p className="text-sm leading-6 text-slate-700">Location: {item.pickupInstructions}</p> : null}
                  <p className="text-sm leading-6 text-slate-700">
                    Fulfilment: {item.deliveryEnabled
                      ? `Pickup or delivery (up to ${item.deliveryBaseRangeMax} items for CAD ${(item.deliveryBasePrice / 100).toFixed(2)}, then CAD ${(item.deliveryAdditionalUnitPrice / 100).toFixed(2)} per extra item)`
                      : 'Pickup only'}
                  </p>
                </div>
                {item.description ? <p className="text-sm leading-6 text-slate-700">Description: {item.description}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={ui.buttonGhost} onClick={onCancelEdit}>Close</button>
                </div>
                <p className={ui.note}>Inactive or expired sales are view-only and cannot be changed.</p>
              </>
            )}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Bulk Sales</h1>
            <p className="leading-6 text-slate-600">Create new sales only when needed and manage existing active or closed sales below.</p>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Close Create Sales' : 'Create Sales'}
          </button>
        </div>

        {showCreateForm ? (
          <form className={`${ui.section} space-y-5`} onSubmit={onCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Item name</label>
                <select className={ui.select} required value={form.name} onChange={(e) => onFormChange('name', e.target.value)}>
                  <option value="">Select an item</option>
                  {SALES_ITEM_OPTIONS.map((itemName) => (
                    <option key={itemName} value={itemName}>
                      {itemName}
                    </option>
                  ))}
                </select>
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Price per unit (CAD)</label>
                <input
                  className={ui.input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="25.00"
                  required
                  value={form.pricePerUnit}
                  onChange={(e) => onFormChange('pricePerUnit', e.target.value)}
                />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Closing date &amp; Time</label>
                <input
                  className={ui.input}
                  type="datetime-local"
                  required
                  value={form.closingDate}
                  onChange={(e) => onFormChange('closingDate', e.target.value)}
                />
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
              <textarea
                className={ui.textarea}
                rows={3}
                placeholder="Describe the item and include the size for each unit."
                value={form.description}
                onChange={(e) => onFormChange('description', e.target.value)}
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Location of sales</label>
              <textarea
                className={ui.textarea}
                rows={2}
                placeholder="Winnipeg Manitoba"
                value={form.pickupInstructions}
                onChange={(e) => onFormChange('pickupInstructions', e.target.value)}
              />
            </div>
            <div className={`${ui.section} space-y-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Delivery pricing</h3>
                  <p className="text-sm leading-6 text-slate-600">Set delivery charges for this sales window.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.deliveryEnabled)}
                    onChange={(e) => onFormChange('deliveryEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                  />
                  Delivery available
                </label>
              </div>

              {form.deliveryEnabled ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Base quantity range</label>
                    <input
                      className={ui.input}
                      type="number"
                      min="1"
                      value={form.deliveryBaseRangeMax}
                      onChange={(e) => onFormChange('deliveryBaseRangeMax', e.target.value)}
                    />
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Flat delivery price (CAD)</label>
                    <input
                      className={ui.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.deliveryBasePrice}
                      onChange={(e) => onFormChange('deliveryBasePrice', e.target.value)}
                    />
                  </div>
                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Additional item fee (CAD)</label>
                    <input
                      className={ui.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.deliveryAdditionalUnitPrice}
                      onChange={(e) => onFormChange('deliveryAdditionalUnitPrice', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className={ui.note}>Pickup only for this bulk sale.</p>
              )}
            </div>

            <div className="flex justify-center pt-1">
              <button type="submit" className={`${ui.buttonPrimary} min-w-44`} disabled={createLoading}>
                {createLoading ? 'Creating sales...' : 'Create Sales'}
              </button>
            </div>
            {createStatus ? <p className={ui.success}>{createStatus}</p> : null}
          </form>
        ) : null}
      </section>

      <section className={`${ui.card} space-y-5`}>
        {salesItemError ? <p className={ui.error}>{salesItemError}</p> : null}
        {actionStatus ? <p className={ui.success}>{actionStatus}</p> : null}

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-emerald-950">Active Sales</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{activeSalesItems.length}</span>
            </div>
            {activeSalesItems.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {activeSalesItems.map((item, index) => (
                  <div key={item.id} className={index > 0 ? 'border-t border-slate-200' : ''}>
                    {renderSalesRow(item)}
                  </div>
                ))}
              </div>
            ) : <p className={ui.note}>No active sales match your filters.</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-emerald-950">Closed Sales</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{closedSalesItems.length}</span>
            </div>
            {closedSalesItems.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {closedSalesItems.map((item, index) => (
                  <div key={item.id} className={index > 0 ? 'border-t border-slate-200' : ''}>
                    {renderSalesRow(item)}
                  </div>
                ))}
              </div>
            ) : <p className={ui.note}>No closed or inactive sales match your filters.</p>}
          </div>
        </div>

        {!loadingSalesItems && salesItems.length === 0 ? <p className={ui.note}>No sales items match your filters.</p> : null}

        {salesMeta.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className={ui.buttonGhost} onClick={onPrevPage} disabled={loadingSalesItems || salesMeta.page <= 1}>
              Previous page
            </button>
            <p className="text-sm text-slate-600">Page {salesMeta.page} of {salesMeta.totalPages}</p>
            <button
              type="button"
              className={ui.buttonGhost}
              onClick={onNextPage}
              disabled={loadingSalesItems || salesMeta.page >= salesMeta.totalPages}
            >
              Next page
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
