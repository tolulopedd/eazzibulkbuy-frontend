import { useEffect, useRef, useState } from 'react';
import { ui } from '../ui/classes';
import { exportAdminReports } from '../api/admin';

const DEFAULT_FILTERS = {
  startDate: '',
  endDate: '',
  salesItemId: '',
  batchNumber: '',
  fulfillmentMethod: '',
  fulfillmentStatus: '',
  reportType: 'orderReady',
};

const REPORT_OPTIONS = [
  { value: 'orderReady', label: 'Order Ready (Paid)' },
  { value: 'supplierOrders', label: 'Items to Order from Supplier (Paid)' },
  { value: 'salesDetails', label: 'Sales Details Report' },
];

function toIsoBoundary(value, endOfDay = false) {
  if (!value) return '';
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).toISOString();
}

function formatDisplayDate(value) {
  if (!value) {
    return 'Select date';
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCad(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function DateFilterField({ label, value, onChange }) {
  return (
    <div className={ui.fieldWrap}>
      <label className={ui.label}>{label}</label>
      <div className="relative">
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          type="date"
          value={value}
          onChange={onChange}
          aria-label={label}
        />
        <div className={`${ui.input} flex min-h-[46px] items-center justify-between gap-3`}>
          <span className={value ? 'text-emerald-950' : 'text-slate-400'}>{formatDisplayDate(value)}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ReportTable({ columns, rows, emptyMessage }) {
  return (
    <div className={ui.tableWrap}>
      <table className={`${ui.table} min-w-[980px]`}>
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
              <tr key={row.id || row.displayOrderReference || `${index}`} className={ui.tableRow}>
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const didInitFiltersRef = useRef(false);

  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      onRefreshReports({
        startDate: toIsoBoundary(filters.startDate),
        endDate: toIsoBoundary(filters.endDate, true),
        salesItemId: filters.salesItemId,
        batchNumber: filters.batchNumber,
        fulfillmentMethod: filters.fulfillmentMethod,
        fulfillmentStatus: filters.fulfillmentStatus,
        reportType: filters.reportType,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters.startDate, filters.endDate, filters.salesItemId, filters.batchNumber, filters.fulfillmentMethod, filters.fulfillmentStatus, filters.reportType]);

  async function applyFilters(event) {
    event.preventDefault();
    await onRefreshReports({
      startDate: toIsoBoundary(filters.startDate),
      endDate: toIsoBoundary(filters.endDate, true),
      salesItemId: filters.salesItemId,
      batchNumber: filters.batchNumber,
      fulfillmentMethod: filters.fulfillmentMethod,
      fulfillmentStatus: filters.fulfillmentStatus,
      reportType: filters.reportType,
    });
  }

  async function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    await onRefreshReports({
      reportType: DEFAULT_FILTERS.reportType,
    });
  }

  async function handleExport() {
    setExporting(true);
    setExportError('');
    try {
      const { blob, fileName } = await exportAdminReports({
        startDate: toIsoBoundary(filters.startDate),
        endDate: toIsoBoundary(filters.endDate, true),
        salesItemId: filters.salesItemId,
        batchNumber: filters.batchNumber,
        fulfillmentMethod: filters.fulfillmentMethod,
        fulfillmentStatus: filters.fulfillmentStatus,
        reportType: filters.reportType,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error.message || 'Unable to export this report right now.');
    } finally {
      setExporting(false);
    }
  }

  const salesItems = reports?.filterOptions?.salesItems || [];
  const activeReportType = reports?.filters?.reportType || filters.reportType;
  const activeReportLabel = REPORT_OPTIONS.find((option) => option.value === activeReportType)?.label || 'Reports';

  const orderReadyColumns = [
    { key: 'displayOrderReference', label: 'Order Number' },
    { key: 'items', label: 'Items' },
    { key: 'quantities', label: 'Quantities' },
  ];

  const supplierColumns = [
    { key: 'batchNumber', label: 'Batch No' },
    { key: 'salesType', label: 'Sales Type' },
    { key: 'itemName', label: 'Items' },
    { key: 'totalQuantity', label: 'Total Quantity' },
  ];

  const salesDetailsColumns = [
    { key: 'displayOrderReference', label: 'Order No' },
    { key: 'orderDetails', label: 'Order Details' },
    { key: 'fulfillment', label: 'Fulfilment' },
    { key: 'totalAmount', label: 'Total Amount', render: (row) => formatCad(row.totalAmount) },
  ];

  function renderActiveReport() {
    if (!reports) {
      return <p className={ui.note}>{loadingReports ? 'Loading reports...' : 'No report data available yet.'}</p>;
    }

    if (activeReportType === 'supplierOrders') {
      return <ReportTable columns={supplierColumns} rows={reports.supplierOrderRows || []} emptyMessage="No supplier order rows found for the selected filters." />;
    }

    if (activeReportType === 'salesDetails') {
      return <ReportTable columns={salesDetailsColumns} rows={reports.salesDetailRows || []} emptyMessage="No sales details found for the selected filters." />;
    }

    return <ReportTable columns={orderReadyColumns} rows={reports.orderReadyRows || []} emptyMessage="No paid orders are ready for the selected filters." />;
  }

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">{activeReportLabel}</h1>
          <p className="leading-6 text-slate-600">Select the report you want, then refine it with batch, date, fulfilment, and sales event filters.</p>
          <p className="text-sm text-slate-500">Filters update automatically as you change them.</p>
        </div>

        <form className={`${ui.section} space-y-4`} onSubmit={applyFilters}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
            <DateFilterField
              label="Start date"
              value={filters.startDate}
              onChange={(e) => setFilters((current) => ({ ...current, startDate: e.target.value }))}
            />
            <DateFilterField
              label="End date"
              value={filters.endDate}
              onChange={(e) => setFilters((current) => ({ ...current, endDate: e.target.value }))}
            />
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Sales event</label>
              <select className={ui.select} value={filters.salesItemId} onChange={(e) => setFilters((current) => ({ ...current, salesItemId: e.target.value }))}>
                <option value="">All sales events</option>
                {salesItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.batchNumber ? ` · ${item.batchNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Batch number</label>
              <input
                className={ui.input}
                value={filters.batchNumber}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    batchNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3),
                  }))
                }
                placeholder="AZ1"
                maxLength={3}
              />
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Report</label>
              <select className={ui.select} value={filters.reportType} onChange={(e) => setFilters((current) => ({ ...current, reportType: e.target.value }))}>
                {REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Pickup or delivery</label>
              <select
                className={ui.select}
                value={filters.fulfillmentMethod}
                onChange={(e) => setFilters((current) => ({ ...current, fulfillmentMethod: e.target.value }))}
              >
                <option value="">All orders</option>
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Fulfilment status</label>
              <select
                className={ui.select}
                value={filters.fulfillmentStatus}
                onChange={(e) => setFilters((current) => ({ ...current, fulfillmentStatus: e.target.value }))}
              >
                <option value="">All statuses</option>
                <option value="PENDING_PICKUP">Pending pickup</option>
                <option value="PICKED_UP">Picked up</option>
                <option value="PENDING_DELIVERY">Pending delivery</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className={ui.buttonGhost} onClick={handleExport} disabled={loadingReports || exporting}>
              {exporting ? 'Exporting...' : 'Download to Excel'}
            </button>
            <button type="button" className={ui.buttonGhost} onClick={clearFilters} disabled={loadingReports}>
              Clear filters
            </button>
          </div>
        </form>

        {reportError ? <p className={ui.error}>{reportError}</p> : null}
        {exportError ? <p className={ui.error}>{exportError}</p> : null}

        {renderActiveReport()}
      </section>
    </section>
  );
}
