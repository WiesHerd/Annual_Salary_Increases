/**
 * Single-select dropdown with search to quickly find an option.
 * Use for column mapping, specialty override, and other dropdowns with many options.
 * Renders the menu in a portal so it is not clipped by table cells (overflow-hidden) or scroll wrappers.
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

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
  placeholder: _placeholder = '—',
  label,
  'aria-label': ariaLabel,
  className = '',
  emptyOptionLabel = '—',
}: SearchableSelectProps) {
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
    if (!open) return;
    const sync = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    };
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
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

  return (
    <div ref={ref} className="relative">
      {label != null && (
        <label className="block text-xs text-slate-500">{label}</label>
      )}
      <button
        ref={triggerRef}
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
      {open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] max-h-72 flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
              width: Math.max(position.width, 200),
            }}
          >
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
              {options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-500">No options—nothing to pick yet.</li>
              ) : filteredOptions.length === 0 ? (
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
          </div>,
          document.body
        )}
    </div>
  );
}
