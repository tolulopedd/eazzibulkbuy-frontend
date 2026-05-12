import { useEffect, useMemo, useState } from 'react';
import { acceptAdminInvite } from '../api/admin';
import { ui } from '../ui/classes';
import BrandLogo from './BrandLogo';

export default function AdminInviteAccept({ onGoAdmin, onBackHome }) {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!status) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onGoAdmin();
    }, 2000);

    return () => clearTimeout(timer);
  }, [status, onGoAdmin]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setError('');

    if (!token) {
      setError('Invite token is missing. Please use the full invite link from your email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      await acceptAdminInvite({ token, password });
      setStatus('Invite accepted. Your account is ready. Redirecting to sign in...');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Unable to accept invite. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <button
        type="button"
        onClick={onBackHome}
        className="fixed left-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white/90 text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-800 sm:left-6 sm:top-6"
        aria-label="Back to home"
        title="Back to home"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={`${ui.glass} ${ui.card} mx-auto w-full max-w-xl space-y-1.5 p-4 text-center sm:p-5`}>
        <BrandLogo align="center" compact imageClassName="w-40 sm:w-44" />
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Set your password</h1>
        <p className="text-sm leading-6 text-slate-600">Complete account setup to access the admin and logistics portal.</p>
      </div>

      <form className={`${ui.card} mx-auto w-full max-w-xl space-y-4 p-4 sm:p-5`} onSubmit={handleSubmit}>
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Accept invite</h2>
          <p className={ui.note}>Set a secure password to activate your invited account.</p>
        </div>

        <div className={ui.fieldWrap}>
          <label className={ui.label}>New password</label>
          <div className="relative">
            <input
              className={`${ui.input} pr-11`}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-emerald-700"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.4 5.1A10.7 10.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-4.4 4.9" />
                  <path d="M6.7 6.7C3.8 8.5 2 12 2 12a17 17 0 0 0 6.4 6.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={ui.fieldWrap}>
          <label className={ui.label}>Confirm password</label>
          <div className="relative">
            <input
              className={`${ui.input} pr-11`}
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-emerald-700"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              title={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
            >
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.4 5.1A10.7 10.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-4.4 4.9" />
                  <path d="M6.7 6.7C3.8 8.5 2 12 2 12a17 17 0 0 0 6.4 6.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-center pt-1">
          <button type="submit" className={`${ui.buttonPrimary} min-w-32`} disabled={loading || !token}>
            {loading ? 'Setting password...' : 'Set password'}
          </button>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            onClick={onGoAdmin}
          >
            Go to sign in
          </button>
        </div>

        {!token ? <p className={ui.error}>Invite token not found in URL.</p> : null}
        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}
      </form>

      <p className="pt-1 text-center text-sm leading-6 text-slate-600">© {new Date().getFullYear()} EazziBulkBuy Inc. Canada</p>
    </section>
  );
}
