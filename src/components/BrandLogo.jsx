function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function BrandLogo({
  subtitle,
  align = 'left',
  compact = false,
  className = '',
  imageClassName = '',
}) {
  return (
    <div
      className={cx(
        'flex flex-col gap-1',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <img
        src="/images/brand/eazzibulkbuy-logo.png"
        alt="EazziBulkBuy"
        className={cx(
          'h-auto object-contain',
          compact ? 'w-44 sm:w-48' : 'w-56 sm:w-64',
          imageClassName,
        )}
      />
      {subtitle ? <p className="text-sm leading-5 text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
