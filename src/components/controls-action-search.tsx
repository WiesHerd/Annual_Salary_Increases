import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  FileText,
  Link2,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  CONTROLS_ACTION_GROUP_ORDER,
  searchControlsActions,
  type ControlsAction,
  type ControlsActionGroup,
} from '../lib/controls-actions';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';

export interface ControlsActionSearchProps {
  onSelectAction: (action: ControlsAction) => void;
  className?: string;
}

function GroupIcon({ group, className }: { group: ControlsActionGroup; className?: string }) {
  const props = { className: cn('h-4 w-4 shrink-0', className), 'aria-hidden': true as const };
  switch (group) {
    case 'Pay & equity':
      return <TrendingUp {...props} />;
    case 'Policies':
      return <FileText {...props} />;
    case 'Cycle & budget':
      return <Calendar {...props} />;
    case 'Data & mappings':
      return <Link2 {...props} />;
    case 'Go to':
      return <ArrowRight {...props} />;
    default:
      return <SlidersHorizontal {...props} />;
  }
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-h-[22px] items-center rounded border border-slate-200 bg-slate-50 px-1.5 font-sans text-[11px] font-medium text-slate-500">
      {children}
    </kbd>
  );
}

export function ControlsActionSearch({ onSelectAction, className }: ControlsActionSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => searchControlsActions(query, 12), [query]);

  const grouped = useMemo(() => {
    const map = new Map<ControlsActionGroup, ControlsAction[]>();
    for (const g of CONTROLS_ACTION_GROUP_ORDER) map.set(g, []);
    for (const action of results) {
      map.get(action.group)?.push(action);
    }
    return CONTROLS_ACTION_GROUP_ORDER.map((g) => ({ group: g, items: map.get(g) ?? [] })).filter(
      (x) => x.items.length > 0
    );
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = useCallback(
    (action: ControlsAction) => {
      onSelectAction(action);
      setOpen(false);
    },
    [onSelectAction]
  );

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault();
      pick(flatResults[activeIndex]);
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-result-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  let resultIdx = 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/80 sm:min-w-[300px] sm:max-w-[360px]',
          className
        )}
        aria-label="Open configuration search"
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-500" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-500">Search configuration</span>
        <span className="hidden sm:flex items-center gap-0.5">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            'fixed top-[min(18vh,140px)] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl flex-col -translate-x-1/2 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl',
            'rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-0'
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Search configuration</DialogTitle>
          <DialogDescription className="sr-only">
            Find and open configuration areas in Controls
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search by task or area…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              aria-label="Search configuration tasks"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              Esc
            </button>
          </div>

          <div
            ref={listRef}
            className="max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain py-1"
            role="listbox"
            aria-label="Configuration search results"
          >
            {flatResults.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-slate-600">
                  {query.trim() ? `No results for "${query}"` : 'No matching tasks'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try policy, equity, merit matrix, budget, or import.
                </p>
              </div>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group} role="presentation">
                  <p className="sticky top-0 z-[1] bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 backdrop-blur-sm">
                    {group}
                  </p>
                  {items.map((action) => {
                    const idx = resultIdx++;
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-result-idx={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => pick(action)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                          active ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border mt-0.5',
                            active
                              ? 'border-indigo-200 bg-white text-indigo-600'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          )}
                        >
                          <GroupIcon group={action.group} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {action.title}
                          </span>
                          <span className="block truncate text-xs text-slate-500 mt-0.5">
                            {action.breadcrumb}
                          </span>
                          {active && (
                            <span className="mt-1 block text-xs leading-snug text-slate-500 line-clamp-2">
                              {action.subtitle}
                            </span>
                          )}
                        </span>
                        {active && (
                          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4 border-t border-slate-200 bg-slate-50/90 px-4 py-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span>Open</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd>
              <span>Close</span>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
