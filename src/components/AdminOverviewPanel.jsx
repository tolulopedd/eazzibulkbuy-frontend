import { ui } from '../ui/classes';

export default function AdminOverviewPanel({
  reports,
  reportError,
  loadingReports,
  activeSalesSummary,
}) {
  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Dashboard</h1>
        </div>

        {reportError ? <p className={ui.error}>{reportError}</p> : null}

        {reports ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <h3 className="text-xl font-bold text-slate-900">CAD {(reports.summary.totalRevenue / 100).toFixed(2)}</h3>
              <p className="text-sm text-slate-600">Total revenue</p>
            </article>
          </div>
        ) : (
          <p className={ui.note}>{loadingReports ? 'Loading overview metrics...' : 'Metrics will appear after reports are loaded.'}</p>
        )}

        <section className={`${ui.section} space-y-2`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Active bulk sales</h2>
              <p className="text-sm text-slate-600">See whether there is any live bulk sale currently open for buyers.</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                activeSalesSummary?.count
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeSalesSummary?.count ? `${activeSalesSummary.count} live` : 'No live sales'}
            </span>
          </div>

          {activeSalesSummary?.count ? (
            <p className="text-sm leading-6 text-slate-700">
              Ongoing now: {activeSalesSummary.names.join(', ')}
              {activeSalesSummary.hasMore ? ' and more.' : '.'}
            </p>
          ) : (
            <p className={ui.note}>There are no active bulk sales open right now.</p>
          )}
        </section>
      </section>
    </section>
  );
}
