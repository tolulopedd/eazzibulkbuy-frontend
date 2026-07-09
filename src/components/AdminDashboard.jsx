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
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

function formatCentsToDollarInput(value) {
  if (!Number.isFinite(value)) return '';
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
  if (!value) return 'Unknown';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'AD';
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="16" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SalesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h9" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14h3" />
    </svg>
  );
}

function FulfillmentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h3l4 4v3h-7z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h6" />
    </svg>
  );
}

function CustomerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function LogisticsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 7h12v10H3z" />
      <path d="M15 10h2.5l3.5 4v3h-6z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="18" cy="18" r="1.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M15 17H5.5a1.5 1.5 0 0 1-1.2-2.4L6 12.4V10a6 6 0 1 1 12 0v2.4l1.7 2.2A1.5 1.5 0 0 1 18.5 17H15" />
      <path d="M9 19a3 3 0 0 0 6 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
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
  const [editForm, setEditForm] = useState({ ...createDefaultSalesForm() });
  const [form, setForm] = useState(createDefaultSalesForm());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const modules = useMemo(() => {
    if (canManageSales) {
      return [
        { id: 'overview', label: 'Dashboard', title: 'Dashboard', icon: DashboardIcon },
        { id: 'sales', label: 'Sales Events', title: 'Sales Events', icon: SalesIcon },
        { id: 'payments', label: 'Payments', title: 'Payments', icon: PaymentIcon },
        { id: 'fulfillment', label: 'Fulfilment', title: 'Fulfilment', icon: FulfillmentIcon },
        { id: 'reports', label: 'Reports', title: 'Reports', icon: ReportsIcon },
        { id: 'customers', label: 'Customer', title: 'Customer', icon: CustomerIcon },
      ];
    }

    return [
      { id: 'logistics', label: 'Logistics', title: 'Logistics', icon: LogisticsIcon },
    ];
  }, [canManageSales]);

  const [activeModule, setActiveModule] = useState(() => (canManageSales ? 'overview' : 'logistics'));

  const activeModuleConfig = useMemo(
    () => modules.find((module) => module.id === activeModule) || modules[0],
    [modules, activeModule],
  );

  useEffect(() => {
    if (modules.length === 0) return;
    if (!modules.some((module) => module.id === activeModule)) setActiveModule(modules[0].id);
  }, [modules, activeModule]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeModule]);

  useEffect(() => {
    setAccountMenuOpen(false);
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
        setSalesMeta({ page: 1, limit: response.length || nextQuery.limit, total: response.length, totalPages: 1 });
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
      setActiveSalesSummary({ count: 0, names: [], hasMore: false });
    }
  }

  useEffect(() => {
    if (!canManageSales) return;
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
        bundleItems:
          form.saleType === 'BUNDLE_DISCOUNTED_SALE'
            ? form.bundleItems
                .map((item) => ({ name: item.name.trim(), quantity: Number(item.quantity) || 0 }))
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
      bundleItems:
        Array.isArray(item.bundleItemsJson) && item.bundleItemsJson.length
          ? item.bundleItemsJson.map((entry) => ({ name: entry.name || '', quantity: String(entry.quantity || 1) }))
          : DEFAULT_BUNDLE_ITEMS.map((entry) => ({ ...entry })),
      deliveryEnabled: Boolean(item.deliveryEnabled),
      deliveryBaseRangeMax: String(item.deliveryBaseRangeMax || 10),
      deliveryBasePrice: formatCentsToDollarInput(item.deliveryBasePrice || 0),
      deliveryAdditionalUnitPrice: formatCentsToDollarInput(item.deliveryAdditionalUnitPrice || 0),
    });
  }

  async function saveEdit() {
    if (!editingId) return;
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
        bundleItems:
          editForm.saleType === 'BUNDLE_DISCOUNTED_SALE'
            ? editForm.bundleItems
                .map((itemForm) => ({ name: itemForm.name.trim(), quantity: Number(itemForm.quantity) || 0 }))
                .filter((itemForm) => itemForm.name && itemForm.quantity > 0)
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

    if (!window.confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;

    setDeleteLoadingId(item.id);
    try {
      await onDeleteSalesItem(item.id);
      setActionStatus('Sales event deleted.');
      if (editingId === item.id) setEditingId('');
      await loadSalesItems(salesQuery);
      await loadActiveSalesSummary();
      await loadReports();
    } finally {
      setDeleteLoadingId('');
    }
  }

  async function applySalesFilters() {
    const nextQuery = { ...salesQuery, q: salesQuery.q.trim(), page: 1 };
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

  function renderLogisticsModule() {
    return (
      <section className="space-y-5">
        <section className={`${ui.card} space-y-3`}>
          <h1 className="text-[2rem] font-bold tracking-tight text-[#171a16]">Partner workspace</h1>
          <p className={ui.note}>Your account is active for logistics operations. Sales and reports remain available for admin roles.</p>
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
          onClearFilters={clearSalesFilters}
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
      return <AdminReportsPanel reports={reports} reportError={reportError} loadingReports={loadingReports} onRefreshReports={loadReports} />;
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
      return <AdminFulfillmentPanel onLoadOrders={onLoadOrders} onUpdateFulfillmentStatus={onUpdateFulfillmentStatus} onRefreshReports={loadReports} />;
    }

    if (activeModule === 'customers') {
      return <AdminCustomersPanel onLoadCustomers={onLoadCustomers} onUpdateCustomer={onUpdateCustomer} onExportCustomers={onExportCustomers} />;
    }

    if (activeModule === 'logistics') return renderLogisticsModule();

    return <AdminOverviewPanel reports={reports} reportError={reportError} loadingReports={loadingReports} activeSalesSummary={activeSalesSummary} />;
  }

  const profileName = currentAdmin?.email?.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Admin User';
  const profileInitials = getInitials(profileName);
  const displayProfileName = profileName.replace(/\b\w/g, (c) => c.toUpperCase());

  function AccountCard({ mobile = false }) {
    return (
      <div className="relative">
        {accountMenuOpen ? (
          <div
            className={cx(
              'absolute z-20 w-[235px] rounded-[26px] border border-[#e0e3d8] bg-white shadow-[0_18px_40px_rgba(20,27,22,0.12)]',
              mobile ? 'bottom-[calc(100%+0.65rem)] left-0' : 'bottom-[calc(100%+0.75rem)] left-0',
            )}
          >
            <div className="px-4 py-4">
              <p className="truncate text-sm font-semibold text-[#171a16]">{displayProfileName}</p>
              <p className="truncate pt-1 text-xs text-[#767c72]">{currentAdmin?.email || 'Unknown user'}</p>
            </div>
            <div className="border-t border-[#eceee5] px-3 py-3">
              <button type="button" className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-base font-medium text-[#232722] transition hover:bg-[#f6f7f2]" onClick={onLogout}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H4" />
                  <path d="M20 19v-2a2 2 0 0 0-2-2h-3" />
                  <path d="M20 5v2a2 2 0 0 1-2 2h-3" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="w-full rounded-full border border-[#e0e3d8] bg-[#fbfbf8] px-3 py-3 text-left transition hover:bg-white"
          onClick={() => setAccountMenuOpen((value) => !value)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#181818] text-sm font-bold text-white">{profileInitials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#171a16]">{displayProfileName}</p>
              <p className="truncate text-xs text-[#767c72]">{currentAdmin?.email || 'Unknown user'}</p>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f7f8f4_0%,#f5f6f2_100%)]">
      <div className="mx-auto w-full max-w-[1380px] px-0 py-0 lg:px-0">
        <div className="relative min-h-screen overflow-hidden rounded-none border-0 bg-transparent lg:rounded-[34px] lg:border lg:border-[#e4e6dc] lg:bg-white lg:shadow-[0_10px_40px_rgba(20,27,22,0.06)]">
          <div
            className={cx(
              'fixed inset-0 z-30 bg-black/20 transition-opacity md:hidden',
              sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          <aside
            className={cx(
              'fixed inset-y-0 left-0 z-40 w-[252px] transform border-r border-[#e6e8dd] bg-white transition-transform duration-300 ease-out md:hidden',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="flex h-full flex-col">
              <div className="flex justify-center border-b border-[#eceee5] px-5 py-7">
                <BrandLogo compact align="center" imageClassName="w-[3.25rem]" imageWidth="104px" />
              </div>
              <nav className="grid gap-1 px-3 py-4" aria-label="Admin modules">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const active = activeModule === module.id;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveModule(module.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[1rem] font-semibold transition',
                        active ? 'bg-[#d7f7ee] text-[#139978]' : 'text-[#4e544d] hover:bg-[#f6f7f2] hover:text-[#171a16]',
                      )}
                    >
                      <Icon />
                      <span>{module.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="mt-auto px-3 pb-4 pt-6">
                <AccountCard mobile />
              </div>
            </div>
          </aside>

          <div className="flex min-h-screen">
            <aside className="hidden w-[252px] shrink-0 border-r border-[#e6e8dd] bg-white md:block">
              <div className="flex h-full flex-col">
                <div className="flex justify-center border-b border-[#eceee5] px-5 py-7">
                  <BrandLogo compact align="center" imageClassName="w-[3.5rem]" imageWidth="112px" />
                </div>

                <nav className="grid gap-2 px-3 py-4" aria-label="Admin modules">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    const active = activeModule === module.id;
                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => setActiveModule(module.id)}
                        className={cx(
                          'flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[1rem] font-semibold transition',
                          active ? 'bg-[#d7f7ee] text-[#139978]' : 'text-[#4e544d] hover:bg-[#f6f7f2] hover:text-[#171a16]',
                        )}
                      >
                        <Icon />
                        <span>{module.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto px-3 pb-4 pt-6">
                  <AccountCard />
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-[#fbfbf8]">
              <header className="flex items-center justify-between border-b border-[#e6e8dd] bg-white px-4 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7d9cf] bg-white text-[#4f554d] transition hover:bg-[#f7f8f4] md:hidden"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open menu"
                  >
                    <MenuIcon />
                  </button>
                  <h1 className="text-[2rem] font-bold tracking-tight text-[#171a16]">{activeModuleConfig?.title || 'Admin Portal'}</h1>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7d9cf] bg-white text-[#555b53] transition hover:bg-[#f7f8f4]" aria-label="Notifications">
                    <BellIcon />
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#46d2b8]" />
                  </button>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#181818] text-sm font-bold text-white">{profileInitials}</div>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                {renderActiveModule()}
              </main>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
