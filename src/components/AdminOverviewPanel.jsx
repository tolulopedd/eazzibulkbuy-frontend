import { useEffect, useMemo, useState } from 'react';
import { ui } from '../ui/classes';
import { AdminStatusBadge } from './AdminTablePrimitives';

function formatCad(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatTimestamp(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCountdownParts(targetDate, now) {
  if (!targetDate) return null;
  const diffMs = new Date(targetDate).getTime() - now.getTime();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, label: 'Closed', detail: 'This live sales event has already reached its closing time.' };
  }
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return {
    days,
    hours,
    minutes,
    label: `${days}d ${hours}h ${minutes}m`,
    detail: `Closes ${formatTimestamp(targetDate)}`,
  };
}

function CountdownPanel({ countdown }) {
  if (!countdown) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f756b]">Next event closes</p>
        <h3 className="text-[1.9rem] font-bold tracking-tight text-[#171a16]">No live event</h3>
        <p className="text-sm text-[#6f756b]">No active sales event is currently running.</p>
      </div>
    );
  }

  const segments = [
    { label: 'Days', value: String(countdown.days || 0).padStart(2, '0') },
    { label: 'Hours', value: String(countdown.hours || 0).padStart(2, '0') },
    { label: 'Minutes', value: String(countdown.minutes || 0).padStart(2, '0') },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f756b]">Next event closes</p>
      <div className="grid grid-cols-3 gap-2.5">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-[20px] border border-[#dfe7df] bg-[#fbfbf8] px-3 py-3 text-center">
            <p className="text-[1.75rem] font-bold tracking-tight text-[#171a16]">{segment.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a7f75]">{segment.label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold text-[#171a16]">{countdown.label} remaining</p>
      <p className="text-sm text-[#6f756b]">{countdown.detail}</p>
    </div>
  );
}

function getCustomerStatus(customer) {
  return customer?.isActive ? { label: 'Active', tone: 'success' } : { label: 'Inactive', tone: 'neutral' };
}

function MetricCard({ label, value, sublabel, progress = 0, tone = 'default' }) {
  const isPrimary = tone === 'primary';

  return (
    <article className={[
      'rounded-[24px] border p-5',
      isPrimary ? 'border-[#d8eee8] bg-white' : 'border-[#e6e8dd] bg-white',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6f756b]">{label}</p>
        <AdminStatusBadge value={progress >= 100 ? 'On track' : 'Live'} tone={progress >= 100 ? 'success' : 'neutral'} />
      </div>
      <div className="mt-4 flex items-end gap-2">
        <h3 className="text-[2.2rem] font-bold tracking-tight text-[#171a16]">{value}</h3>
      </div>
      {sublabel ? <p className="mt-2 text-sm text-[#6f756b]">{sublabel}</p> : null}
      <div className="mt-5 h-2 rounded-full bg-[#eceee7]">
        <div className="h-2 rounded-full bg-[#2dc38b]" style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }} />
      </div>
    </article>
  );
}

function SectionCard({ title, children, aside }) {
  return (
    <section className="rounded-[28px] border border-[#e4e6dc] bg-white shadow-[0_1px_0_rgba(16,24,40,0.03)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#eceee5] px-5 py-4 sm:px-6">
        <h2 className="text-[1.45rem] font-bold tracking-tight text-[#171a16]">{title}</h2>
        {aside}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SalesSectionTitle() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8faf4] text-[#16a085]">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 16l5-5 4 4 7-8" />
          <path d="M20 10V6h-4" />
        </svg>
      </span>
      <span>Sales</span>
    </span>
  );
}

function MiniBarRow({ label, value, total, tone = 'mint' }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const toneClass = tone === 'dark' ? 'bg-[#1e1f1c]' : tone === 'green' ? 'bg-[#2dc38b]' : 'bg-[#4fd0c3]';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#21251f]">{label}</span>
        <span className="text-[#5f665d]">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#eceee7]">
        <div className={`h-2.5 rounded-full ${toneClass}`} style={{ width: `${Math.max(percent, value > 0 ? 8 : 0)}%` }} />
      </div>
    </div>
  );
}

