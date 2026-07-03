import { useState } from 'react';
import { ui } from '../ui/classes';
import BrandLogo from './BrandLogo';

export default function AdminLogin({ onLogin, onBack, onForgotPassword, loading, error }) {
  const [email, setEmail] = useState(() => localStorage.getItem('adminRememberEmail') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('adminRememberMe') !== '0');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (rememberMe) {
      localStorage.setItem('adminRememberEmail', normalizedEmail);
      localStorage.setItem('adminRememberMe', '1');
    } else {
      localStorage.removeItem('adminRememberEmail');
      localStorage.setItem('adminRememberMe', '0');
    }

    await onLogin({ email: normalizedEmail, password });
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="fixed left-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white/90 text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-800 sm:left-6 sm:top-6"
        aria-label="Back to home"
        title="Back to home"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <form className={`${ui.card} mx-auto w-full max-w-xl space-y-4 p-4 sm:p-5`} onSubmit={handleSubmit}>
        <div className="space-y-1 text-center">
          <div className="flex justify-center">
            <BrandLogo align="center" compact imageClassName="w-32 sm:w-36" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Sign in</h2>
          <p className={ui.note}>Enter your account credentials to continue.</p>
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

        <div className={ui.fieldWrap}>
          <label className={ui.label}>Password</label>
          <div className="relative">
            <input
              className={`${ui.input} pr-11`}
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
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
          {onForgotPassword ? (
            <button
              type="button"
              className="w-fit text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm leading-6 text-slate-700">
          <input
            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me on this device
        </label>

        <div className="flex justify-center pt-1">
          <button type="submit" className={`${ui.buttonPrimary} min-w-28`} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        {error ? <p className={ui.error}>{error}</p> : null}
      </form>

      <p className="pt-1 text-center text-sm leading-6 text-slate-600">© {new Date().getFullYear()} EazziBulkBuy Inc. Canada</p>
    </section>
  );
}
