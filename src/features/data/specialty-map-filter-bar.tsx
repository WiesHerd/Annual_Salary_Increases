/**
 * Filter bar for Specialty map: search, collapsible dimension filters.
 * Mirrors Salary Review filter bar pattern for quick navigation.
 */

import { useState, useRef, useEffect } from 'react';
import type { SpecialtyMapFilters } from '../../lib/specialty-map-filters';
import type { MappingStatus } from '../../lib/specialty-map-filters';

const STATUS_LABELS: Record<MappingStatus, string> = {
  mapped: 'Mapped',
  'needs-mapping': 'Needs mapping',
  override: 'Override set',
};

export interface SpecialtyMapFilterBarProps {
  filters: SpecialtyMapFilters;
  onFiltersChange: (filters: SpecialtyMapFilters) => void;
  filterOptions: {
    specialties: string[];
    providerTypes: string[];
    benchmarkGroups: string[];
    matchedMarkets: string[];
  };
  totalCount: number;
  filteredCount: number;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  dropdownClassName = 'w-56',
  getOptionLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  dropdownClassName?: string;
  getOptionLabel?: (value: string) => string;
}) {
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
      : options.filter(
          (opt) =>
            opt.toLowerCase().includes(searchLower) ||
            (getOptionLabel?.(opt)?.toLowerCase().includes(searchLower) ?? false)
        );

  const displayLabel =
    selected.length === 0
      ? 'All'
      : selected.length === 1
        ? (getOptionLabel?.(selected[0]) ?? selected[0])
        : `${selected.length} selected`;
  const hasFilter = selected.length > 0;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors whitespace-nowrap ${
          open
            ? 'bg-neutral-100 text-neutral-900'
            : hasFilter
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200/80'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-neutral-500">{label}</span>
        <span className="font-medium">{displayLabel}</span>
        <span className="text-neutral-400 text-[10px]">▾</span>
      </button>
      {open && (
        <div className={`absolute left-0 top-full mt-1 z-40 max-h-72 flex flex-col bg-white rounded-xl shadow-lg border border-neutral-200/90 overflow-hidden ${dropdownClassName}`}>
          <div className="p-2 border-b border-neutral-100 shrink-0">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search…"
              aria-label={`Search ${label}`}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-lg bg-neutral-50 border-0 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
            />
          </div>
          <ul role="listbox" className="py-1 overflow-y-auto max-h-52">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-neutral-500">No matches</li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <li key={opt} role="option" aria-selected={isSelected}>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 cursor-pointer text-[13px] text-neutral-700">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) onChange(selected.filter((s) => s !== opt));
                          else onChange([...selected, opt]);
                        }}
                        className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{getOptionLabel ? getOptionLabel(opt) : opt}</span>
                    </label>
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

export function SpecialtyMapFilterBar({
  filters,
  onFiltersChange,
  filterOptions,
  totalCount,
  filteredCount,
}: SpecialtyMapFilterBarProps) {
  const hasAnyFilter =
    (filters.searchText ?? '').trim() !== '' ||
    filters.statuses.length > 0 ||
    filters.specialties.length > 0 ||
    filters.providerTypes.length > 0 ||
    filters.benchmarkGroups.length > 0 ||
    filters.matchedMarkets.length > 0;

  const activeDimensionCount =
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.specialties.length > 0 ? 1 : 0) +
    (filters.providerTypes.length > 0 ? 1 : 0) +
    (filters.benchmarkGroups.length > 0 ? 1 : 0) +
    (filters.matchedMarkets.length > 0 ? 1 : 0);
  const [filtersExpanded, setFiltersExpanded] = useState(activeDimensionCount > 0);

  const clearAll = () => {
    onFiltersChange({
      searchText: '',
      statuses: [],
      specialties: [],
      providerTypes: [],
      benchmarkGroups: [],
      matchedMarkets: [],
    });
  };

  const statusOptions: MappingStatus[] = ['mapped', 'needs-mapping', 'override'];

  return (
    <div className="sticky top-0 z-30 py-3 bg-white/98 backdrop-blur-sm border-b border-slate-100">
      {/* Row 1: Search + result count + clear */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <input
            type="search"
            value={filters.searchText ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            onKeyDown={(e) => e.key === 'Escape' && onFiltersChange({ ...filters, searchText: '' })}
            placeholder="Search by name, ID, specialty, benchmark group…"
            className="w-full pl-3 pr-9 py-2 text-[13px] rounded-lg bg-neutral-50 border border-neutral-200/80 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/50 focus:bg-white transition-colors placeholder:text-neutral-400"
            aria-label="Search providers"
          />
          {(filters.searchText ?? '').trim() !== '' && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, searchText: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-200 text-neutral-500"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <span className="text-[13px] text-neutral-500 shrink-0">
          <span className="font-medium text-neutral-700">{filteredCount}</span>
          <span className="text-neutral-400"> / {totalCount} providers</span>
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] font-medium text-blue-600 hover:text-blue-700 shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 2: Collapsible dimension filters */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setFiltersExpanded((e) => !e)}
          className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-700"
          aria-expanded={filtersExpanded}
        >
          <span className="text-neutral-400 text-[10px]" aria-hidden>
            {filtersExpanded ? '▼' : '▶'}
          </span>
          Filters
          {activeDimensionCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.125rem] h-4.5 px-1 rounded bg-neutral-200 text-neutral-600 text-[11px] font-medium">
              {activeDimensionCount}
            </span>
          )}
        </button>
        {filtersExpanded && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <MultiSelectDropdown
              label="Status"
              options={statusOptions}
              selected={filters.statuses}
              onChange={(selected) => onFiltersChange({ ...filters, statuses: selected as MappingStatus[] })}
              getOptionLabel={(v) => STATUS_LABELS[v as MappingStatus]}
            />
            <MultiSelectDropdown
              label="Specialty"
              options={filterOptions.specialties}
              selected={filters.specialties}
              onChange={(selected) => onFiltersChange({ ...filters, specialties: selected })}
              dropdownClassName="w-64"
            />
            <MultiSelectDropdown
              label="Provider type"
              options={filterOptions.providerTypes}
              selected={filters.providerTypes}
              onChange={(selected) => onFiltersChange({ ...filters, providerTypes: selected })}
            />
            <MultiSelectDropdown
              label="Benchmark group"
              options={filterOptions.benchmarkGroups}
              selected={filters.benchmarkGroups}
              onChange={(selected) => onFiltersChange({ ...filters, benchmarkGroups: selected })}
              dropdownClassName="w-64"
            />
            <MultiSelectDropdown
              label="Matched market"
              options={filterOptions.matchedMarkets}
              selected={filters.matchedMarkets}
              onChange={(selected) => onFiltersChange({ ...filters, matchedMarkets: selected })}
              dropdownClassName="w-64"
            />
          </div>
        )}
      </div>
    </div>
  );
}
