import { useState } from 'react';
import { requestAdminPasswordReset } from '../api/admin';
import { ui } from '../ui/classes';
import BrandLogo from './BrandLogo';

export default function AdminForgotPassword({ onGoAdmin, onBackHome }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);

    try {
      const result = await requestAdminPasswordReset({ email });
      setStatus(result.message || 'If an account exists for that email, a reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Unable to request password reset. Please try again.');
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
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Forgot password</h1>
        <p className="text-sm leading-6 text-slate-600">Enter your admin or partner email to receive a reset link.</p>
      </div>

      <form className={`${ui.card} mx-auto w-full max-w-xl space-y-4 p-4 sm:p-5`} onSubmit={handleSubmit}>
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Request reset link</h2>
          <p className={ui.note}>We will email you a secure password reset link.</p>
        </div>

        <div className={ui.fieldWrap}>
          <label className={ui.label}>Email</label>
          <input
            className={ui.input}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@eazzibulkbuy.com"
          />
        </div>

        <div className="flex justify-center pt-1">
          <button type="submit" className={`${ui.buttonPrimary} min-w-36`} disabled={loading}>
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </div>

        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}
      </form>

      <p className="pt-1 text-center text-sm leading-6 text-slate-600">© {new Date().getFullYear()} EazziBulkBuy Inc. Canada</p>
    </section>
  );
}
