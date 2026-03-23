/**
 * Filter bar for Compare Scenarios: search, dimension filters, show differing, delta range.
 */

import { useState } from 'react';
import type { CompareScenariosFilters } from '../../lib/compare-scenarios-filters';
import { MultiSelectDropdown } from '../../components/multi-select-dropdown';

export interface CompareScenariosFilterBarProps {
  filters: CompareScenariosFilters;
  onFiltersChange: (f: CompareScenariosFilters) => void;
  filterOptions: {
    specialties: string[];
    divisions: string[];
    departments: string[];
    populations: string[];
    policySourceA: string[];
    policySourceB: string[];
  };
  totalCount: number;
  filteredCount: number;
  /** Compare selected providers */
  selectedForCompare?: string[];
  onOpenCompareModal?: () => void;
}

export function CompareScenariosFilterBar({
  filters,
  onFiltersChange,
  filterOptions,
  totalCount,
  filteredCount,
  selectedForCompare = [],
  onOpenCompareModal,
}: CompareScenariosFilterBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const hasAnyFilter =
    (filters.searchText ?? '').trim() !== '' ||
    filters.specialties.length > 0 ||
    filters.divisions.length > 0 ||
    filters.departments.length > 0 ||
    filters.populations.length > 0 ||
    filters.policySourceA.length > 0 ||
    filters.policySourceB.length > 0 ||
    filters.deltaPercentMin != null ||
    filters.deltaPercentMax != null;

  const activeCount =
    (filters.specialties.length > 0 ? 1 : 0) +
    (filters.divisions.length > 0 ? 1 : 0) +
    (filters.departments.length > 0 ? 1 : 0) +
    (filters.populations.length > 0 ? 1 : 0) +
    (filters.policySourceA.length > 0 ? 1 : 0) +
    (filters.policySourceB.length > 0 ? 1 : 0) +
    (filters.deltaPercentMin != null ? 1 : 0) +
    (filters.deltaPercentMax != null ? 1 : 0);

  const clearAll = () => {
    onFiltersChange({
      ...filters,
      searchText: '',
      specialties: [],
      divisions: [],
      departments: [],
      populations: [],
      policySourceA: [],
      policySourceB: [],
      deltaPercentMin: undefined,
      deltaPercentMax: undefined,
    });
  };

  return (
    <div className="shrink-0 px-5 py-4 border-b border-slate-200 bg-white">
      {/* Row 1: Search + count + clear */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <input
            type="search"
            value={filters.searchText ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            placeholder="Search by name, ID, specialty, division…"
            className="w-full pl-3 pr-9 py-2 text-[13px] rounded-lg bg-neutral-50 border border-neutral-200/80 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/50 focus:bg-white"
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.showOnlyDiffering}
            onChange={(e) => onFiltersChange({ ...filters, showOnlyDiffering: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show only differing
        </label>
        <span className="text-[13px] text-neutral-500 shrink-0">
          <span className="font-medium text-neutral-700">{filteredCount}</span>
          <span className="text-neutral-400"> / {totalCount} providers</span>
        </span>
        {onOpenCompareModal && (
          <button
            type="button"
            onClick={onOpenCompareModal}
            disabled={selectedForCompare.length < 2 || selectedForCompare.length > 4}
            className="app-btn-secondary inline-flex items-center gap-1.5 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            title={
              selectedForCompare.length < 2
                ? 'Select 2–4 providers to compare'
                : selectedForCompare.length > 4
                  ? 'Select at most 4 providers to compare'
                  : `Compare ${selectedForCompare.length} selected provider${selectedForCompare.length !== 1 ? 's' : ''}`
            }
            aria-label={
              selectedForCompare.length < 2
                ? 'Compare — select 2 to 4 providers'
                : selectedForCompare.length > 4
                  ? 'Compare — select at most 4 providers'
                  : `Compare ${selectedForCompare.length} selected provider${selectedForCompare.length !== 1 ? 's' : ''}`
            }
          >
            Compare
          </button>
        )}
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
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.125rem] h-4.5 px-1 rounded bg-neutral-200 text-neutral-600 text-[11px] font-medium">
              {activeCount}
            </span>
          )}
        </button>
        {filtersExpanded && (
          <div className="flex flex-wrap gap-2 mt-2">
            <MultiSelectDropdown
              options={filterOptions.specialties}
              selected={filters.specialties}
              onChange={(v) => onFiltersChange({ ...filters, specialties: v })}
              label="Specialty"
              placeholder="All specialties"
              compact
            />
            <MultiSelectDropdown
              options={filterOptions.divisions}
              selected={filters.divisions}
              onChange={(v) => onFiltersChange({ ...filters, divisions: v })}
              label="Division"
              placeholder="All divisions"
              compact
            />
            <MultiSelectDropdown
              options={filterOptions.departments}
              selected={filters.departments}
              onChange={(v) => onFiltersChange({ ...filters, departments: v })}
              label="Department"
              placeholder="All departments"
              compact
            />
            <MultiSelectDropdown
              options={filterOptions.populations}
              selected={filters.populations}
              onChange={(v) => onFiltersChange({ ...filters, populations: v })}
              label="Provider Type"
              placeholder="All types"
              compact
            />
            <MultiSelectDropdown
              options={filterOptions.policySourceA}
              selected={filters.policySourceA}
              onChange={(v) => onFiltersChange({ ...filters, policySourceA: v })}
              label="Policy source A"
              placeholder="All"
              compact
            />
            <MultiSelectDropdown
              options={filterOptions.policySourceB}
              selected={filters.policySourceB}
              onChange={(v) => onFiltersChange({ ...filters, policySourceB: v })}
              label="Policy source B"
              placeholder="All"
              compact
            />
            <div className="flex items-center gap-2">
              <label className="text-[13px] text-neutral-500">Delta %</label>
              <input
                type="number"
                value={filters.deltaPercentMin ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onFiltersChange({
                    ...filters,
                    deltaPercentMin: v === '' ? undefined : parseFloat(v),
                  });
                }}
                placeholder="Min"
                className="w-16 px-2 py-1 text-[13px] rounded-lg border border-slate-200"
              />
              <span className="text-neutral-400">to</span>
              <input
                type="number"
                value={filters.deltaPercentMax ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onFiltersChange({
                    ...filters,
                    deltaPercentMax: v === '' ? undefined : parseFloat(v),
                  });
                }}
                placeholder="Max"
                className="w-16 px-2 py-1 text-[13px] rounded-lg border border-slate-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
