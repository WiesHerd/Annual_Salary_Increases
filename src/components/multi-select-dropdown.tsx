/**
 * Multi-select dropdown with search. Use for target scope filters, filters, etc.
 * When options are provided, constrains selection to known values; falls back to
 * free-text when options are empty (e.g. no data loaded yet).
 */

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** When true, show as compact inline button (e.g. filter bar). When false, full-width form style. */
  compact?: boolean;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  label,
  placeholder = 'Select…',
  className = '',
  compact = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    } else {
      setPosition(null);
    }
  }, [open]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = ref.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      queueMicrotask(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const searchLower = search.trim().toLowerCase();
  const filteredOptions =
    searchLower === ''
      ? options
      : options.filter((opt) => opt.toLowerCase().includes(searchLower));

  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  const hasOptions = options.length > 0;

  return (
    <div ref={ref} className={`relative ${compact ? 'inline-flex' : 'block'} ${className}`}>
      {label != null && !compact && (
        <label className="block text-xs text-slate-500 mb-0.5">{label}</label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={
          selected.length === 0
            ? undefined
            : selected.length === 1
              ? selected[0]
              : `${selected.length} selected: ${selected.join(', ')}`
        }
        className={
          compact
            ? `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors whitespace-nowrap border border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100`
            : `w-full text-left px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex items-center justify-between gap-2 ${selected.length === 0 ? 'text-slate-400' : 'text-slate-800'}`
        }
      >
        <span className="truncate">{displayLabel}</span>
        <span className="text-slate-400 shrink-0">▾</span>
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] max-h-72 flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
              width: compact ? undefined : Math.max(position.width, 200),
              minWidth: compact ? 160 : undefined,
            }}
          >
            {hasOptions && (
              <div className="p-2 border-b border-slate-100 shrink-0">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search…"
                  aria-label="Search options"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            <ul role="listbox" className="py-1 overflow-y-auto max-h-52">
              {!hasOptions ? (
                <li className="px-3 py-2 text-sm text-slate-500">No options—load provider data first</li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <li key={opt} role="option" aria-selected={isSelected}>
                      <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) onChange(selected.filter((s) => s !== opt));
                            else onChange([...selected, opt]);
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
