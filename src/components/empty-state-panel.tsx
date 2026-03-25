import type { ReactNode } from 'react';

export type EmptyStatePanelProps = {
  title?: string;
  message: ReactNode;
  /**
   * Optional action(s) displayed below the message.
   * Use e.g. a `<button />` or a small link row.
   */
  children?: ReactNode;
  /** When true, use compact padding (for inline cards). */
  compact?: boolean;
  /** Optional icon rendered above the title. */
  icon?: ReactNode;
  /** Advanced: override outer wrapper classes (useful when you're already inside an `app-card`). */
  containerClassName?: string;
};

/**
 * One shared empty-state layout across the app.
 * Keeps visuals consistent while allowing per-screen copy/actions.
 */
export function EmptyStatePanel({
  title,
  message,
  children,
  compact = false,
  icon,
  containerClassName,
}: EmptyStatePanelProps) {
  const containerCls =
    containerClassName ??
    (compact
      ? 'app-card relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-50/30 via-white to-white px-6 py-10 text-center text-slate-600'
      : 'app-card flex min-h-[min(20rem,42vh)] items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16');

  return (
    <div className={containerCls}>
      {compact && (
        <div
          className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400"
          aria-hidden
        />
      )}
      <div className="relative w-full max-w-md">
        {compact && (
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            {icon ?? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16h.01M12 12v-1m0-8a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
              </svg>
            )}
          </div>
        )}
        {title && <h2 className="text-base font-semibold text-slate-800 mb-2 tracking-tight">{title}</h2>}
        <div className="text-sm leading-relaxed text-slate-600">{message}</div>
        {children != null && <div className="mt-6 flex flex-col items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

