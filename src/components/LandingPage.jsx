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

function renderBundleSummary(bundleItems = []) {
  if (!Array.isArray(bundleItems) || bundleItems.length === 0) {
    return null;
  }

  return bundleItems.map((item) => `${item.quantity} × ${item.name}`).join(', ');
}

export default function LandingPage({ onGoShop, onGoAdmin }) {
  const [activeItems, setActiveItems] = useState([]);
  const [cartItems, setCartItems] = useState(() => readCartItems());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
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

  function getSelectedQuantity(salesItemId) {
    return cartItems.find((item) => item.salesItemId === salesItemId)?.quantity || 0;
  }

  function updateCartQuantity(salesItemId, nextQuantity) {
    setCartItems(setCartQuantity(salesItemId, nextQuantity));
  }

  return (
    <div className={ui.shell}>
      <header className={`${ui.card} ${ui.glass} flex flex-wrap items-center justify-between gap-4`}>
        <BrandLogo subtitle="Manitoba Canada" compact imageClassName="w-44 sm:w-48" />
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <p className="text-sm font-medium text-slate-600">Admin | Partners portal</p>
          <button type="button" className={ui.buttonPrimary} onClick={onGoAdmin}>
            Sign in
          </button>
        </div>
      </header>

      <section id="active-products" className={`${ui.card} space-y-3`}>
        <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Active Sales Events</h2>
        <p className="mb-2 text-sm leading-6 text-slate-600">Start your order directly from any live normal sale or bundle discounted sale below.</p>
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm font-medium text-emerald-900">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Payment options</span>
          <span>Pay with credit card, debit card  or Interac e-Transfer.</span>
        </div>
        {loading ? <p className={ui.note}>Loading active products...</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {highlightedItems.map((item) => {
            const countdown = getCountdownParts(item.closingDate, nowMs);

            return (
              <article
                key={item.id}
                className="flex min-h-[200px] flex-col justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4"
              >
                <div className="space-y-2.5">
                  <h3 className="text-lg font-bold text-emerald-950">{item.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {item.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'Bundle Discounted Sale' : 'Normal Sale'}
                    </span>
                  </div>
                  {item.description ? <p className="text-sm leading-6 text-slate-600">{item.description}</p> : null}
                  {item.saleType === 'BUNDLE_DISCOUNTED_SALE' && Array.isArray(item.bundleItemsJson) && item.bundleItemsJson.length ? (
                    <p className="text-sm leading-6 text-slate-700">Bundle: {renderBundleSummary(item.bundleItemsJson)}</p>
                  ) : null}
                  <p className="text-sm leading-6 text-slate-700">Price: CAD {(item.pricePerUnit / 100).toFixed(2)} {item.saleType === 'BUNDLE_DISCOUNTED_SALE' ? 'per bundle' : 'per unit'}</p>
                  <p className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-emerald-50 px-3 py-2 shadow-[0_8px_18px_rgba(10,107,67,0.16)] animate-pulse">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-800">Order closes in</span>
                    {countdown ? (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-sm tabular-nums">
                        <ClockIcon />
                        <span className="whitespace-nowrap font-extrabold text-emerald-900">{countdown.days} Days:</span>
                        <span className="whitespace-nowrap font-semibold text-emerald-700">{countdown.hours} Hours: {countdown.minutes} Mins Left</span>
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex font-semibold text-emerald-800">Order window closed</span>
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2.5">
                    <span className="text-sm font-semibold text-slate-700">Quantity</span>
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
                  {item.deliveryEnabled ? (
                    <p className="text-xs font-medium leading-5 text-emerald-800">Pickup and delivery available for this sales event.</p>
                  ) : (
                    <p className="text-xs font-medium leading-5 text-slate-500">Pickup available for this sales event.</p>
                  )}
                  <p className="text-xs font-medium leading-5 text-slate-600">Checkout supports credit cards and Interac e-Transfer.</p>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && highlightedItems.length === 0 ? (
          <p className={ui.note}>No active products available right now. Please check back soon.</p>
        ) : null}
        {!loading && highlightedItems.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-950">Your selected active products</p>
              <p className="text-sm leading-6 text-slate-600">
                {cartQuantity > 0 ? `${cartQuantity} item${cartQuantity === 1 ? '' : 's'} ready in your cart.` : 'Add quantities above, then continue with one order.'}
              </p>
            </div>
            <button
              type="button"
              className={`${ui.buttonPrimary} min-w-[160px] ${cartQuantity === 0 ? 'cursor-not-allowed opacity-60' : ''}`}
              onClick={() => onGoShop()}
              disabled={cartQuantity === 0}
            >
              Order now
            </button>
          </div>
        ) : null}
      </section>

      <section className={`${ui.card} grid gap-6 lg:grid-cols-[1.25fr_0.95fr]`}>
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

        <aside className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4 sm:p-5">
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

      <section className={`${ui.card} space-y-3`}>
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
        <p>Copyright © EazziBulkBuy Inc. Canada</p>
      </footer>
    </div>
  );
}
