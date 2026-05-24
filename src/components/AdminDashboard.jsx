import { useEffect, useMemo, useState } from 'react';
import AdminOverviewPanel from './AdminOverviewPanel';
import AdminSalesPanel from './AdminSalesPanel';
import AdminReportsPanel from './AdminReportsPanel';
import AdminPaymentsPanel from './AdminPaymentsPanel';
import AdminCustomersPanel from './AdminCustomersPanel';
import AdminFulfillmentPanel from './AdminFulfillmentPanel';
import BrandLogo from './BrandLogo';
import { ui } from '../ui/classes';

const DEFAULT_SALES_QUERY = {
  q: '',
  batchNumber: '',
  status: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};

const DEFAULT_BUNDLE_ITEMS = [
  { name: '', quantity: '1' },
  { name: '', quantity: '1' },
];

function createDefaultSalesForm() {
  return {
    name: '',
    saleType: 'NORMAL_SALE',
    batchNumber: '',
    pricePerUnit: '',
    closingDate: '',
    status: 'ACTIVE',
    pickupInstructions: '',
    description: '',
    bundleItems: DEFAULT_BUNDLE_ITEMS.map((item) => ({ ...item })),
    deliveryEnabled: false,
    deliveryBaseRangeMax: '10',
    deliveryBasePrice: '20.00',
    deliveryAdditionalUnitPrice: '2.00',
  };
}

function parseDollarInputToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function formatCentsToDollarInput(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return (value / 100).toFixed(2);
}

