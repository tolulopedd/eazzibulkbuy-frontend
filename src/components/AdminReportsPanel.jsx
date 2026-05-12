import { useState } from 'react';
import { ui } from '../ui/classes';

const DEFAULT_FILTERS = {
  startDate: '',
  endDate: '',
  salesItemId: '',
  reportType: 'all',
};

function toIsoBoundary(value, endOfDay = false) {
  if (!value) {
    return '';
  }

  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).toISOString();
}

function formatCad(cents) {
  return `CAD ${(cents / 100).toFixed(2)}`;
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

const REPORT_CONTENT = {
  all: {
    title: 'All reports overview',
    description: 'See a high-level snapshot across performance, payments, bookings, delivery, and logistics.',
  },
  sales: {
    title: 'Sales report',
    description: 'Review bulk sale performance, confirmed orders, and revenue by item.',
  },
  payments: {
    title: 'Payments report',
    description: 'Track payment methods, paid revenue, and payment status outcomes.',
  },
  bookings: {
    title: 'Bookings report',
    description: 'Review order volumes by booking and order status.',
  },
  delivery: {
    title: 'Delivery report',
    description: 'Track order activity and revenue by sales location.',
  },
  logistics: {
    title: 'Logistics report',
    description: 'Monitor live bulk sales and active locations for operations planning.',
  },
};

export default function AdminReportsPanel({ reports, reportError, loadingReports, onRefreshReports }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  async function applyFilters(event) {
    event.preventDefault();
    await onRefreshReports({
      startDate: toIsoBoundary(filters.startDate),
      endDate: toIsoBoundary(filters.endDate, true),
      salesItemId: filters.salesItemId,
      reportType: filters.reportType,
    });
  }

  async function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    await onRefreshReports();
  }

  const salesItems = reports?.filterOptions?.salesItems || [];
  const activeReportType = reports?.filters?.reportType || filters.reportType;
  const reportContent = REPORT_CONTENT[activeReportType] || REPORT_CONTENT.all;

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Reports</h1>
          <p className="leading-6 text-slate-600">Track all performance, payments and sales.</p>
        </div>

        <form className={`${ui.section} space-y-4`} onSubmit={applyFilters}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Start date</label>
              <input
                className={ui.input}
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((current) => ({ ...current, startDate: e.target.value }))}
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>End date</label>
              <input
                className={ui.input}
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((current) => ({ ...current, endDate: e.target.value }))}
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Bulk sale</label>
              <select
                className={ui.select}
                value={filters.salesItemId}
                onChange={(e) => setFilters((current) => ({ ...current, salesItemId: e.target.value }))}
              >
                <option value="">All bulk sales</option>
                {salesItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Report view</label>
              <select
                className={ui.select}
                value={filters.reportType}
                onChange={(e) => setFilters((current) => ({ ...current, reportType: e.target.value }))}
              >
                <option value="all">All reports</option>
                <option value="sales">Sales</option>
                <option value="payments">Payments</option>
                <option value="bookings">Bookings</option>
                <option value="delivery">Delivery</option>
                <option value="logistics">Logistics</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={ui.buttonPrimary} disabled={loadingReports}>
              {loadingReports ? 'Loading reports...' : 'Apply report filters'}
            </button>
            <button type="button" className={ui.buttonGhost} onClick={clearFilters} disabled={loadingReports}>
              Clear filters
            </button>
            <button type="button" className={ui.buttonGhost} onClick={() => onRefreshReports({
              startDate: toIsoBoundary(filters.startDate),
              endDate: toIsoBoundary(filters.endDate, true),
              salesItemId: filters.salesItemId,
              reportType: filters.reportType,
            })} disabled={loadingReports}>
              {loadingReports ? 'Refreshing reports...' : 'Refresh reports'}
            </button>
          </div>
        </form>

        {reportError ? <p className={ui.error}>{reportError}</p> : null}

        {reports ? (
          <>
            <div className={`${ui.section} space-y-2`}>
              <h2 className="text-lg font-bold tracking-tight text-emerald-950">{reportContent.title}</h2>
              <p className="text-sm leading-6 text-slate-600">{reportContent.description}</p>
            </div>

            {activeReportType === 'all' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.totalOrders}</h3>
                    <p className="text-sm text-slate-600">Total orders</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.paidOrders}</h3>
                    <p className="text-sm text-slate-600">Paid orders</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.pendingOrders}</h3>
                    <p className="text-sm text-slate-600">Pending payment</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{formatCad(reports.summary.totalRevenue)}</h3>
                    <p className="text-sm text-slate-600">Total revenue</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.activeBulkSales}</h3>
                    <p className="text-sm text-slate-600">Active bulk sales</p>
                  </article>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className={`${ui.section} space-y-3`}>
                    <h3 className="font-semibold text-slate-900">Sales snapshot</h3>
                    {reports.salesBreakdown.slice(0, 5).map((item) => (
                      <p key={item.salesItemId} className="text-sm leading-6 text-slate-700">
                        {item.salesItemName}: {item.totalOrders} orders, {formatCad(item.revenue)}
                      </p>
                    ))}
                  </div>
                  <div className={`${ui.section} space-y-3`}>
                    <h3 className="font-semibold text-slate-900">Payment snapshot</h3>
                    {reports.paymentBreakdown.byMethod.map((item) => (
                      <p key={item.paymentMethod} className="text-sm leading-6 text-slate-700">
                        {formatStatusLabel(item.paymentMethod)}: {item.totalOrders} orders
                      </p>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {activeReportType === 'sales' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.totalOrders}</h3>
                    <p className="text-sm text-slate-600">Orders in scope</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.paidOrders}</h3>
                    <p className="text-sm text-slate-600">Paid orders</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{formatCad(reports.summary.totalRevenue)}</h3>
                    <p className="text-sm text-slate-600">Confirmed revenue</p>
                  </article>
                </div>
                <div className={`${ui.section} space-y-3`}>
                  {reports.salesBreakdown.length ? (
                    reports.salesBreakdown.map((item) => (
                      <div key={item.salesItemId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="font-semibold text-slate-900">{item.salesItemName}</p>
                        <p className="text-sm leading-6 text-slate-700">
                          {item.totalOrders} total orders, {item.confirmedOrders} confirmed orders, {formatCad(item.revenue)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className={ui.note}>No sales data for the current filters.</p>
                  )}
                </div>
              </>
            ) : null}

            {activeReportType === 'payments' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{formatCad(reports.paymentBreakdown.paidRevenue)}</h3>
                    <p className="text-sm text-slate-600">Paid revenue</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.manualReviewOrders}</h3>
                    <p className="text-sm text-slate-600">Transfers awaiting review</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.paymentBreakdown.byStatus.length}</h3>
                    <p className="text-sm text-slate-600">Payment statuses</p>
                  </article>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className={`${ui.section} space-y-2`}>
                    <h3 className="font-semibold text-slate-900">By payment method</h3>
                    {reports.paymentBreakdown.byMethod.length ? (
                      reports.paymentBreakdown.byMethod.map((item) => (
                        <p key={item.paymentMethod} className="text-sm leading-6 text-slate-700">
                          {formatStatusLabel(item.paymentMethod)}: {item.totalOrders} orders, {formatCad(item.totalAmount)}
                        </p>
                      ))
                    ) : (
                      <p className={ui.note}>No payment method data for the current filters.</p>
                    )}
                  </div>
                  <div className={`${ui.section} space-y-2`}>
                    <h3 className="font-semibold text-slate-900">By payment status</h3>
                    {reports.paymentBreakdown.byStatus.length ? (
                      reports.paymentBreakdown.byStatus.map((item) => (
                        <p key={item.paymentStatus} className="text-sm leading-6 text-slate-700">
                          {formatStatusLabel(item.paymentStatus)}: {item.totalOrders} orders
                        </p>
                      ))
                    ) : (
                      <p className={ui.note}>No payment status data for the current filters.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {activeReportType === 'bookings' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.totalOrders}</h3>
                    <p className="text-sm text-slate-600">Total bookings</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.bookingBreakdown.length}</h3>
                    <p className="text-sm text-slate-600">Booking statuses</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.pendingOrders}</h3>
                    <p className="text-sm text-slate-600">Pending bookings</p>
                  </article>
                </div>
                <div className={`${ui.section} space-y-3`}>
                  {reports.bookingBreakdown.length ? (
                    reports.bookingBreakdown.map((item) => (
                      <div key={item.status} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="font-semibold text-slate-900">{formatStatusLabel(item.status)}</p>
                        <p className="text-sm leading-6 text-slate-700">{item.totalOrders} bookings</p>
                      </div>
                    ))
                  ) : (
                    <p className={ui.note}>No booking data for the current filters.</p>
                  )}
                </div>
              </>
            ) : null}

            {activeReportType === 'delivery' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.deliveryBreakdown.length}</h3>
                    <p className="text-sm text-slate-600">Delivery locations</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.paidOrders}</h3>
                    <p className="text-sm text-slate-600">Paid deliveries</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{formatCad(reports.summary.totalRevenue)}</h3>
                    <p className="text-sm text-slate-600">Revenue in scope</p>
                  </article>
                </div>
                <div className={`${ui.section} space-y-3`}>
                  {reports.deliveryBreakdown.length ? (
                    reports.deliveryBreakdown.map((item) => (
                      <div key={item.location} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="font-semibold text-slate-900">{item.location}</p>
                        <p className="text-sm leading-6 text-slate-700">
                          {item.totalOrders} orders, {item.confirmedOrders} confirmed, {formatCad(item.totalRevenue)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className={ui.note}>No delivery data for the current filters.</p>
                  )}
                </div>
              </>
            ) : null}

            {activeReportType === 'logistics' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.summary.activeBulkSales}</h3>
                    <p className="text-sm text-slate-600">Live bulk sales</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.logisticsBreakdown.activeLocations.length}</h3>
                    <p className="text-sm text-slate-600">Active locations</p>
                  </article>
                  <article className={ui.metricCard}>
                    <h3 className="text-xl font-bold text-slate-900">{reports.logisticsBreakdown.liveSales.length}</h3>
                    <p className="text-sm text-slate-600">Sales to plan for</p>
                  </article>
                </div>
                <div className={`${ui.section} space-y-3`}>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Active locations</h3>
                    {reports.logisticsBreakdown.activeLocations.length ? (
                      <p className="text-sm leading-6 text-slate-700">
                        {reports.logisticsBreakdown.activeLocations.join(', ')}
                      </p>
                    ) : (
                      <p className={ui.note}>No active logistics locations right now.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Live bulk sales</h3>
                    {reports.logisticsBreakdown.liveSales.length ? (
                      reports.logisticsBreakdown.liveSales.map((item) => (
                        <p key={item.salesItemId} className="text-sm leading-6 text-slate-700">
                          {item.salesItemName} closes {new Date(item.closingDate).toLocaleString()} at {item.location}
                        </p>
                      ))
                    ) : (
                      <p className={ui.note}>No live bulk sales for logistics planning.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className={ui.note}>{loadingReports ? 'Loading reports...' : 'No report data available yet.'}</p>
        )}
      </section>
    </section>
  );
}
