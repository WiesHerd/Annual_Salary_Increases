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
  };
  totalCount: number;
  filteredCount: number;
}

const PRESETS: { id: SalaryReviewPresetId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-review', label: 'Needs review' },
  { id: 'draft', label: 'Draft' },
  { id: 'in-review', label: 'In review' },
  { id: 'approved', label: 'Approved' },
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
] as const;

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  dropdownClassName = 'w-56',
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  dropdownClassName?: string;
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
      : options.filter((opt) => opt.toLowerCase().includes(searchLower));

  const displayLabel =
    selected.length === 0 ? 'All' : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  const hasFilter = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-2 text-sm font-medium border rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
          hasFilter
            ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-slate-500 font-normal">{label}:</span>
        <span>{displayLabel}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className={`absolute left-0 top-full mt-1 z-40 max-h-72 flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden ${dropdownClassName}`}>
          <div className="p-2 border-b border-slate-100 shrink-0">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search…"
              aria-label={`Search ${label}`}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <ul role="listbox" className="py-2 overflow-y-auto max-h-52">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <li key={opt} role="option" aria-selected={isSelected}>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) onChange(selected.filter((s) => s !== opt));
                          else onChange([...selected, opt]);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
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
    ((filters.experienceBands?.length ?? 0) > 0 ? 1 : 0);
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
      approvedIncreasePercentMin: undefined,
      approvedIncreasePercentMax: undefined,
      tccPercentileMin: undefined,
      tccPercentileMax: undefined,
    });
  };

  const setDimension = (
    key: keyof Pick<
      SalaryReviewFilters,
      'providerNames' | 'reviewStatuses' | 'specialties' | 'divisions' | 'departments' | 'planTypes' | 'populations' | 'experienceBands'
    >,
    value: string[]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="sticky top-0 z-30 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      {/* Row 1: Search + result count + clear — single clean row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <input
            type="search"
            value={filters.searchText ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget.value = '')}
            placeholder="Search by name, ID, specialty, division…"
            className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50/80 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-colors"
            aria-label="Search providers"
          />
          {(filters.searchText ?? '').trim() !== '' && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, searchText: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-200 text-slate-500"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <span className="text-sm text-slate-500 shrink-0">
          <span className="font-medium text-slate-700">{filteredCount}</span>
          <span className="text-slate-400"> / {totalCount} providers</span>
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 2: Quick filter pills only — no heavy label */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={`px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activePreset === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Row 3: Collapsible dimension filters — reduces clutter by default */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setFiltersExpanded((e) => !e)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          aria-expanded={filtersExpanded}
        >
          <span className="text-slate-400" aria-hidden>
            {filtersExpanded ? '▼' : '▶'}
          </span>
          Filters
          {activeDimensionCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
              {activeDimensionCount}
            </span>
          )}
        </button>
        {filtersExpanded && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pl-5 pt-1 pb-1 border-l-2 border-slate-100">
            {DIMENSION_KEYS.map(({ key, label, optionsKey, dropdownClassName: listClass }) => (
              <MultiSelectDropdown
                key={key}
                label={label}
                options={filterOptions[optionsKey]}
                selected={filters[key]}
                onChange={(selected) => setDimension(key, selected)}
                dropdownClassName={listClass}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