function isEditableSalesItem(item) {
  return item.status === 'ACTIVE' && new Date(item.closingDate) > new Date();
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function moduleBadge(moduleId) {
  const map = {
    overview: 'OV',
    sales: 'SL',
    payments: 'PM',
    reports: 'RP',
    customers: 'CU',
    fulfillment: 'FL',
    logistics: 'LG',
  };
  return map[moduleId] || 'MD';
}

export default function AdminDashboard({
  currentAdmin,
  canManageSales,
  isSuperAdmin,
  onLoadReports,
  onCreateSalesItem,
  onLoadSalesItems,
  onUpdateSalesItem,
  onDeleteSalesItem,
  onLoadCustomers,
  onUpdateCustomer,
  onExportCustomers,
  onLoadOrders,
  onConfirmInteracPayment,
  onLoadPaymentProofViewUrl,
  onResendPaymentConfirmation,
  onUpdateFulfillmentStatus,
  onLogout,
}) {
  const [reports, setReports] = useState(null);
  const [salesItems, setSalesItems] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingSalesItems, setLoadingSalesItems] = useState(false);
  const [reportError, setReportError] = useState('');
  const [salesItemError, setSalesItemError] = useState('');
  const [salesQuery, setSalesQuery] = useState(DEFAULT_SALES_QUERY);
  const [salesMeta, setSalesMeta] = useState({
    page: 1,
    limit: DEFAULT_SALES_QUERY.limit,
    total: 0,
    totalPages: 1,
  });
  const [activeSalesSummary, setActiveSalesSummary] = useState({
    count: 0,
    names: [],
    hasMore: false,
  });
  const [createStatus, setCreateStatus] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [saveLoadingId, setSaveLoadingId] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({
    ...createDefaultSalesForm(),
  });

  const [form, setForm] = useState(createDefaultSalesForm());

  const modules = useMemo(() => {
    const base = [];

    if (canManageSales) {
      base.push({ id: 'overview', label: 'Overview' });
      base.push({ id: 'sales', label: 'Sales Events' });
      base.push({ id: 'payments', label: 'Payments' });
      base.push({ id: 'fulfillment', label: 'Fulfilment' });
      base.push({ id: 'reports', label: 'Reports' });
      base.push({ id: 'customers', label: 'Customer' });
    } else {
      base.push({ id: 'logistics', label: 'Logistics' });
    }

    return base;
  }, [canManageSales]);

  const [activeModule, setActiveModule] = useState(() => (canManageSales ? 'overview' : 'logistics'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (modules.length === 0) {
      return;
    }

    if (!modules.some((module) => module.id === activeModule)) {
      setActiveModule(modules[0].id);
    }
  }, [modules, activeModule]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeModule]);

  async function loadReports(query = {}) {
    setLoadingReports(true);
    setReportError('');
    try {
      setReports(await onLoadReports(query));
    } catch (error) {
      setReportError(error.message || 'Unable to load reports. Please try again.');
    } finally {
      setLoadingReports(false);
    }
  }

  async function loadSalesItems(nextQuery = salesQuery) {
    setLoadingSalesItems(true);
    setSalesItemError('');
    try {
      const response = await onLoadSalesItems(nextQuery);
      if (Array.isArray(response)) {
        setSalesItems(response);
        setSalesMeta({
          page: 1,
          limit: response.length || nextQuery.limit,
          total: response.length,
          totalPages: 1,
        });
      } else {
        setSalesItems(response.items || []);
        setSalesMeta({
          page: response.page || nextQuery.page,
          limit: response.limit || nextQuery.limit,
          total: response.total || 0,
          totalPages: response.totalPages || 1,
        });
      }
    } catch (error) {
      setSalesItemError(error.message || 'Unable to load sales items. Please try again.');
    } finally {
      setLoadingSalesItems(false);
    }
  }

  async function loadActiveSalesSummary() {
    try {
      const response = await onLoadSalesItems({
        ...DEFAULT_SALES_QUERY,
        status: 'ACTIVE',
        sortBy: 'closingDate',
        sortOrder: 'asc',
        page: 1,
        limit: 100,
      });
      const items = Array.isArray(response) ? response : response.items || [];
      const liveItems = items.filter((item) => item.status === 'ACTIVE' && new Date(item.closingDate) > new Date());
      setActiveSalesSummary({
        count: liveItems.length,
        names: liveItems.slice(0, 3).map((item) => item.name),
        hasMore: liveItems.length > 3,
      });
    } catch {
      setActiveSalesSummary({
        count: 0,
        names: [],
        hasMore: false,
      });
    }
  }

  useEffect(() => {
    if (!canManageSales) {
      return;
    }

    loadReports();
    loadSalesItems(DEFAULT_SALES_QUERY);
    loadActiveSalesSummary();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateStatus('');
    setCreateLoading(true);

    try {
      await onCreateSalesItem({
        name: form.name,
        saleType: form.saleType,
        batchNumber: form.batchNumber,
        pricePerUnit: parseDollarInputToCents(form.pricePerUnit),
        closingDate: new Date(form.closingDate).toISOString(),
        status: form.status,
        pickupInstructions: form.pickupInstructions || undefined,
        description: form.description || undefined,
        bundleItems: form.saleType === 'BUNDLE_DISCOUNTED_SALE'
          ? form.bundleItems
              .map((item) => ({
                name: item.name.trim(),
                quantity: Number(item.quantity) || 0,
              }))
              .filter((item) => item.name && item.quantity > 0)
          : undefined,
        deliveryEnabled: Boolean(form.deliveryEnabled),
        deliveryBaseRangeMax: Number(form.deliveryBaseRangeMax) || 10,
        deliveryBasePrice: parseDollarInputToCents(form.deliveryBasePrice),
        deliveryAdditionalUnitPrice: parseDollarInputToCents(form.deliveryAdditionalUnitPrice),
      });

      setCreateStatus('Sales event created.');
      setForm(createDefaultSalesForm());
      await loadSalesItems(salesQuery);
      await loadActiveSalesSummary();
      await loadReports();
    } finally {
      setCreateLoading(false);
    }
  }

  function startEdit(item) {
    if (!isEditableSalesItem(item)) {
      setEditingId(item.id);
      setActionStatus('');
      setEditForm({
        saleType: item.saleType || 'NORMAL_SALE',
        name: item.name,
        batchNumber: item.batchNumber || '',
        pricePerUnit: formatCentsToDollarInput(item.pricePerUnit),
        closingDate: toDateTimeLocal(item.closingDate),
        status: item.status,
        pickupInstructions: item.pickupInstructions || '',
        description: item.description || '',
        bundleItems: Array.isArray(item.bundleItemsJson) && item.bundleItemsJson.length
          ? item.bundleItemsJson.map((entry) => ({ name: entry.name || '', quantity: String(entry.quantity || 1) }))
          : DEFAULT_BUNDLE_ITEMS.map((entry) => ({ ...entry })),
      });
      return;
    }

    setEditingId(item.id);
    setActionStatus('');
    setEditForm({
      saleType: item.saleType || 'NORMAL_SALE',
      name: item.name,
      batchNumber: item.batchNumber || '',
      pricePerUnit: formatCentsToDollarInput(item.pricePerUnit),
      closingDate: toDateTimeLocal(item.closingDate),
      status: item.status,
      pickupInstructions: item.pickupInstructions || '',
      description: item.description || '',
      bundleItems: Array.isArray(item.bundleItemsJson) && item.bundleItemsJson.length
        ? item.bundleItemsJson.map((entry) => ({ name: entry.name || '', quantity: String(entry.quantity || 1) }))
        : DEFAULT_BUNDLE_ITEMS.map((entry) => ({ ...entry })),
      deliveryEnabled: Boolean(item.deliveryEnabled),
      deliveryBaseRangeMax: String(item.deliveryBaseRangeMax || 10),
      deliveryBasePrice: formatCentsToDollarInput(item.deliveryBasePrice || 0),
      deliveryAdditionalUnitPrice: formatCentsToDollarInput(item.deliveryAdditionalUnitPrice || 0),
    });
  }

  async function saveEdit() {
    if (!editingId) {
      return;
    }

    const item = salesItems.find((entry) => entry.id === editingId);
    if (!item || !isEditableSalesItem(item)) {
      setActionStatus('Only active sales that have not expired can be edited.');
      setEditingId('');
      return;
    }

    setSaveLoadingId(editingId);
    try {
      await onUpdateSalesItem(editingId, {
        name: editForm.name,
        saleType: editForm.saleType,
        batchNumber: editForm.batchNumber,
        pricePerUnit: parseDollarInputToCents(editForm.pricePerUnit),
        closingDate: new Date(editForm.closingDate).toISOString(),
        status: editForm.status,
        pickupInstructions: editForm.pickupInstructions || null,
        description: editForm.description || null,
        bundleItems: editForm.saleType === 'BUNDLE_DISCOUNTED_SALE'
          ? editForm.bundleItems
              .map((item) => ({
                name: item.name.trim(),
                quantity: Number(item.quantity) || 0,
              }))
              .filter((item) => item.name && item.quantity > 0)
          : null,
        deliveryEnabled: Boolean(editForm.deliveryEnabled),
        deliveryBaseRangeMax: Number(editForm.deliveryBaseRangeMax) || 10,
        deliveryBasePrice: parseDollarInputToCents(editForm.deliveryBasePrice),
        deliveryAdditionalUnitPrice: parseDollarInputToCents(editForm.deliveryAdditionalUnitPrice),
      });

      setActionStatus('Sales event updated.');
      setEditingId('');
      await loadSalesItems(salesQuery);
      await loadActiveSalesSummary();
      await loadReports();
    } finally {
      setSaveLoadingId('');
    }
  }

  async function handleDelete(item) {
    if (!isEditableSalesItem(item) || (item._count?.orders || 0) > 0) {
      setActionStatus('Only active sales with no buyer orders can be deleted.');
      return;
    }

    const ok = window.confirm(`Delete "${item.name}"? This action cannot be undone.`);
    if (!ok) {
      return;
    }

    setDeleteLoadingId(item.id);
    try {
      await onDeleteSalesItem(item.id);
      setActionStatus('Sales event deleted.');
      if (editingId === item.id) {
        setEditingId('');
      }
      await loadSalesItems(salesQuery);
      await loadActiveSalesSummary();
      await loadReports();
    } finally {
      setDeleteLoadingId('');
    }
  }

  async function applySalesFilters() {
    const nextQuery = {
      ...salesQuery,
      q: salesQuery.q.trim(),
      page: 1,
    };
    setSalesQuery(nextQuery);
    await loadSalesItems(nextQuery);
  }

  async function clearSalesFilters() {
    setActionStatus('');
    setEditingId('');
    setSalesQuery(DEFAULT_SALES_QUERY);
    await loadSalesItems(DEFAULT_SALES_QUERY);
  }

  async function goToSalesPage(nextPage) {
    const page = Math.max(1, Math.min(nextPage, salesMeta.totalPages || 1));
    const nextQuery = { ...salesQuery, page };
    setSalesQuery(nextQuery);
    await loadSalesItems(nextQuery);
  }

  const listStart = salesMeta.total === 0 ? 0 : (salesMeta.page - 1) * salesMeta.limit + 1;
  const listEnd = salesMeta.total === 0 ? 0 : Math.min(salesMeta.page * salesMeta.limit, salesMeta.total);

  function renderLogisticsModule() {
    return (
      <section className="space-y-5">
        <section className={`${ui.card} space-y-2`}>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Partner workspace</h1>
          <p className="leading-6 text-slate-600">Your account is active for logistics operations. Sales and reports are available for admin roles.</p>
        </section>
      </section>
    );
  }

  function renderActiveModule() {
    if (activeModule === 'sales') {
      return (
        <AdminSalesPanel
          form={form}
          onFormChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          createLoading={createLoading}
          createStatus={createStatus}
          onCreate={handleCreate}
          salesQuery={salesQuery}
          onSalesQueryChange={(field, value) => setSalesQuery((prev) => ({ ...prev, [field]: value }))}
          loadingSalesItems={loadingSalesItems}
          onApplyFilters={applySalesFilters}
          salesMeta={salesMeta}
          salesItemError={salesItemError}
          actionStatus={actionStatus}
          salesItems={salesItems}
          editingId={editingId}
          editForm={editForm}
          onEditFormChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
          saveLoadingId={saveLoadingId}
          deleteLoadingId={deleteLoadingId}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingId('')}
          onStartEdit={startEdit}
          onDeleteItem={handleDelete}
          onPrevPage={() => goToSalesPage(salesMeta.page - 1)}
          onNextPage={() => goToSalesPage(salesMeta.page + 1)}
          formatStatusLabel={formatStatusLabel}
        />
      );
    }

    if (activeModule === 'reports') {
      return (
        <AdminReportsPanel
          reports={reports}
          reportError={reportError}
          loadingReports={loadingReports}
          onRefreshReports={loadReports}
        />
      );
    }

    if (activeModule === 'payments') {
      return (
        <AdminPaymentsPanel
          onLoadOrders={onLoadOrders}
          onConfirmInteracPayment={onConfirmInteracPayment}
          onLoadPaymentProofViewUrl={onLoadPaymentProofViewUrl}
          onResendPaymentConfirmation={onResendPaymentConfirmation}
          onRefreshReports={loadReports}
        />
      );
    }

    if (activeModule === 'fulfillment') {
      return (
        <AdminFulfillmentPanel
          onLoadOrders={onLoadOrders}
          onUpdateFulfillmentStatus={onUpdateFulfillmentStatus}
          onRefreshReports={loadReports}
        />
      );
    }

    if (activeModule === 'customers') {
      return <AdminCustomersPanel onLoadCustomers={onLoadCustomers} onUpdateCustomer={onUpdateCustomer} onExportCustomers={onExportCustomers} />;
    }

    if (activeModule === 'logistics') {
      return renderLogisticsModule();
    }

    return (
      <AdminOverviewPanel
        reports={reports}
        reportError={reportError}
        loadingReports={loadingReports}
        activeSalesSummary={activeSalesSummary}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1340px]">
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-[0_18px_40px_rgba(15,23,42,0.1)] backdrop-blur-sm">
        <div
          className={cx(
            'fixed inset-0 z-30 bg-slate-900/45 backdrop-blur-[2px] transition-opacity md:hidden',
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 w-[282px] transform border-r border-slate-200 bg-white transition-transform duration-300 ease-out md:hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-full flex-col px-3.5 py-4">
            <div className="space-y-2 px-1">
              <BrandLogo compact imageClassName="w-40" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Admin Portal</h2>
              <p className="text-xs text-slate-500 break-all">{currentAdmin?.email || 'Unknown user'}</p>
            </div>
            <nav className="mt-4 grid gap-1.5 overflow-y-auto pr-1" aria-label="Admin modules">
              {modules.map((module) => {
                const active = activeModule === module.id;
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setActiveModule(module.id)}
                    className={cx(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      active
                        ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-800',
                    )}
                  >
                    <span className={cx(
                      'inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold',
                      active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700',
                    )}>
                      {moduleBadge(module.id)}
                    </span>
                    <span>{module.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-slate-200 pt-3">
              <button type="button" className={`${ui.buttonGhost} w-full`} onClick={onLogout}>Sign out</button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-64px)]">
          <aside className="hidden w-[278px] shrink-0 border-r border-slate-200 bg-white md:block">
            <div className="flex h-full flex-col px-4 py-5">
              <div className="space-y-2">
                <BrandLogo compact imageClassName="w-44" />
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Admin Portal</h2>
                <p className="text-xs text-slate-500 break-all">{currentAdmin?.email || 'Unknown user'}</p>
                <p className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  {formatStatusLabel(currentAdmin?.role || 'ADMIN')}
                </p>
              </div>

              <nav className="mt-5 grid gap-1.5 overflow-y-auto pr-1" aria-label="Admin modules">
                {modules.map((module) => {
                  const active = activeModule === module.id;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveModule(module.id)}
                      className={cx(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                        active
                          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-800',
                      )}
                    >
                      <span className={cx(
                        'inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold',
                        active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700',
                      )}>
                        {moduleBadge(module.id)}
                      </span>
                      <span>{module.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-slate-200 pt-3">
                <button type="button" className={`${ui.buttonGhost} w-full`} onClick={onLogout}>Sign out</button>
                <p className="mt-2 px-1 text-[11px] text-slate-400">© {new Date().getFullYear()} EazziBulkBuy</p>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-3 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
              {renderActiveModule()}
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
