import type { HelpSection } from './types';

export type TableOfContentsProps = {
  items: Pick<HelpSection, 'id' | 'title'>[];
  activeId: string;
  onNavigate: (id: string) => void;
  /** Visible label above the list */
  label?: string;
  className?: string;
  /** Called after navigation (e.g. close mobile drawer) */
  onAfterNavigate?: () => void;
};

/**
 * Semantic in-page navigation. Buttons avoid mutating `location.hash` (SPA-safe) while remaining
 * keyboard-activatable (Enter / Space). `aria-current` marks the section in view.
 */
export function TableOfContents({
  items,
  activeId,
  onNavigate,
  label = 'On this page',
  className = '',
  onAfterNavigate,
}: TableOfContentsProps) {
  return (
    <nav className={className} aria-label={label}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <ol className="mt-3 list-none space-y-0.5 p-0">
        {items.map((item, index) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={isActive ? 'true' : undefined}
                className={`w-full rounded-md py-1.5 pl-2 pr-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-indigo-50 font-semibold text-indigo-900 ring-1 ring-indigo-200/80'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                onClick={() => {
                  onNavigate(item.id);
                  onAfterNavigate?.();
                }}
              >
                <span className="mr-1.5 font-medium tabular-nums text-slate-400" aria-hidden>
                  {index + 1}.
                </span>
                {item.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
