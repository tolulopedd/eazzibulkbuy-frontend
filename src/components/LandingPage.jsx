import { useEffect, useMemo, useState } from 'react';
import { fetchActiveSalesItems } from '../api/salesItems';
import { ui } from '../ui/classes';
import { getCartQuantityByItem, readCartItems, setCartQuantity } from '../utils/cart';
import BrandLogo from './BrandLogo';

const impactItems = [
  {
    name: 'Tomatoes',
    sold: '16,001 boxes distributed last year',
    image: '/images/products/tomatoes-box.jpg',
    fallback: 'https://source.unsplash.com/1200x800/?tomatoes,crate',
  },
  {
    name: 'Habanero',
    sold: '10,500 boxes distributed last year',
    image: '/images/products/habanero-box.jpg',
    fallback: 'https://source.unsplash.com/1200x800/?habanero,pepper,box',
  },
  {
    name: 'Green Pepper',
    sold: '13,500 boxes distributed last year',
    image: '/images/products/green-pepper-box.jpg',
    fallback: 'https://source.unsplash.com/1200x800/?green-pepper,vegetable,box',
  },
  {
    name: 'Yam',
    sold: '1,000 boxes distributed last year',
    image: '/images/products/yam-box.jpg',
    fallback: 'https://source.unsplash.com/1200x800/?yam,tuber,box',
  },
];

const valuePoints = [
  'Join active community orders in minutes.',
  'Pay securely and receive immediate confirmation.',
  'Pick up from agreed pickup point or get your items delivered.',
];

const flowSteps = [
  {
    title: 'Choose a live sales item',
    detail: 'Browse active products, compare unit pricing, and check the order window countdown.',
  },
  {
    title: 'Place your order',
    detail: 'Enter your details, select quantity, and complete payment through your preferred method.',
  },
  {
    title: 'Pick up with confidence',
    detail: 'Receive confirmation by email with your order reference and pickup instructions.',
  },
];

