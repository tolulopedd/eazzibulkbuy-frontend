import { ui } from '../ui/classes';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function AdminStatusBadge({ value, tone = 'neutral' }) {
  const toneClasses = {
    success: 'border border-[#b8eedf] bg-[#ebfbf5] text-[#169777]',
    warning: 'border border-[#f2dfae] bg-[#fff8e3] text-[#9d7610]',
    danger: 'border border-[#f1cccc] bg-[#fff1f1] text-[#c14d4d]',
    info: 'border border-[#cfeee8] bg-[#effbf8] text-[#118f79]',
    neutral: 'border border-[#e1e4d9] bg-[#f6f7f2] text-[#666d64]',
  };

  return (
    <span className={cx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[tone] || toneClasses.neutral)}>
      {value}
    </span>
  );
}

export function AdminIconButton({ label, onClick, children, disabled = false, title }) {
  return (
    <button
      type="button"
      className={ui.iconButton}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title || label}
    >
      {children}
    </button>
  );
}

export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path d="M4 6h16v12H4z" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function AdminPagination({ page, totalPages, total, onPrev, onNext, label }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebece4] px-4 py-3">
      <button type="button" className={ui.buttonGhost} onClick={onPrev} disabled={page <= 1}>
        Previous
      </button>
      <p className="text-sm text-[#6f756b]">
        {label || `Page ${page} of ${totalPages}`} · {total} total
      </p>
      <button type="button" className={ui.buttonGhost} onClick={onNext} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  );
}

export function AdminTableEmpty({ message }) {
  return <div className="px-4 py-8 text-center text-sm text-[#767c72]">{message}</div>;
}
