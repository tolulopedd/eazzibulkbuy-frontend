import { useEffect, useMemo, useState } from 'react';
import { ui } from '../ui/classes';
import { AdminStatusBadge } from './AdminTablePrimitives';

function formatCad(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCountdownParts(targetDate, now) {
  if (!targetDate) {
    return null;
  }

  const diffMs = new Date(targetDate).getTime() - now.getTime();
  if (diffMs <= 0) {
    return {
      label: 'Closed',
      detail: 'This live sales event has already reached its closing time.',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    label: `${days}d ${hours}h ${minutes}m`,
    detail: `Closes ${formatTimestamp(targetDate)}`,
  };
}

function getCustomerStatus(customer) {
  return customer?.isActive ? { label: 'Active', tone: 'success' } : { label: 'Inactive', tone: 'neutral' };
}

function OverviewMetricCard({ label, value, highlight = false }) {
  return (
    <article
      className={[
        'rounded-[22px] border p-4 shadow-[0_12px_24px_rgba(15,23,42,0.045)] transition',
        highlight
          ? 'border-emerald-700 bg-[linear-gradient(145deg,#0f5c3d,#1d8a5d)] text-white'
          : 'border-emerald-100 bg-white text-slate-900',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${highlight ? 'text-emerald-50/85' : 'text-slate-500'}`}>{label}</p>
          <h3 className={`text-2xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-slate-950'}`}>{value}</h3>
        </div>
        <span
          className={[
            'inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold',
            highlight
              ? 'border-white/30 bg-white/10 text-white'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          ].join(' ')}
        >
          ↗
        </span>
      </div>
    </article>
  );
}

function SectionShell({ title, children, action }) {
  return (
    <section className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminOverviewPanel({
  reports,
  reportError,
  loadingReports,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const overview = reports?.summary?.overview;
  const nextLiveEventCountdown = useMemo(
    () => formatCountdownParts(overview?.nextLiveEvent?.closingDate, now),
    [overview?.nextLiveEvent?.closingDate, now],
  );

  if (reportError) {
    return (
      <section className="space-y-5">
        <section className={`${ui.card} space-y-4`}>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Dashboard</h1>
            <p className="text-sm leading-6 text-slate-600">We could not load the dashboard analytics right now.</p>
          </div>
          <p className={ui.error}>{reportError}</p>
        </section>
      </section>
    );
  }

  if (!reports || !overview) {
    return (
      <section className="space-y-5">
        <section className={`${ui.card} space-y-4`}>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Dashboard</h1>
            <p className="text-sm leading-6 text-slate-600">Your operations analytics will appear here once the dashboard data is loaded.</p>
          </div>
          <p className={ui.note}>{loadingReports ? 'Loading dashboard analytics...' : 'No dashboard analytics are available yet.'}</p>
        </section>
      </section>
    );
  }

  const metricCards = [
    {
      label: 'Total Orders YTD',
      value: overview.totalOrdersYtd,
      highlight: true,
    },
    {
      label: 'Total Orders MTD',
      value: overview.totalOrdersMtd,
    },
    {
      label: 'Paid Orders YTD',
      value: overview.paidOrdersYtd,
    },
    {
      label: 'Paid Orders MTD',
      value: overview.paidOrdersMtd,
    },
    {
      label: 'Pending Payment Orders',
      value: overview.pendingPaymentOrders,
    },
    {
      label: 'Total Sales YTD',
      value: formatCad(overview.totalSalesYtd),
    },
    {
      label: 'Total Sales MTD',
      value: formatCad(overview.totalSalesMtd),
    },
    {
      label: 'Active Normal Sales',
      value: overview.activeNormalSales,
    },
    {
      label: 'Active Bundle Sales',
      value: overview.activeBundleSales,
    },
    {
      label: 'Sales Events YTD',
      value: overview.salesEventsYtd,
    },
    {
      label: 'Sales Events MTD',
      value: overview.salesEventsMtd,
    },
  ];

  return (
    <section className="space-y-6">
      <section className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(212,239,217,0.5),transparent_30%),linear-gradient(160deg,#ffffff,#f4faf5)] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Operations Analytics
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          </div>
        </div>
      </section>

      <SectionShell
        title="Sales Event Snapshot"
        action={
          overview.nextLiveEvent ? (
            <AdminStatusBadge
              value={`${overview.nextLiveEvent.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle' : 'Normal'} · ${overview.nextLiveEvent.batchNumber || 'No batch'}`}
              tone="info"
            />
          ) : null
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr,1fr]">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Next Live Event</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">
                {nextLiveEventCountdown?.label || 'No live event'}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {overview.nextLiveEvent
                  ? `${overview.nextLiveEvent.name} · ${overview.nextLiveEvent.batchNumber || 'No batch'}`
                  : 'No active sales event'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{nextLiveEventCountdown?.detail || '—'}</p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Live Mix</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight">
                {overview.activeNormalSales + overview.activeBundleSales}
              </h3>
              <p className="mt-2 text-xs text-white/75">
                {overview.activeNormalSales} normal
              </p>
              <p className="text-xs text-white/75">{overview.activeBundleSales} bundle</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Normal Sales Live</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{overview.activeNormalSales}</h3>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bundle Sales Live</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{overview.activeBundleSales}</h3>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sales Events YTD</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{overview.salesEventsYtd}</h3>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sales Events MTD</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{overview.salesEventsMtd}</h3>
            </div>
          </div>
        </div>
      </SectionShell>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <OverviewMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            highlight={card.highlight}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
        <SectionShell
          title="Newest Customers"
          action={<AdminStatusBadge value={`${overview.recentCustomers?.length || 0} shown`} tone="neutral" />}
        >
          {overview.recentCustomers?.length ? (
            <div className={ui.tableWrap}>
              <table className={`${ui.table} min-w-[720px]`}>
                <thead>
                  <tr className={ui.tableHeadRow}>
                    <th className={ui.tableHeaderCell}>Name</th>
                    <th className={ui.tableHeaderCell}>Email</th>
                    <th className={ui.tableHeaderCell}>Phone</th>
                    <th className={ui.tableHeaderCell}>Status</th>
                    <th className={ui.tableHeaderCell}>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentCustomers.map((customer) => {
                    const customerStatus = getCustomerStatus(customer);
                    return (
                      <tr key={customer.id} className={ui.tableRow}>
                        <td className={ui.tableCell}>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-950">{customer.name || 'Unnamed customer'}</p>
                            <p className="text-xs text-slate-500">{customer.addressLine || 'No address provided yet'}</p>
                          </div>
                        </td>
                        <td className={`${ui.tableCell} break-all`}>{customer.email || 'No email provided'}</td>
                        <td className={ui.tableCell}>{customer.phone || 'No phone provided'}</td>
                        <td className={ui.tableCell}>
                          <AdminStatusBadge value={customerStatus.label} tone={customerStatus.tone} />
                        </td>
                        <td className={ui.tableCell}>{formatTimestamp(customer.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={ui.note}>No customers have been added yet.</p>
          )}
        </SectionShell>
      </div>
    </section>
  );
}
