import { useEffect, useState } from 'react';
import { ui } from '../ui/classes';

const DEFAULT_USER_QUERY = {
  q: '',
  role: '',
  isActive: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};

const DEFAULT_CREATE_FORM = {
  name: '',
  email: '',
  role: 'ADMIN',
  password: '',
  phone: '',
  address: '',
  isActive: true,
};

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString();
}

function formatRoleLabel(role) {
  if (role === 'PARTNER') return 'Fulfilment Staff';
  if (role === 'ADMIN') return 'Admin';
  return role || 'Unknown';
}

export default function SuperadminUsersPanel({ onLoadUsers, onCreateUser }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersStatus, setUsersStatus] = useState('');
  const [usersQuery, setUsersQuery] = useState(DEFAULT_USER_QUERY);
  const [usersMeta, setUsersMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState('');
  const [createError, setCreateError] = useState('');

  async function loadUsers(nextQuery = usersQuery) {
    setLoadingUsers(true);
    setUsersError('');

    try {
      const response = await onLoadUsers(nextQuery);
      setUsers(response.items || []);
      setUsersMeta({
        page: response.page || nextQuery.page,
        limit: response.limit || nextQuery.limit,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
    } catch (error) {
      setUsersError(error.message || 'Unable to load users. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers(DEFAULT_USER_QUERY);
  }, []);

  async function applyFilters() {
    const nextQuery = {
      ...usersQuery,
      q: usersQuery.q.trim(),
      page: 1,
    };
    setUsersQuery(nextQuery);
    await loadUsers(nextQuery);
  }

  async function clearFilters() {
    setUsersStatus('');
    setUsersQuery(DEFAULT_USER_QUERY);
    await loadUsers(DEFAULT_USER_QUERY);
  }

  async function goToPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, usersMeta.totalPages || 1));
    const nextQuery = { ...usersQuery, page };
    setUsersQuery(nextQuery);
    await loadUsers(nextQuery);
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setCreateError('');
    setCreateStatus('');
    setCreateLoading(true);

    try {
      if (createForm.password.trim().length < 8) {
        setCreateError('Password must be at least 8 characters for admin and fulfilment staff accounts.');
        return;
      }

      await onCreateUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        password: createForm.password.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        address: createForm.address.trim() || undefined,
        isActive: createForm.isActive,
      });
      setCreateStatus('User account created.');
      setCreateForm(DEFAULT_CREATE_FORM);
      await loadUsers(usersQuery);
    } catch (error) {
      setCreateError(error.message || 'Unable to create user account. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  }

  const listStart = usersMeta.total === 0 ? 0 : (usersMeta.page - 1) * usersMeta.limit + 1;
  const listEnd = usersMeta.total === 0 ? 0 : Math.min(usersMeta.page * usersMeta.limit, usersMeta.total);

  return (
    <>
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Users directory</h1>
          <p className="leading-6 text-slate-600">View and filter admin and fulfilment staff accounts.</p>
        </div>

        <div className={`${ui.section} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Search</label>
              <input
                className={ui.input}
                value={usersQuery.q}
                onChange={(e) => setUsersQuery((prev) => ({ ...prev, q: e.target.value }))}
                placeholder="Search by name, email, or phone"
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Role</label>
              <select className={ui.select} value={usersQuery.role} onChange={(e) => setUsersQuery((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="PARTNER">Fulfilment Staff</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Status</label>
              <select className={ui.select} value={usersQuery.isActive} onChange={(e) => setUsersQuery((prev) => ({ ...prev, isActive: e.target.value }))}>
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Sort</label>
              <select className={ui.select} value={usersQuery.sortBy} onChange={(e) => setUsersQuery((prev) => ({ ...prev, sortBy: e.target.value }))}>
                <option value="createdAt">Created date</option>
                <option value="lastLoginAt">Last login</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className={ui.buttonGhost} onClick={applyFilters} disabled={loadingUsers}>
              {loadingUsers ? 'Refreshing users...' : 'Apply filters'}
            </button>
            <button type="button" className={ui.buttonGhost} onClick={clearFilters} disabled={loadingUsers}>
              Clear filters
            </button>
            <button type="button" className={ui.buttonGhost} onClick={() => loadUsers(usersQuery)} disabled={loadingUsers}>
              {loadingUsers ? 'Refreshing users...' : 'Refresh users'}
            </button>
          </div>

          <p className="text-sm text-slate-600">Showing {listStart}-{listEnd} of {usersMeta.total} users</p>
        </div>

        {usersError ? <p className={ui.error}>{usersError}</p> : null}
        {usersStatus ? <p className={ui.success}>{usersStatus}</p> : null}

        <div className="space-y-4">
          {users.map((user) => (
            <article key={user.id} className={`${ui.section} space-y-2`}>
              <p className="text-lg font-semibold text-slate-900">{user.name}</p>
              <p className="text-sm leading-6 text-slate-700">Email: {user.email}</p>
              <p className="text-sm leading-6 text-slate-700">Role: {formatRoleLabel(user.role)}</p>
              <p className="text-sm leading-6 text-slate-700">Status: {user.isActive ? 'Active' : 'Inactive'}</p>
              <p className="text-sm leading-6 text-slate-700">Last login: {formatDate(user.lastLoginAt)}</p>
              <p className="text-sm leading-6 text-slate-700">Created: {formatDate(user.createdAt)}</p>
            </article>
          ))}
        </div>

        {!loadingUsers && users.length === 0 ? <p className={ui.note}>No users match your filters.</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={ui.buttonGhost}
            onClick={() => goToPage(usersMeta.page - 1)}
            disabled={loadingUsers || usersMeta.page <= 1}
          >
            Previous page
          </button>
          <p className="text-sm text-slate-600">Page {usersMeta.page} of {usersMeta.totalPages}</p>
          <button
            type="button"
            className={ui.buttonGhost}
            onClick={() => goToPage(usersMeta.page + 1)}
            disabled={loadingUsers || usersMeta.page >= usersMeta.totalPages}
          >
            Next page
          </button>
        </div>
      </section>

      <form className={`${ui.card} space-y-5`} onSubmit={handleCreateUser}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Create user</h1>
          <p className="leading-6 text-slate-600">Create an account directly for admin or fulfilment staff access.</p>
        </div>

        <div className={`${ui.section} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Full name</label>
              <input className={ui.input} required value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Email</label>
              <input className={ui.input} type="email" required value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Role</label>
              <select className={ui.select} value={createForm.role} onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="ADMIN">Admin</option>
                <option value="PARTNER">Fulfilment Staff</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Password</label>
              <input
                className={ui.input}
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Required for admin/fulfilment staff"
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Phone</label>
              <input className={ui.input} value={createForm.phone} onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Active</label>
              <select
                className={ui.select}
                value={createForm.isActive ? 'true' : 'false'}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className={ui.fieldWrap}>
            <label className={ui.label}>Address</label>
            <textarea className={ui.textarea} rows={2} value={createForm.address} onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-center pt-1">
          <button type="submit" className={`${ui.buttonPrimary} min-w-32`} disabled={createLoading}>
            {createLoading ? 'Creating user...' : 'Create user'}
          </button>
        </div>
        {createStatus ? <p className={ui.success}>{createStatus}</p> : null}
        {createError ? <p className={ui.error}>{createError}</p> : null}
      </form>
    </>
  );
}
