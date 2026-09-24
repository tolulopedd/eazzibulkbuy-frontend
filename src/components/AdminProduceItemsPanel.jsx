import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';
import { AdminStatusBadge, AdminTableEmpty } from './AdminTablePrimitives';

const DEFAULT_FORM = {
  name: '',
  sortOrder: '0',
  isActive: true,
};
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function normalizeSortOrder(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

function validateImageFile(file) {
  if (!file) return 'Select an image before saving.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG, or WebP image.';
  if (file.size > MAX_IMAGE_SIZE_BYTES) return 'Image must be 5MB or smaller.';
  return '';
}

function ImagePreview({ src, name }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-14 w-20 items-center justify-center rounded-2xl border border-[#e5e7de] bg-[#f6f7f2] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7c8376]">
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name || 'Produce'} preview`}
      className="h-14 w-20 rounded-2xl border border-[#e5e7de] bg-white object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function AdminProduceItemsPanel({
  onLoadProduceItems,
  onCreateProduceItem,
  onUploadProduceImage,
  onUpdateProduceItem,
  onDeleteProduceItem,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState('');

  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    if (editImagePreviewUrl) URL.revokeObjectURL(editImagePreviewUrl);
  }, [imagePreviewUrl, editImagePreviewUrl]);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const response = await onLoadProduceItems();
      setItems(response.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load produce items right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function handleCreateImageChange(file) {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file || null);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : '');
  }

  function handleEditImageChange(file) {
    if (editImagePreviewUrl) URL.revokeObjectURL(editImagePreviewUrl);
    setEditImageFile(file || null);
    setEditImagePreviewUrl(file ? URL.createObjectURL(file) : '');
  }

  async function uploadProduceImage(file) {
    const validationError = validateImageFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const uploadTarget = await onUploadProduceImage(file);
    return uploadTarget.imageUrl;
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const imageUrl = await uploadProduceImage(imageFile);
      const result = await onCreateProduceItem({
        name: form.name.trim(),
        imageUrl,
        fallbackUrl: null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      });
      setStatus(result.message || 'Produce item created successfully.');
      setForm(DEFAULT_FORM);
      handleCreateImageChange(null);
      await loadItems();
    } catch (err) {
      setError(err.message || 'Unable to create produce item right now.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      name: item.name || '',
      sortOrder: String(item.sortOrder || 0),
      isActive: Boolean(item.isActive),
    });
    handleEditImageChange(null);
    setStatus('');
    setError('');
  }

  async function handleSaveEdit() {
    if (!editingId) return;

    setSaving(true);
    setStatus('');
    setError('');
    try {
      const payload = {
        name: editForm.name.trim(),
        sortOrder: Number(editForm.sortOrder || 0),
        isActive: editForm.isActive,
      };

      if (editImageFile) {
        payload.imageUrl = await uploadProduceImage(editImageFile);
        payload.fallbackUrl = null;
      }

      const result = await onUpdateProduceItem(editingId, payload);
      setStatus(result.message || 'Produce item updated successfully.');
      setEditingId('');
      handleEditImageChange(null);
      await loadItems();
    } catch (err) {
      setError(err.message || 'Unable to update produce item right now.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item) {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const result = await onUpdateProduceItem(item.id, { isActive: !item.isActive });
      setStatus(result.message || 'Produce item updated successfully.');
      if (editingId === item.id) setEditingId('');
      await loadItems();
    } catch (err) {
      setError(err.message || 'Unable to update produce item right now.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from Our Produce? Existing sales and orders will keep their saved item names.`)) {
      return;
    }

    setSaving(true);
    setStatus('');
    setError('');
    try {
      const result = await onDeleteProduceItem(item.id);
      setStatus(result.message || 'Produce item deleted successfully.');
      if (editingId === item.id) setEditingId('');
      await loadItems();
    } catch (err) {
      setError(err.message || 'Unable to delete produce item right now.');
    } finally {
      setSaving(false);
    }
  }

  const formIsValid = form.name.trim().length >= 2 && Boolean(imageFile) && !validateImageFile(imageFile);
  const editFormIsValid = editForm.name.trim().length >= 2 && (!editImageFile || !validateImageFile(editImageFile));

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#171a16] sm:text-[2rem]">Our Produce</h1>
          <p className={ui.note}>Maintain the produce list used on the landing page and the Sales Events item name dropdown.</p>
        </div>

        <form className="grid gap-4 rounded-[26px] border border-[#e5e7de] bg-[#fafbf7] p-4 xl:grid-cols-[1fr_1.3fr_130px_140px_auto]" onSubmit={handleCreate}>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Produce name</label>
            <input
              className={ui.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Yellow Onions"
            />
          </div>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Product image</label>
            <input
              className={ui.input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleCreateImageChange(event.target.files?.[0] || null)}
            />
            {imageFile ? <p className={ui.note}>Selected image: {imageFile.name}</p> : null}
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
          <div className="flex items-end gap-3">
            <ImagePreview src={imagePreviewUrl} name={form.name} />
            <button type="submit" className={ui.buttonPrimary} disabled={saving || !formIsValid}>
              {saving ? 'Adding...' : formIsValid ? 'Add' : 'Select image to add'}
            </button>
          </div>
        </form>

        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr className={ui.tableHeadRow}>
                <th className={ui.tableHeaderCell}>Image</th>
                <th className={ui.tableHeaderCell}>Produce</th>
                <th className={ui.tableHeaderCell}>Sort</th>
                <th className={ui.tableHeaderCell}>Status</th>
                <th className={ui.tableHeaderCell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => {
                  const isEditing = editingId === item.id;
                  const previewSrc = isEditing && editImagePreviewUrl ? editImagePreviewUrl : item.imageUrl;
                  const previewName = isEditing ? editForm.name : item.name;

                  return (
                    <tr key={item.id} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <ImagePreview src={previewSrc} name={previewName} />
                      </td>
                      <td className={ui.tableCell}>
                        {isEditing ? (
                          <div className="grid gap-2">
                            <input
                              className={ui.input}
                              value={editForm.name}
                              onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                            />
                            <input
                              className={ui.input}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(event) => handleEditImageChange(event.target.files?.[0] || null)}
                            />
                            {editImageFile ? <p className={ui.note}>New image: {editImageFile.name}</p> : <p className={ui.note}>Leave image empty to keep the current image.</p>}
                          </div>
                        ) : (
                          <span className="font-semibold text-[#171a16]">{item.name}</span>
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
                          item.sortOrder || 0
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
                          <AdminStatusBadge value={item.isActive ? 'Active' : 'Inactive'} tone={item.isActive ? 'success' : 'neutral'} />
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
                              <button type="button" className={ui.buttonGhost} onClick={() => startEdit(item)}>
                                Edit
                              </button>
                              <button type="button" className={ui.buttonGhost} onClick={() => handleToggleActive(item)} disabled={saving}>
                                {item.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button type="button" className={ui.buttonDanger} onClick={() => handleDelete(item)} disabled={saving}>
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
                  <td className={ui.tableCell} colSpan={5}>
                    <AdminTableEmpty title={loading ? 'Loading produce items...' : 'No produce items found.'} description="Add produce items to make them available on the landing page and Sales Events dropdown." />
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