function TrendChart({ data }) {
  const chartWidth = 640;
  const chartHeight = 240;
  const leftPadding = 30;
  const rightPadding = 10;
  const topPadding = 18;
  const bottomPadding = 34;
  const maxValue = Math.max(
    ...(data || []).flatMap((item) => [item.normalPaidItems || 0, item.bundlePaidItems || 0]),
    1,
  );
  const plotWidth = chartWidth - leftPadding - rightPadding;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const groupWidth = (data?.length || 1) > 0 ? plotWidth / (data.length || 1) : plotWidth;
  const gridSteps = 4;

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#666c63]">Paid items by sale type across the last 5 paid batches.</p>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#6f756b]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#47d0c0]" />
            <span>Normal sales</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1b1d1a]" />
            <span>Bundle discounted sales</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[260px] min-w-[620px] w-full" aria-label="Sales activity chart" role="img">
          {[...Array(gridSteps + 1)].map((_, index) => {
            const y = topPadding + (plotHeight / gridSteps) * index;
            const value = Math.round(maxValue - (maxValue / gridSteps) * index);
            return (
              <g key={`grid-${index}`}>
                <line x1={leftPadding} y1={y} x2={chartWidth - rightPadding} y2={y} stroke="#e7e8df" strokeWidth="1" />
                <text x={leftPadding - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#7a7f75">
                  {value}
                </text>
              </g>
            );
          })}

          {(data || []).map((item, index) => {
            const groupStartX = leftPadding + groupWidth * index;
            const barSlotWidth = Math.min(84, groupWidth * 0.64);
            const gap = Math.min(14, barSlotWidth * 0.18);
            const barWidth = (barSlotWidth - gap) / 2;
            const offsetX = (groupWidth - barSlotWidth) / 2;
            const normalHeight = maxValue > 0 ? ((item.normalPaidItems || 0) / maxValue) * plotHeight : 0;
            const bundleHeight = maxValue > 0 ? ((item.bundlePaidItems || 0) / maxValue) * plotHeight : 0;
            const normalX = groupStartX + offsetX;
            const bundleX = normalX + barWidth + gap;
            const normalY = topPadding + plotHeight - normalHeight;
            const bundleY = topPadding + plotHeight - bundleHeight;
            const labelX = groupStartX + groupWidth / 2;

            return (
              <g key={item.batchNumber}>
                <rect
                  x={normalX}
                  y={normalY}
                  width={barWidth}
                  height={Math.max(normalHeight, 6)}
                  rx="10"
                  fill="#47d0c0"
                />
                <rect
                  x={bundleX}
                  y={bundleY}
                  width={barWidth}
                  height={Math.max(bundleHeight, 6)}
                  rx="10"
                  fill="#1b1d1a"
                />
                <text
                  x={normalX + barWidth / 2}
                  y={Math.max(normalY - 8, 12)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#47d0c0"
                >
                  {item.normalPaidItems || 0}
                </text>
                <text
                  x={bundleX + barWidth / 2}
                  y={Math.max(bundleY - 8, 12)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#1b1d1a"
                >
                  {item.bundlePaidItems || 0}
                </text>
                <text x={labelX} y={chartHeight - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#7a7f75">
                  {item.batchNumber}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function AdminOverviewPanel({ reports, reportError, loadingReports }) {
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
          <h1 className="text-[2rem] font-bold tracking-tight text-[#171a16]">Dashboard</h1>
          <p className={ui.error}>{reportError}</p>
        </section>
      </section>
    );
  }

  if (!reports || !overview) {
    return (
      <section className="space-y-5">
        <section className={`${ui.card} space-y-4`}>
          <h1 className="text-[2rem] font-bold tracking-tight text-[#171a16]">Dashboard</h1>
          <p className={ui.note}>{loadingReports ? 'Loading dashboard analytics...' : 'No dashboard analytics are available yet.'}</p>
        </section>
      </section>
    );
  }

  const metricCards = [
    {
      label: 'Total Orders YTD',
      value: overview.totalOrdersYtd,
      sublabel: `${overview.totalOrdersMtd} this month`,
      progress: overview.totalOrdersYtd > 0 ? (overview.totalOrdersMtd / overview.totalOrdersYtd) * 100 : 0,
    },
    {
      label: 'Paid Orders YTD',
      value: overview.paidOrdersYtd,
      sublabel: `${overview.paidOrdersMtd} paid this month`,
      progress: overview.paidOrdersYtd > 0 ? (overview.paidOrdersMtd / overview.paidOrdersYtd) * 100 : 0,
    },
    {
      label: 'Pending Payment',
      value: overview.pendingPaymentOrders,
      sublabel: 'Orders waiting for payment confirmation',
      progress: overview.totalOrdersYtd > 0 ? (overview.pendingPaymentOrders / overview.totalOrdersYtd) * 100 : 0,
    },
    {
      label: 'Total Sales YTD',
      value: formatCad(overview.totalSalesYtd),
      sublabel: `${formatCad(overview.totalSalesMtd)} this month`,
      progress: overview.totalSalesYtd > 0 ? (overview.totalSalesMtd / overview.totalSalesYtd) * 100 : 0,
    },
  ];

  const trendData = overview.paidBatchSalesComparison || [];

  const newestCustomers = overview.recentCustomers || [];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_420px]">
        <SectionCard title={<SalesSectionTitle />}>
          <TrendChart data={trendData} />
        </SectionCard>

        <SectionCard
          title="Live event summary"
          aside={overview.nextLiveEvent ? <AdminStatusBadge value={overview.nextLiveEvent.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle live' : 'Normal live'} tone="success" /> : null}
        >
          <div className="space-y-5">
            <CountdownPanel countdown={nextLiveEventCountdown} />
            <div className="rounded-[24px] border border-[#e7e8df] bg-[#fbfbf8] p-4">
              <p className="text-sm font-semibold text-[#171a16]">{overview.nextLiveEvent ? overview.nextLiveEvent.name : 'No active sales event'}</p>
              <p className="mt-1 text-sm text-[#6f756b]">Batch {overview.nextLiveEvent?.batchNumber || '—'}</p>
              <p className="mt-1 text-sm text-[#6f756b]">{overview.nextLiveEvent?.pickupInstructions || 'Location not set'}</p>
            </div>
            <div className="space-y-4">
              <MiniBarRow label="Active normal sales" value={overview.activeNormalSales} total={Math.max(overview.activeNormalSales + overview.activeBundleSales, 1)} tone="mint" />
              <MiniBarRow label="Active bundle sales" value={overview.activeBundleSales} total={Math.max(overview.activeNormalSales + overview.activeBundleSales, 1)} tone="dark" />
              <MiniBarRow label="Sales events MTD" value={overview.salesEventsMtd} total={Math.max(overview.salesEventsYtd, 1)} tone="green" />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard title="Newest customers" aside={<span className="text-sm font-medium text-[#6c7268]">Top 5</span>}>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr className={ui.tableHeadRow}>
                  <th className={ui.tableHeaderCell}>Customer</th>
                  <th className={ui.tableHeaderCell}>Email</th>
                  <th className={ui.tableHeaderCell}>Phone</th>
                  <th className={ui.tableHeaderCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {newestCustomers.length ? (
                  newestCustomers.map((customer) => {
                    const status = getCustomerStatus(customer);
                    return (
                      <tr key={customer.id} className={ui.tableRow}>
                        <td className={`${ui.tableCell} font-semibold text-[#171a16]`}>{customer.name || 'Unnamed customer'}</td>
                        <td className={ui.tableCell}>{customer.email || '—'}</td>
                        <td className={ui.tableCell}>{customer.phone || '—'}</td>
                        <td className={ui.tableCell}>
                          <AdminStatusBadge value={status.label} tone={status.tone} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className={ui.tableRow}>
                    <td className={ui.tableCell} colSpan={4}>No customers have been added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Revenue and flow">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={ui.metricCard}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6f756b]">Total sales MTD</p>
                <h3 className="mt-2 text-[1.9rem] font-bold text-[#171a16]">{formatCad(overview.totalSalesMtd)}</h3>
              </div>
              <div className={ui.metricCard}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6f756b]">Sales events YTD</p>
                <h3 className="mt-2 text-[1.9rem] font-bold text-[#171a16]">{overview.salesEventsYtd}</h3>
              </div>
            </div>
            <div className="space-y-4">
              <MiniBarRow label="Orders this month" value={overview.totalOrdersMtd} total={Math.max(overview.totalOrdersYtd, 1)} tone="mint" />
              <MiniBarRow label="Paid orders this month" value={overview.paidOrdersMtd} total={Math.max(overview.paidOrdersYtd, 1)} tone="green" />
              <MiniBarRow label="Pending payment" value={overview.pendingPaymentOrders} total={Math.max(overview.totalOrdersYtd, 1)} tone="dark" />
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
