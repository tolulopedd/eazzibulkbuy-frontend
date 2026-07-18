import { useEffect, useState } from 'react';
import {
  adminLogin,
  adminLogout,
  adminMe,
  createSalesItem,
  fetchAdminReports,
  fetchAdminSalesItems,
  fetchAdminCustomers,
  updateAdminCustomer,
  exportAdminCustomers,
  fetchAdminOrders,
  updateSalesItem,
  deleteSalesItem,
  confirmAdminInteracPayment,
  fetchAdminPaymentProofViewUrl,
  resendAdminPaymentConfirmation,
  updateAdminFulfillmentStatus,
} from '../api/admin';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import { ui } from '../ui/classes';

const ADMIN_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const ADMIN_ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

export default function AdminModule({ onBackHome, onGoForgotPassword }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleUnauthorizedSession(message = 'Your admin session expired. Please sign in again.') {
    setAuthenticated(false);
    setAdminSession(null);
    setError(message);
  }

  function rethrowWithSessionHandling(err, fallbackMessage) {
    if (err?.status === 401) {
      handleUnauthorizedSession();
      throw err;
    }

    setError(err.message || fallbackMessage);
    throw err;
  }

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const session = await adminMe();
        if (mounted) {
          setAuthenticated(true);
          setAdminSession(session);
        }
      } catch {
        if (mounted) {
          setAuthenticated(false);
          setAdminSession(null);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      return undefined;
    }

    let timerId = null;

    function expireForInactivity() {
      adminLogout().catch(() => {});
      handleUnauthorizedSession('Your admin session ended after 5 minutes of inactivity. Please sign in again.');
    }

    function resetIdleTimer() {
      if (timerId) {
        window.clearTimeout(timerId);
      }

      timerId = window.setTimeout(expireForInactivity, ADMIN_SESSION_TIMEOUT_MS);
    }

    resetIdleTimer();
    ADMIN_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
      ADMIN_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [authenticated, adminSession?.email]);

  async function handleLogin(credentials) {
    setLoading(true);
    setError('');
    try {
      const session = await adminLogin(credentials);
      setAuthenticated(true);
      setAdminSession(session);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSalesItem(payload) {
    setError('');
    try {
      await createSalesItem(payload);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to create sales item. Please try again.');
    }
  }

  async function handleLoadReports(query = {}) {
    try {
      return await fetchAdminReports(query);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to load reports right now.');
    }
  }

  async function handleLoadSalesItems(query = {}) {
    try {
      return await fetchAdminSalesItems(query);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to load sales events right now.');
    }
  }

  async function handleLoadCustomers(query = {}) {
    try {
      return await fetchAdminCustomers(query);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to load customers right now.');
    }
  }

  async function handleUpdateCustomer(customerId, payload) {
    setError('');
    try {
      return await updateAdminCustomer(customerId, payload);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to update customer details. Please try again.');
    }
  }

  async function handleExportCustomers(query = {}) {
    setError('');
    try {
      return await exportAdminCustomers(query);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to export customers right now.');
    }
  }

  async function handleLoadOrders(query = {}) {
    try {
      return await fetchAdminOrders(query);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to load payments and fulfilment right now.');
    }
  }

  async function handleConfirmInteracPayment(orderReference) {
    setError('');
    try {
      return await confirmAdminInteracPayment(orderReference);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to confirm Interac payment. Please try again.');
    }
  }

  async function handleResendPaymentConfirmation(orderReference) {
    setError('');
    try {
      return await resendAdminPaymentConfirmation(orderReference);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to resend payment confirmation. Please try again.');
    }
  }

  async function handleLoadPaymentProofViewUrl(orderReference) {
    setError('');
    try {
      return await fetchAdminPaymentProofViewUrl(orderReference);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to load the payment proof preview.');
    }
  }

  async function handleUpdateFulfillmentStatus(orderReference, fulfillmentStatus, itemIndex) {
    setError('');
    try {
      return await updateAdminFulfillmentStatus(orderReference, fulfillmentStatus, itemIndex);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to update pickup or delivery status. Please try again.');
    }
  }

  async function handleUpdateSalesItem(salesItemId, payload) {
    setError('');
    try {
      await updateSalesItem(salesItemId, payload);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to update sales item. Please try again.');
    }
  }

  async function handleDeleteSalesItem(salesItemId) {
    setError('');
    try {
      await deleteSalesItem(salesItemId);
    } catch (err) {
      rethrowWithSessionHandling(err, 'Unable to delete sales item. Please try again.');
    }
  }

  async function handleLogout() {
    await adminLogout();
    setAuthenticated(false);
    setAdminSession(null);
    onBackHome();
  }

  if (checking) {
    return (
      <section className={`${ui.card} mx-auto w-full max-w-4xl`}>
        <p className="text-slate-700">Checking your admin session...</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <AdminLogin
        onLogin={handleLogin}
        onBack={onBackHome}
        onForgotPassword={onGoForgotPassword}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <>
      {error ? <p className={`${ui.error} mx-auto mb-3 w-full max-w-[1280px]`}>{error}</p> : null}
      <AdminDashboard
        currentAdmin={adminSession}
        canManageSales={adminSession?.isSuperAdmin || adminSession?.role === 'ADMIN'}
        isSuperAdmin={Boolean(adminSession?.isSuperAdmin || adminSession?.role === 'SUPERADMIN')}
        onLoadReports={handleLoadReports}
        onCreateSalesItem={handleCreateSalesItem}
        onLoadSalesItems={handleLoadSalesItems}
        onUpdateSalesItem={handleUpdateSalesItem}
        onDeleteSalesItem={handleDeleteSalesItem}
        onLoadCustomers={handleLoadCustomers}
        onUpdateCustomer={handleUpdateCustomer}
        onExportCustomers={handleExportCustomers}
        onLoadOrders={handleLoadOrders}
        onConfirmInteracPayment={handleConfirmInteracPayment}
        onLoadPaymentProofViewUrl={handleLoadPaymentProofViewUrl}
        onResendPaymentConfirmation={handleResendPaymentConfirmation}
        onUpdateFulfillmentStatus={handleUpdateFulfillmentStatus}
        onLogout={handleLogout}
      />
    </>
  );
}
