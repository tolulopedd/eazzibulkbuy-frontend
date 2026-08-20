import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import { AdminStatusBadge, AdminTableEmpty } from './AdminTablePrimitives';

const DEFAULT_FORM = {
  name: '',
  sortOrder: '0',
  isActive: true,
};

function normalizeSortOrder(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

export default function AdminPickupLocationsPanel({
  onLoadPickupLocations,
  onCreatePickupLocation,
  onUpdatePickupLocation,
  onDeletePickupLocation,
}) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(DEFAULT_FORM);

  async function loadLocations() {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadPickupLocations();
      setLocations(response.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load pickup locations right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const result = await onCreatePickupLocation({
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      });
      setStatus(result.message || 'Pickup location created successfully.');
      setForm(DEFAULT_FORM);
      await loadLocations();
    } catch (err) {
      setError(err.message || 'Unable to create pickup location right now.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(location) {
    setEditingId(location.id);
    setEditForm({
      name: location.name || '',
      sortOrder: String(location.sortOrder || 0),
      isActive: Boolean(location.isActive),
    });
    setStatus('');
    setError('');
  }

  async function handleSaveEdit() {
    if (!editingId) {
      return;
    }

    setSaving(true);
    setStatus('');
    setError('');
    try {
      const result = await onUpdatePickupLocation(editingId, {
        name: editForm.name.trim(),
        sortOrder: Number(editForm.sortOrder || 0),
        isActive: editForm.isActive,
      });
      setStatus(result.message || 'Pickup location updated successfully.');
      setEditingId('');
      await loadLocations();
    } catch (err) {
      setError(err.message || 'Unable to update pickup location right now.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(location) {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const result = await onUpdatePickupLocation(location.id, {
        isActive: !location.isActive,
      });
      setStatus(result.message || 'Pickup location updated successfully.');
      if (editingId === location.id) {
        setEditingId('');
      }
      await loadLocations();
    } catch (err) {
      setError(err.message || 'Unable to update pickup location right now.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(location) {
    if (!window.confirm(`Delete "${location.name}"? Existing order records will keep their saved text.`)) {
      return;
    }

    setSaving(true);
    setStatus('');
    setError('');
    try {
      const result = await onDeletePickupLocation(location.id);
      setStatus(result.message || 'Pickup location deleted successfully.');
      if (editingId === location.id) {
        setEditingId('');
      }
      await loadLocations();
    } catch (err) {
      setError(err.message || 'Unable to delete pickup location right now.');
    } finally {
      setSaving(false);
    }
  }

  const formIsValid = form.name.trim().length >= 2;
  const editFormIsValid = editForm.name.trim().length >= 2;

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-[2rem] font-bold tracking-tight text-[#171a16]">Pickup Locations</h1>
          <p className={ui.note}>Manage the active pickup locations used in buyer checkout, Pickup Notices, Payments, and Fulfilment.</p>
        </div>

        <form className="grid gap-4 rounded-[26px] border border-[#e5e7de] bg-[#fafbf7] p-4 sm:grid-cols-[minmax(0,1fr)_140px_150px_auto]" onSubmit={handleCreate}>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Location name</label>
            <input
              className={ui.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Add pickup location"
            />
          </div>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Sort order</label>
            <input
              className={ui.input}
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: normalizeSortOrder(event.target.value) }))}
              placeholder="0"
            />
          </div>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Status</label>
            <select
              className={ui.select}
              value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'ACTIVE' }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className={ui.buttonPrimary} disabled={saving || !formIsValid}>
              {saving ? 'Adding...' : formIsValid ? 'Add' : 'Fill the details to Add'}
            </button>
          </div>
        </form>

        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr className={ui.tableHeadRow}>
                <th className={ui.tableHeaderCell}>Pickup Location</th>
                <th className={ui.tableHeaderCell}>Sort</th>
                <th className={ui.tableHeaderCell}>Status</th>
                <th className={ui.tableHeaderCell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {locations.length ? (
                locations.map((location) => {
                  const isEditing = editingId === location.id;

                  return (
                    <tr key={location.id} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        {isEditing ? (
                          <input
                            className={ui.input}
                            value={editForm.name}
                            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                          />
                        ) : (
                          <span className="font-semibold text-[#171a16]">{location.name}</span>
                        )}
                      </td>
                      <td className={ui.tableCell}>
                        {isEditing ? (
                          <input
                            className={ui.input}
                            inputMode="numeric"
                            value={editForm.sortOrder}
                            onChange={(event) => setEditForm((current) => ({ ...current, sortOrder: normalizeSortOrder(event.target.value) }))}
                          />
                        ) : (
                          location.sortOrder || 0
                        )}
                      </td>
                      <td className={ui.tableCell}>
                        {isEditing ? (
                          <select
                            className={ui.select}
                            value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                            onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.value === 'ACTIVE' }))}
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        ) : (
                          <AdminStatusBadge value={location.isActive ? 'Active' : 'Inactive'} tone={location.isActive ? 'success' : 'neutral'} />
                        )}
                      </td>
                      <td className={ui.tableCell}>
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button type="button" className={ui.buttonPrimary} disabled={saving || !editFormIsValid} onClick={handleSaveEdit}>
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button type="button" className={ui.buttonGhost} onClick={() => setEditingId('')}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className={ui.buttonGhost} onClick={() => startEdit(location)}>
                                Edit
                              </button>
                              <button type="button" className={ui.buttonGhost} onClick={() => handleToggleActive(location)} disabled={saving}>
                                {location.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button type="button" className={ui.buttonDanger} onClick={() => handleDelete(location)} disabled={saving}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className={ui.tableRow}>
                  <td className={ui.tableCell} colSpan={4}>
                    <AdminTableEmpty title={loading ? 'Loading pickup locations...' : 'No pickup locations found.'} description="Add a pickup location to make it available automatically in the buyer and admin flows." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
