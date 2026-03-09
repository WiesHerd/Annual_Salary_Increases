/**
 * Single-select dropdown with search to quickly find an option.
 * Use for column mapping, specialty override, and other dropdowns with many options.
 */

import { useState, useRef, useEffect } from 'react';

export interface SearchableSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  'aria-label'?: string;
  className?: string;
  emptyOptionLabel?: string;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = '—',
  label,
  'aria-label': ariaLabel,
  className = '',
  emptyOptionLabel = '—',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const displayValue = value || placeholder;

  return (
    <div ref={ref} className="relative">
      {label != null && (
        <label className="block text-xs text-slate-500">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel ?? label}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 flex items-center justify-between gap-2 ${className}`}
      >
        <span className="truncate text-slate-800">{value ? value : emptyOptionLabel}</span>
        <span className="text-slate-400 shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 min-w-[160px] max-h-72 flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 shrink-0">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search…"
              aria-label="Search options"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <ul role="listbox" className="py-2 overflow-y-auto max-h-52">
            <li role="option" aria-selected={value === ''}>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                {emptyOptionLabel}
              </button>
            </li>
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <li key={opt} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${isSelected ? 'bg-indigo-50 text-indigo-800' : 'text-slate-800'}`}
                    >
                      {opt}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
