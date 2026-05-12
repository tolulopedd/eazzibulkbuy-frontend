import { useEffect, useState } from 'react';
import {
  adminLogin,
  adminLogout,
  adminMe,
  createSalesItem,
  fetchAdminReports,
  fetchAdminSalesItems,
  fetchAdminCustomers,
  fetchAdminOrders,
  fetchAdminUsers,
  createAdminUser,
  inviteAdminUser,
  updateSalesItem,
  deleteSalesItem,
  confirmAdminInteracPayment,
  fetchAdminPaymentProofViewUrl,
  resendAdminPaymentConfirmation,
} from '../api/admin';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import { ui } from '../ui/classes';

export default function AdminModule({ onBackHome, onGoForgotPassword }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Unable to create sales item. Please try again.');
      throw err;
    }
  }

  async function handleLoadReports(query = {}) {
    return fetchAdminReports(query);
  }

  async function handleLoadSalesItems(query = {}) {
    return fetchAdminSalesItems(query);
  }

  async function handleLoadUsers(query = {}) {
    return fetchAdminUsers(query);
  }

  async function handleLoadCustomers(query = {}) {
    return fetchAdminCustomers(query);
  }

  async function handleLoadOrders(query = {}) {
    return fetchAdminOrders(query);
  }

  async function handleConfirmInteracPayment(orderReference) {
    setError('');
    try {
      return await confirmAdminInteracPayment(orderReference);
    } catch (err) {
      setError(err.message || 'Unable to confirm Interac payment. Please try again.');
      throw err;
    }
  }

  async function handleResendPaymentConfirmation(orderReference) {
    setError('');
    try {
      return await resendAdminPaymentConfirmation(orderReference);
    } catch (err) {
      setError(err.message || 'Unable to resend payment confirmation. Please try again.');
      throw err;
    }
  }

  async function handleLoadPaymentProofViewUrl(orderReference) {
    setError('');
    try {
      return await fetchAdminPaymentProofViewUrl(orderReference);
    } catch (err) {
      setError(err.message || 'Unable to load the payment proof preview.');
      throw err;
    }
  }

  async function handleCreateUser(payload) {
    setError('');
    try {
      await createAdminUser(payload);
    } catch (err) {
      setError(err.message || 'Unable to create user account. Please try again.');
      throw err;
    }
  }

  async function handleInviteUser(payload) {
    setError('');
    try {
      return await inviteAdminUser(payload);
    } catch (err) {
      setError(err.message || 'Unable to create user invite. Please try again.');
      throw err;
    }
  }

  async function handleUpdateSalesItem(salesItemId, payload) {
    setError('');
    try {
      await updateSalesItem(salesItemId, payload);
    } catch (err) {
      setError(err.message || 'Unable to update sales item. Please try again.');
      throw err;
    }
  }

  async function handleDeleteSalesItem(salesItemId) {
    setError('');
    try {
      await deleteSalesItem(salesItemId);
    } catch (err) {
      setError(err.message || 'Unable to delete sales item. Please try again.');
      throw err;
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
        onLoadUsers={handleLoadUsers}
        onLoadCustomers={handleLoadCustomers}
        onLoadOrders={handleLoadOrders}
        onConfirmInteracPayment={handleConfirmInteracPayment}
        onLoadPaymentProofViewUrl={handleLoadPaymentProofViewUrl}
        onResendPaymentConfirmation={handleResendPaymentConfirmation}
        onCreateUser={handleCreateUser}
        onInviteUser={handleInviteUser}
        onLogout={handleLogout}
      />
    </>
  );
}
