import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import OrderForm from './components/OrderForm';
import LandingPage from './components/LandingPage';
import AdminModule from './components/AdminModule';
import AdminInviteAccept from './components/AdminInviteAccept';
import AdminForgotPassword from './components/AdminForgotPassword';
import AdminResetPassword from './components/AdminResetPassword';
import { useOrderPlacement } from './hooks/useOrderPlacement';
import { ui } from './ui/classes';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

export default function App() {
  const {
    loading,
    error,
    submitOrder,
    submitSetPaymentMethod,
    submitPaymentIntent,
    submitManualTransferUploadUrl,
    submitManualTransferConfirmation,
    submitCardPaymentConfirmation,
  } = useOrderPlacement();
  const salesItemId = new URLSearchParams(window.location.search).get('salesItemId') || '';
  const [path, setPath] = useState(window.location.pathname);

  const pageClass = `${ui.pageBase} ${path === '/' ? ui.pageLanding : ui.pageSoft}`;

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath);
    setPath(window.location.pathname);
  }

  return (
    <Elements stripe={stripePromise}>
      <main className={pageClass}>
        {path.startsWith('/admin/invite') ? (
          <AdminInviteAccept onGoAdmin={() => navigate('/admin')} onBackHome={() => navigate('/')} />
        ) : path.startsWith('/admin/forgot-password') ? (
          <AdminForgotPassword onGoAdmin={() => navigate('/admin')} onBackHome={() => navigate('/')} />
        ) : path.startsWith('/admin/reset-password') ? (
          <AdminResetPassword onGoAdmin={() => navigate('/admin')} onBackHome={() => navigate('/')} />
        ) : path.startsWith('/admin') ? (
          <AdminModule onBackHome={() => navigate('/')} onGoForgotPassword={() => navigate('/admin/forgot-password')} />
        ) : path === '/shop' ? (
          <div className="mx-auto w-full max-w-[1280px] space-y-5 pt-12 sm:pt-14 lg:pt-10">
            <button
              type="button"
              className="fixed left-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white/90 text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-800 sm:left-6 sm:top-6"
              onClick={() => navigate('/')}
              aria-label="Back to home"
              title="Back to home"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <OrderForm
              salesItemId={salesItemId}
              onCreateOrder={submitOrder}
              onSetOrderPaymentMethod={submitSetPaymentMethod}
              onCreatePaymentIntent={submitPaymentIntent}
              onCreateManualTransferUploadUrl={submitManualTransferUploadUrl}
              onConfirmManualTransfer={submitManualTransferConfirmation}
              onConfirmCardPayment={submitCardPaymentConfirmation}
              stripeConfigured={Boolean(stripePublishableKey)}
            />
            {error ? <p className={ui.error}>{error}</p> : null}
          </div>
        ) : (
          <LandingPage
            onGoShop={() => navigate('/shop')}
          />
        )}
      </main>
    </Elements>
  );
}
