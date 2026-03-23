import { useState, type ReactNode } from 'react';

function InfoCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function InfoIconTip({
  'aria-label': ariaLabel,
  children,
  align = 'left',
  variant = 'default',
}: {
  'aria-label': string;
  children: ReactNode;
  align?: 'left' | 'right';
  /** `minimal` — light icon for dense admin toolbars. */
  variant?: 'default' | 'minimal';
}) {
  const [open, setOpen] = useState(false);
  const btnClass =
    variant === 'minimal'
      ? 'h-7 w-7 rounded-full border-0 bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 inline-flex items-center justify-center shrink-0'
      : 'h-7 w-7 rounded-full border border-slate-200/90 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 inline-flex items-center justify-center shrink-0';

  return (
    <div className="relative inline-flex items-center shrink-0 align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={btnClass}
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <InfoCircleIcon className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full mt-1.5 z-50 w-max max-w-[min(20rem,calc(100vw-2rem))] px-3 py-2.5 bg-white border border-slate-200/90 rounded-xl shadow-lg shadow-slate-900/5 text-[13px] text-slate-600 leading-snug space-y-2 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
