import { useState } from 'react';
import { ui } from '../ui/classes';
import BrandLogo from './BrandLogo';

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

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
    <section className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8dbd1] bg-white text-[#4b5148] transition hover:bg-[#f7f8f4] sm:left-6 sm:top-6"
        aria-label="Back to home"
        title="Back to home"
      >
        <ArrowLeftIcon />
      </button>

      <div className="w-full max-w-[540px] space-y-7">
        <form className="rounded-[30px] border border-[#e3e6db] bg-white px-8 py-9 shadow-[0_1px_0_rgba(16,24,40,0.03)] sm:px-10 sm:py-10" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex justify-center">
              <BrandLogo align="center" compact imageClassName="w-[5.25rem]" imageWidth="168px" />
            </div>
            <h1 className="text-[2.05rem] font-bold tracking-tight text-[#171a16]">Sign in</h1>
            <p className="text-base leading-7 text-[#6f756b]">Welcome back to the EazziBulkBuy admin console.</p>
          </div>

          <div className="mt-7 space-y-4">
            <div className={ui.fieldWrap}>
              <input
                className={ui.input}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Email *"
              />
            </div>

            <div className={ui.fieldWrap}>
              <div className="relative">
                <input
                  className={`${ui.input} pr-12`}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Password *"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7d8378] transition hover:text-[#171a16]"
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm leading-6 text-[#5f665d]">
                <input
                  className="h-4 w-4 rounded border-[#cfd3c7] text-emerald-700 focus:ring-[#46d2b8]"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              {onForgotPassword ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[#171a16] transition hover:text-[#199f82]"
                  onClick={onForgotPassword}
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <button type="submit" className={`${ui.buttonPrimary} w-full text-base`} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            {error ? <p className={ui.error}>{error}</p> : null}
            <p className="pt-1 text-center text-sm leading-6 text-[#6f756b]">Admin access is restricted to approved EazziBulkBuy personnel.</p>
          </div>
        </form>
      </div>
    </section>
  );
}
