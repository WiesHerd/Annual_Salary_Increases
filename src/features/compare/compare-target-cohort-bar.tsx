/**
 * Target cohort bar for Compare Scenarios: run-time filters for which providers to include.
 * Shown above Scenario A/B dropdowns; when set, both scenarios run on this subset.
 */

import { useState } from 'react';
import { MultiSelectDropdown } from '../../components/multi-select-dropdown';
import type { CompareTargetCohortFilters } from '../../lib/compare-target-cohort';
import { hasTargetCohortFilters } from '../../lib/compare-target-cohort';

export interface CompareTargetCohortBarProps {
  filters: CompareTargetCohortFilters;
  onFiltersChange: (f: CompareTargetCohortFilters) => void;
  filterOptions: {
    specialties: string[];
    divisions: string[];
    departments: string[];
    populations: string[];
  };
  targetCount: number;
  totalCount: number;
}

export function CompareTargetCohortBar({
  filters,
  onFiltersChange,
  filterOptions,
  targetCount,
  totalCount,
}: CompareTargetCohortBarProps) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = hasTargetCohortFilters(filters);
  const activeCount =
    (filters.specialties.length > 0 ? 1 : 0) +
    (filters.divisions.length > 0 ? 1 : 0) +
    (filters.departments.length > 0 ? 1 : 0) +
    (filters.populations.length > 0 ? 1 : 0) +
    ((filters.searchText ?? '').trim() !== '' ? 1 : 0);

  const clearAll = () => {
    onFiltersChange({
      ...filters,
      searchText: '',
      specialties: [],
      divisions: [],
      departments: [],
      populations: [],
    });
  };

  return (
    <div className="shrink-0 px-5 py-2 border-b border-slate-200 bg-slate-50/30">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-800"
          aria-expanded={expanded}
        >
          <span className="text-slate-400 text-[10px]" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span className="font-medium">Run on</span>
          {hasFilters ? (
            <span className="text-slate-700">
              {targetCount} of {totalCount} providers
            </span>
          ) : (
            <span className="text-slate-500">All providers ({totalCount})</span>
          )}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.125rem] h-4.5 px-1 rounded bg-indigo-100 text-indigo-700 text-[11px] font-medium">
              {activeCount}
            </span>
          )}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear target filters
          </button>
        )}
      </div>
      {expanded && (
        <div className="flex flex-wrap gap-2 mt-3 pb-1">
          <div className="relative min-w-0 flex-1 max-w-[200px]">
            <input
              type="search"
              value={filters.searchText ?? ''}
              onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
              placeholder="Search name, ID, specialty…"
              className="w-full pl-2.5 pr-8 py-1.5 text-[13px] rounded-lg bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
              aria-label="Search target cohort"
            />
            {(filters.searchText ?? '').trim() !== '' && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, searchText: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 text-slate-500"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
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
            label="Provider type"
            placeholder="All types"
            compact
          />
        </div>
      )}
    </div>
  );
}
