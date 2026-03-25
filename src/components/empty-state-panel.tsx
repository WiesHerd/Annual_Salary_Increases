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
  containerClassName,
}: EmptyStatePanelProps) {
  const containerCls =
    containerClassName ??
    (compact
      ? 'app-card flex min-h-[14rem] items-center justify-center px-6 py-10 text-center text-slate-600'
      : 'app-card flex min-h-[min(20rem,42vh)] items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16');

  return (
    <div className={containerCls}>
      <div className="w-full max-w-md">
        {title && <h2 className="text-base font-semibold text-slate-800 mb-2 tracking-tight">{title}</h2>}
        <div className="text-sm leading-relaxed text-slate-600">{message}</div>
        {children != null && <div className="mt-6 flex flex-col items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

