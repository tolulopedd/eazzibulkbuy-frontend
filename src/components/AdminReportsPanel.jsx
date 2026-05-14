import { useState } from 'react';
import { ui } from '../ui/classes';

const DEFAULT_FILTERS = {
  startDate: '',
  endDate: '',
  salesItemId: '',
  batchNumber: '',
  reportType: 'all',
};

const REPORT_OPTIONS = [
  { value: 'all', label: 'All reports overview' },
  { value: 'batchOrders', label: 'Orders per batch number' },
  { value: 'payments', label: 'Payments and statuses' },
  { value: 'deliveryOrders', label: 'Orders with delivery option' },
  { value: 'pickupOrders', label: 'Orders with pickup option' },
  { value: 'customerOrders', label: 'Orders with customer details' },
  { value: 'sales', label: 'Sales report' },
  { value: 'pendingPickup', label: 'Orders pending pickup' },
];

function toIsoBoundary(value, endOfDay = false) {
  if (!value) return '';
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).toISOString();
}

function formatCad(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatLabel(value) {
  if (!value) return 'Unknown';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSalesLabel(item) {
  if (!item) return 'Unknown';
  return item.batchNumber ? `${item.salesItemName} · ${item.batchNumber}` : item.salesItemName;
}

function ReportTable({ columns, rows, emptyMessage }) {
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr className={ui.tableHeadRow}>
            {columns.map((column) => (
              <th key={column.key} className={ui.tableHeaderCell}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row.id || row.orderReference || row.batchNumber || `${index}`} className={ui.tableRow}>
                {columns.map((column) => (
                  <td key={column.key} className={ui.tableCell}>
                    {column.render ? column.render(row) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr className={ui.tableRow}>
              <td className={ui.tableCell} colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminReportsPanel({ reports, reportError, loadingReports, onRefreshReports }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  async function applyFilters(event) {
    event.preventDefault();
    await onRefreshReports({
      startDate: toIsoBoundary(filters.startDate),
      endDate: toIsoBoundary(filters.endDate, true),
      salesItemId: filters.salesItemId,
      batchNumber: filters.batchNumber,
      reportType: filters.reportType,
    });
  }

  async function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    await onRefreshReports();
  }

  const salesItems = reports?.filterOptions?.salesItems || [];
  const activeReportType = reports?.filters?.reportType || filters.reportType;

  const allOverviewRows = reports ? [
    { area: 'Overview', metric: 'Total orders', value: reports.summary.totalOrders, notes: 'All orders in the selected report range.' },
    { area: 'Overview', metric: 'Paid orders', value: reports.summary.paidOrders, notes: 'Orders with confirmed payment.' },
    { area: 'Overview', metric: 'Pending payment', value: reports.summary.pendingOrders, notes: 'Orders still waiting for payment or review.' },
    { area: 'Overview', metric: 'Total revenue', value: formatCad(reports.summary.totalRevenue), notes: 'Revenue from paid orders only.' },
    { area: 'Overview', metric: 'Active bulk sales', value: reports.summary.activeBulkSales, notes: 'Bulk sales still open right now.' },
    { area: 'Fulfilment', metric: 'Pickup orders', value: reports.summary.pickupOrders, notes: 'Orders marked for pickup.' },
    { area: 'Fulfilment', metric: 'Delivery orders', value: reports.summary.deliveryOrders, notes: 'Orders marked for delivery.' },
    { area: 'Fulfilment', metric: 'Pending pickup orders', value: reports.summary.pendingPickupOrders, notes: 'Paid pickup orders still awaiting collection.' },
  ] : [];

  const overviewColumns = [
    { key: 'area', label: 'Report area' },
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
    { key: 'notes', label: 'Notes' },
  ];

  const batchColumns = [
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'salesItemName', label: 'Bulk sale' },
    { key: 'totalOrders', label: 'All orders' },
    { key: 'paidOrders', label: 'Paid orders' },
    { key: 'deliveryOrders', label: 'Delivery orders' },
    { key: 'pickupOrders', label: 'Pickup orders' },
    { key: 'revenue', label: 'Revenue', render: (row) => formatCad(row.revenue) },
  ];

  const paymentColumns = [
    { key: 'orderReference', label: 'Order reference' },
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'buyerName', label: 'Customer' },
    { key: 'paymentMethod', label: 'Payment method', render: (row) => formatLabel(row.paymentMethod) },
    { key: 'paymentStatus', label: 'Payment status', render: (row) => formatLabel(row.paymentStatus) },
    { key: 'orderStatus', label: 'Order status', render: (row) => formatLabel(row.orderStatus) },
    { key: 'totalAmount', label: 'Amount', render: (row) => formatCad(row.totalAmount) },
  ];

  const deliveryColumns = [
    { key: 'orderReference', label: 'Order reference' },
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'buyerName', label: 'Customer' },
    { key: 'buyerPhone', label: 'Phone' },
    { key: 'buyerAddress', label: 'Address' },
    { key: 'fulfillmentStatusLabel', label: 'Delivery status' },
    { key: 'totalAmount', label: 'Amount', render: (row) => formatCad(row.totalAmount) },
  ];

  const pickupColumns = [
    { key: 'orderReference', label: 'Order reference' },
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'buyerName', label: 'Customer' },
    { key: 'buyerPhone', label: 'Phone' },
    { key: 'location', label: 'Pickup point' },
    { key: 'fulfillmentStatusLabel', label: 'Pickup status' },
    { key: 'paidAt', label: 'Paid at', render: (row) => formatDateTime(row.paidAt) },
  ];

  const customerColumns = [
    { key: 'orderReference', label: 'Order reference' },
    { key: 'buyerName', label: 'Customer' },
    { key: 'buyerEmail', label: 'Email' },
    { key: 'buyerPhone', label: 'Phone' },
    { key: 'buyerAddress', label: 'Address' },
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'salesItemName', label: 'Bulk sale' },
    { key: 'fulfillmentMethod', label: 'Pickup / delivery', render: (row) => formatLabel(row.fulfillmentMethod) },
  ];

  const salesColumns = [
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'salesItemName', label: 'Bulk sale' },
    { key: 'totalOrders', label: 'Orders' },
    { key: 'paidOrders', label: 'Paid orders' },
    { key: 'revenue', label: 'Revenue', render: (row) => formatCad(row.revenue) },
  ];

  const pendingPickupColumns = [
    { key: 'orderReference', label: 'Order reference' },
    { key: 'batchNumber', label: 'Batch number' },
    { key: 'buyerName', label: 'Customer' },
    { key: 'buyerPhone', label: 'Phone' },
    { key: 'location', label: 'Pickup point' },
    { key: 'paidAt', label: 'Paid at', render: (row) => formatDateTime(row.paidAt) },
    { key: 'fulfillmentStatusLabel', label: 'Fulfilment status' },
  ];

  function renderActiveReport() {
    if (!reports) {
      return <p className={ui.note}>{loadingReports ? 'Loading reports...' : 'No report data available yet.'}</p>;
    }

    if (activeReportType === 'batchOrders') {
      return <ReportTable columns={batchColumns} rows={reports.batchOrderRows || []} emptyMessage="No batch orders found for the selected filters." />;
    }

    if (activeReportType === 'payments') {
      return <ReportTable columns={paymentColumns} rows={reports.paymentOrderRows || []} emptyMessage="No payment rows found for the selected filters." />;
    }

    if (activeReportType === 'deliveryOrders') {
      return <ReportTable columns={deliveryColumns} rows={reports.deliveryOrderRows || []} emptyMessage="No delivery orders found for the selected filters." />;
    }

    if (activeReportType === 'pickupOrders') {
      return <ReportTable columns={pickupColumns} rows={reports.pickupOrderRows || []} emptyMessage="No pickup orders found for the selected filters." />;
    }

    if (activeReportType === 'customerOrders') {
      return <ReportTable columns={customerColumns} rows={reports.customerOrderRows || []} emptyMessage="No customer orders found for the selected filters." />;
    }

    if (activeReportType === 'sales') {
      return <ReportTable columns={salesColumns} rows={reports.batchOrderRows || []} emptyMessage="No sales report rows found for the selected filters." />;
    }

    if (activeReportType === 'pendingPickup') {
      return <ReportTable columns={pendingPickupColumns} rows={reports.pendingPickupRows || []} emptyMessage="No pending pickup orders found for the selected filters." />;
    }

    return <ReportTable columns={overviewColumns} rows={allOverviewRows} emptyMessage="No overview data found for the selected filters." />;
  }

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Reports</h1>
          <p className="leading-6 text-slate-600">Track batches, payments, customer orders, pickup orders, delivery orders, and pending pickup work from one place.</p>
        </div>

        <form className={`${ui.section} space-y-4`} onSubmit={applyFilters}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Start date</label>
              <input className={ui.input} type="date" value={filters.startDate} onChange={(e) => setFilters((current) => ({ ...current, startDate: e.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>End date</label>
              <input className={ui.input} type="date" value={filters.endDate} onChange={(e) => setFilters((current) => ({ ...current, endDate: e.target.value }))} />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Bulk sale</label>
              <select className={ui.select} value={filters.salesItemId} onChange={(e) => setFilters((current) => ({ ...current, salesItemId: e.target.value }))}>
                <option value="">All bulk sales</option>
                {salesItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.batchNumber ? ` · ${item.batchNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Batch number</label>
              <input className={ui.input} value={filters.batchNumber} onChange={(e) => setFilters((current) => ({ ...current, batchNumber: e.target.value }))} placeholder="TOM-APR-2026-A" />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Report view</label>
              <select className={ui.select} value={filters.reportType} onChange={(e) => setFilters((current) => ({ ...current, reportType: e.target.value }))}>
                {REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
          </div>
        </form>

        {reportError ? <p className={ui.error}>{reportError}</p> : null}

        {renderActiveReport()}
      </section>
    </section>
  );
}