function getCountdownParts(targetDate, nowMs) {
  const diff = new Date(targetDate).getTime() - nowMs;
  if (diff <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

function ImpactImage({ item }) {
  const [src, setSrc] = useState(item.image);

  return (
    <img
      src={src}
      alt={`${item.name} in boxes`}
      loading="lazy"
      className="h-40 w-full rounded-xl bg-emerald-100 object-cover"
      onError={() => {
        if (src !== item.fallback) {
          setSrc(item.fallback);
        }
      }}
    />
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-emerald-900"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 animate-spin text-emerald-700"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" className="stroke-emerald-200" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="stroke-current"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10l9-5 9 5" />
      <path d="M5 10v8" />
      <path d="M9.5 10v8" />
      <path d="M14.5 10v8" />
      <path d="M19 10v8" />
      <path d="M3 20h18" />
    </svg>
  );
}

function renderBundleSummary(bundleItems = []) {
  if (!Array.isArray(bundleItems) || bundleItems.length === 0) {
    return null;
  }

  return bundleItems.map((item) => `${item.quantity} × ${item.name}`).join(', ');
}

function formatCountdownLabel(countdown) {
  if (!countdown) {
    return 'Order window closed';
  }

  if (countdown.days > 0) {
    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m left`;
  }

  return `${countdown.hours}h ${countdown.minutes}m left`;
}

export default function LandingPage({ onGoShop }) {
  const [activeItems, setActiveItems] = useState([]);
  const [cartItems, setCartItems] = useState(() => readCartItems());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#active-products');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || '#active-products');

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      setLoading(true);
      setError('');
      try {
        const items = await fetchActiveSalesItems();
        if (mounted) {
          setActiveItems(items);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load active products. Please try again.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      mounted = false;
    };
  }, []);

  const highlightedItems = useMemo(() => activeItems.slice(0, 6), [activeItems]);
  const cartQuantity = useMemo(() => getCartQuantityByItem(cartItems), [cartItems]);
  const selectedSalesCount = useMemo(
    () => cartItems.filter((item) => item.quantity > 0).length,
    [cartItems],
  );
  const nextClosingCountdown = useMemo(() => {
    const upcomingClosings = activeItems
      .map((item) => ({
        closingDate: item.closingDate,
        closesAt: new Date(item.closingDate).getTime(),
      }))
      .filter(({ closesAt }) => Number.isFinite(closesAt) && closesAt > nowMs)
      .sort((a, b) => a.closesAt - b.closesAt);

    if (upcomingClosings.length === 0) {
      return null;
    }

    return getCountdownParts(upcomingClosings[0].closingDate, nowMs);
  }, [activeItems, nowMs]);

  function getSelectedQuantity(salesItemId) {
    return cartItems.find((item) => item.salesItemId === salesItemId)?.quantity || 0;
  }

  function updateCartQuantity(salesItemId, nextQuantity) {
    setCartItems(setCartQuantity(salesItemId, nextQuantity));
  }

  function handleNavClick() {
    setMobileMenuOpen(false);
  }

  const headerLinks = [
    { label: 'Active Sales', href: '#active-products' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Community impact', href: '#community-impact' },
    { label: 'About us', href: '#about-us' },
  ];

  return (
    <div className={ui.shell}>
      <header className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-[#f5fff7] via-white to-[#eef8ff] px-4 py-4.5 shadow-[0_18px_42px_rgba(15,23,42,0.09)] backdrop-blur-md sm:px-5">
        <div className="flex items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-white/90 text-emerald-900 transition hover:bg-emerald-50 lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>

          <div className="hidden lg:block" />

          <nav
            aria-label="Primary"
            className="hidden lg:block lg:justify-self-center"
          >
            <ul className="flex items-center gap-1 rounded-full border border-emerald-200 bg-white/95 px-2 py-2 shadow-[0_14px_30px_rgba(16,185,129,0.09)]">
              {headerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={handleNavClick}
                    className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold transition ${
                      currentHash === link.href
                        ? 'bg-emerald-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex justify-end lg:justify-self-end">
            <div className="rounded-xl bg-white/88 px-1.5 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              <BrandLogo
                compact
                className="items-end gap-0 text-right"
                imageClassName="w-[5.5rem] sm:w-[6.5rem]"
              />
            </div>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav aria-label="Mobile primary" className="mt-3 rounded-2xl border border-emerald-100 bg-white p-2 shadow-[0_14px_30px_rgba(15,23,42,0.06)] lg:hidden">
            <ul className="grid gap-1">
              {headerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={handleNavClick}
                    className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      currentHash === link.href
                        ? 'bg-emerald-900 text-white'
                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <span>{link.label}</span>
                    <span aria-hidden="true">›</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <section id="active-products" className={`${ui.card} scroll-mt-28 space-y-4 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/40 to-[#eef9f1]`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {activeItems.length > 0 ? 'Live now' : 'Active Sales Events'}
            </span>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-3xl font-extrabold tracking-tight text-emerald-950 sm:text-[2.15rem]">
              Order now
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Choose from live normal sales and bundle discounted sales below. Add quantities, review your cart,
              and complete payment by Interac e-Transfer or card.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr_1.2fr]">
          <article className="rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-[0_12px_26px_rgba(16,185,129,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Live events</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-950">{activeItems.length}</p>
            <p className="mt-1 text-sm text-slate-600">
              {activeItems.length === 1
                ? '1 sales event is currently open for ordering.'
                : `${activeItems.length} sales events are currently open for ordering.`}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-[0_12px_26px_rgba(217,119,6,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">Next event closes</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950">
              {nextClosingCountdown ? formatCountdownLabel(nextClosingCountdown) : 'No active countdown'}
            </p>
            <p className="mt-1 text-sm text-slate-600">Review live items early so you do not miss the current order window.</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Checkout options</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                <BankIcon />
                <span>Interac e-Transfer</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                <CardIcon />
                <span>Credit card</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                <CardIcon />
                <span>Debit card</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Secure checkout with email confirmation after payment.
            </p>
          </article>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900">
            <LoadingSpinner />
            <span>Loading active sales events...</span>
          </div>
        ) : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {highlightedItems.map((item) => {
            const countdown = getCountdownParts(item.closingDate, nowMs);

            return (
              <article
                key={item.id}
                className="flex min-h-[250px] flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-emerald-950">{item.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {item.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle Discounted Sale' : 'Normal Sale'}
                        </span>
                        {countdown && countdown.days === 0 ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Closing soon
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {item.description ? <p className="text-sm leading-6 text-slate-600">{item.description}</p> : null}
                  {item.saleType === 'BUNDLE_DISCOUNTED_SALE' && Array.isArray(item.bundleItemsJson) && item.bundleItemsJson.length ? (
                    <p className="text-sm leading-6 text-slate-700">
                      Bundle includes: <span className="font-semibold">{renderBundleSummary(item.bundleItemsJson)}</span>
                    </p>
                  ) : null}
                  <div className="mt-auto grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">Price</p>
                      <p className="mt-1 text-lg font-extrabold text-emerald-950">CAD {(item.pricePerUnit / 100).toFixed(2)}</p>
                      <p className="text-xs font-medium text-slate-600">
                        {item.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'per bundle' : 'per unit'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-3 py-2.5 shadow-[0_8px_18px_rgba(10,107,67,0.16)]">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-800">Order closes in</span>
                      {countdown ? (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-sm tabular-nums">
                          <ClockIcon />
                          <span className="whitespace-nowrap font-extrabold text-emerald-900">{formatCountdownLabel(countdown)}</span>
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex font-semibold text-emerald-800">Order window closed</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                      {item.deliveryEnabled ? 'Pickup or delivery available' : 'Pickup available'}
                    </span>
                    {item.pickupInstructions ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        {item.pickupInstructions}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm font-medium text-emerald-900">
                    Add quantity to include this sales event in your cart.
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2.5">
                    <div>
                      <span className="text-sm font-semibold text-slate-700">Quantity</span>
                      <p className="text-xs text-slate-500">You can adjust this again in your cart.</p>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-lg font-semibold text-emerald-800 transition hover:bg-emerald-50"
                        onClick={() => updateCartQuantity(item.id, Math.max(0, getSelectedQuantity(item.id) - 1))}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        -
                      </button>
                      <span className="min-w-[2ch] text-center text-base font-bold text-emerald-950">
                        {getSelectedQuantity(item.id)}
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-lg font-semibold text-emerald-800 transition hover:bg-emerald-50"
                        onClick={() => updateCartQuantity(item.id, getSelectedQuantity(item.id) + 1)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && highlightedItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">No live sales right now.</p>
            <p className="mt-1">Please check back soon for the next sales event.</p>
          </div>
        ) : null}
        {!loading && highlightedItems.length > 0 ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-900 p-4 text-white shadow-[0_18px_32px_rgba(6,78,59,0.25)] sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-100">Cart ready</p>
              <p className="text-lg font-bold">
                {cartQuantity > 0
                  ? `${cartQuantity} item${cartQuantity === 1 ? '' : 's'} selected across ${selectedSalesCount} sales event${selectedSalesCount === 1 ? '' : 's'}.`
                  : 'Select quantities from the live sales events above to begin your order.'}
              </p>
              <p className="text-sm text-emerald-100">
                {cartQuantity > 0
                  ? 'Review your selection and continue to secure checkout.'
                  : 'Once you add items, you can continue with one order from your cart.'}
              </p>
            </div>
            <button
              type="button"
              className={`${ui.buttonPrimary} min-w-[190px] border border-emerald-300/30 bg-emerald-600 text-white shadow-[0_14px_24px_rgba(6,95,70,0.24)] hover:bg-emerald-500 ${cartQuantity === 0 ? 'cursor-not-allowed opacity-60' : ''}`}
              onClick={() => onGoShop()}
              disabled={cartQuantity === 0}
            >
              {cartQuantity > 0 ? 'Continue to cart' : 'Select items to continue'}
            </button>
          </div>
        ) : null}
      </section>

      <section id="about-us" className={`${ui.card} scroll-mt-28 grid gap-6 lg:grid-cols-[1.25fr_0.95fr]`}>
        <div className="space-y-5">
          <p className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Community-first bulk purchasing
          </p>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight py-2 text-emerald-950 sm:text-[2.1rem]">
            Bulk food ordering made simple, affordable, and reliable.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed py-1 text-slate-700">
            EazziBulkBuy connects Manitoba communities to fresh, high-quality produce through transparent group-buying,
            fair pricing, and convenient pickups
          </p>
          <ul className="grid gap-2.5 text-sm text-slate-700">
            {valuePoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 font-medium leading-6">
                <span className="mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 ring-2 ring-emerald-100" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside id="how-it-works" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-slate-50/85 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Quick preview</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">How EazziBulkBuy works</h2>
          <div className="mt-4 space-y-3">
            {flowSteps.map((step, index) => (
              <article key={step.title} className="rounded-xl border border-slate-200 bg-white p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-emerald-700">Step {index + 1}</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Orders close automatically when the countdown reaches zero.</p>
        </aside>
      </section>

      <section id="community-impact" className={`${ui.card} scroll-mt-28 space-y-3`}>
        <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Community impact</h2>
        <p className="text-sm leading-6 text-slate-600">Recent bulk produce volume delivered across community campaigns.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {impactItems.map((item) => (
            <article key={item.name} className="space-y-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-3">
              <ImpactImage item={item} />
              <h3 className="text-base font-bold text-emerald-950">{item.name}</h3>
              <p className="text-sm leading-6 text-slate-600">{item.sold}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="pb-2 pt-1 text-center text-sm leading-6 text-slate-600">
        <p>Copyright © EazziBulkBuy Canada</p>
        <p>Solution developed by <span className="font-semibold text-slate-900">Eazzime Technologies Inc.</span> 431-557-1227</p>
      </footer>
    </div>
  );
}
