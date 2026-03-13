/**
 * Sticky filter bar for Salary Review: search, quick presets, collapsible dimension filters.
 */

import { useState, useRef, useEffect } from 'react';
import type { SalaryReviewFilters, SalaryReviewPresetId } from '../../lib/review-filters';
import { getActivePresetId, getPresetFilters } from '../../lib/review-filters';

export interface SalaryReviewFilterBarProps {
  filters: SalaryReviewFilters;
  onFiltersChange: (filters: SalaryReviewFilters) => void;
  filterOptions: {
    providerNames: string[];
    reviewStatuses: string[];
    specialties: string[];
    divisions: string[];
    departments: string[];
    planTypes: string[];
    populations: string[];
    experienceBands: string[];
    bandAlignments: string[];
    policySources: string[];
  };
  totalCount: number;
  filteredCount: number;
}

const PRESETS: { id: SalaryReviewPresetId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-review', label: 'In progress' },
  { id: 'approved', label: 'Complete' },
  { id: 'below-market', label: 'Below market' },
  { id: 'high-increase', label: 'High increase' },
];

const DIMENSION_KEYS = [
  { key: 'providerNames', label: 'Provider Name', optionsKey: 'providerNames' as const, dropdownClassName: 'w-72' },
  { key: 'reviewStatuses', label: 'Status', optionsKey: 'reviewStatuses' as const },
  { key: 'specialties', label: 'Specialty', optionsKey: 'specialties' as const },
  { key: 'divisions', label: 'Division', optionsKey: 'divisions' as const },
  { key: 'departments', label: 'Department', optionsKey: 'departments' as const },
  { key: 'planTypes', label: 'Plan', optionsKey: 'planTypes' as const },
  { key: 'populations', label: 'Provider Type', optionsKey: 'populations' as const },
  { key: 'experienceBands', label: 'Experience Band', optionsKey: 'experienceBands' as const },
  { key: 'bandAlignments', label: 'Band alignment', optionsKey: 'bandAlignments' as const },
  { key: 'policySources', label: 'Policy source', optionsKey: 'policySources' as const, dropdownClassName: 'w-64' },
] as const;

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

export function SalaryReviewFilterBar({
  filters,
  onFiltersChange,
  filterOptions,
  totalCount,
  filteredCount,
}: SalaryReviewFilterBarProps) {
  const activePreset = getActivePresetId(filters);
  const providerNames = filters.providerNames ?? [];
  const hasAnyFilter =
    (filters.searchText ?? '').trim() !== '' ||
    providerNames.length > 0 ||
    filters.reviewStatuses.length > 0 ||
    filters.specialties.length > 0 ||
    filters.divisions.length > 0 ||
    filters.departments.length > 0 ||
    filters.planTypes.length > 0 ||
    filters.populations.length > 0 ||
    (filters.experienceBands?.length ?? 0) > 0 ||
    (filters.bandAlignments?.length ?? 0) > 0 ||
    (filters.policySources?.length ?? 0) > 0 ||
    filters.approvedIncreasePercentMin != null ||
    filters.approvedIncreasePercentMax != null ||
    filters.tccPercentileMin != null ||
    filters.tccPercentileMax != null;

  const activeDimensionCount =
    (providerNames.length > 0 ? 1 : 0) +
    (filters.reviewStatuses.length > 0 ? 1 : 0) +
    (filters.specialties.length > 0 ? 1 : 0) +
    (filters.divisions.length > 0 ? 1 : 0) +
    (filters.departments.length > 0 ? 1 : 0) +
    (filters.planTypes.length > 0 ? 1 : 0) +
    (filters.populations.length > 0 ? 1 : 0) +
    ((filters.experienceBands?.length ?? 0) > 0 ? 1 : 0) +
    ((filters.bandAlignments?.length ?? 0) > 0 ? 1 : 0) +
    ((filters.policySources?.length ?? 0) > 0 ? 1 : 0);
  const [filtersExpanded, setFiltersExpanded] = useState(activeDimensionCount > 0);

  const setPreset = (presetId: SalaryReviewPresetId) => {
    const next = getPresetFilters(presetId);
    if (presetId === 'all') {
      onFiltersChange({ ...filters, ...next } as SalaryReviewFilters);
    } else {
      onFiltersChange({
        ...filters,
        ...next,
        searchText: filters.searchText,
      } as SalaryReviewFilters);
    }
  };

  const clearAll = () => {
    onFiltersChange({
      searchText: '',
      providerNames: [],
      reviewStatuses: [],
      specialties: [],
      divisions: [],
      departments: [],
      planTypes: [],
      populations: [],
      experienceBands: [],
      bandAlignments: [],
      policySources: [],
      approvedIncreasePercentMin: undefined,
      approvedIncreasePercentMax: undefined,
      tccPercentileMin: undefined,
      tccPercentileMax: undefined,
    });
  };

  const setDimension = (
    key: keyof Pick<
      SalaryReviewFilters,
      'providerNames' | 'reviewStatuses' | 'specialties' | 'divisions' | 'departments' | 'planTypes' | 'populations' | 'experienceBands' | 'bandAlignments' | 'policySources'
    >,
    value: string[]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="sticky top-0 z-30 py-4 bg-white/98 backdrop-blur-sm">
      {/* Row 1: Search + result count + clear */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <input
            type="search"
            value={filters.searchText ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget.value = '')}
            placeholder="Search by name, ID, specialty, division…"
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

      {/* Row 2: Quick presets — compact chips */}
      <div className="flex flex-wrap items-center gap-1 mt-3">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              activePreset === id
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Row 3: Collapsible dimension filters — compact chip row, Apple/Google style */}
      <div className="mt-3">
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
            {DIMENSION_KEYS.map((item) => (
              <MultiSelectDropdown
                key={item.key}
                label={item.label}
                options={filterOptions[item.optionsKey]}
                selected={filters[item.key]}
                onChange={(selected) => setDimension(item.key, selected)}
                dropdownClassName={'dropdownClassName' in item ? item.dropdownClassName : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
