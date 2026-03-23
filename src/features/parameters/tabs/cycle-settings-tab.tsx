import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Cycle } from '../../../types/cycle';
import {
  compareCycleEffectiveDate,
  compareCycleLabel,
} from '../../../lib/cycle-defaults';
import {
  parametersFieldInputClass,
  parametersPrimaryButtonClass,
} from '../parameters-tab-ui';

interface CycleSettingsTabProps {
  cycles: Cycle[];
  setCycles: (v: Cycle[] | ((prev: Cycle[]) => Cycle[])) => void;
  /** Omit page chrome; parent supplies section title (e.g. Cycle & budget screen). */
  embedded?: boolean;
  /** When true, do not render “Add cycle” (parent supplies it next to the section title). */
  hideAddButton?: boolean;
  /** Use full content width (Cycle & budget sub-tab). */
  wideLayout?: boolean;
}

function newId() {
  return `cycle-${Date.now()}`;
}

/** Default row for “Add cycle” (shared with Cycle & budget page toolbar). */
export function createNewCycleRow(): Cycle {
  return {
    id: newId(),
    label: 'New cycle',
    effectiveDate: '',
    budgetTargetAmount: undefined,
    budgetTargetPercent: undefined,
  };
}

type CycleSortKey = 'label' | 'effectiveDate';

const TABLE_SHELL_OUTER =
  'rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] overflow-hidden';
const TABLE_SCROLL_BODY = 'max-h-[min(28rem,55vh)] overflow-auto';

function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="text-slate-300 ml-0.5" aria-hidden>↕</span>;
  return (
    <span className="text-indigo-600 ml-0.5 tabular-nums" aria-hidden>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function CycleSettingsTab({
  cycles,
  setCycles,
  embedded = false,
  hideAddButton = false,
  wideLayout = false,
}: CycleSettingsTabProps) {
  const [sortKey, setSortKey] = useState<CycleSortKey>('effectiveDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const addRow = useCallback(() => {
    setCycles((prev) => [...prev, createNewCycleRow()]);
  }, [setCycles]);

  const update = useCallback(
    (id: string, updates: Partial<Cycle>) => {
      setCycles(cycles.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [cycles, setCycles]
  );

  const remove = useCallback(
    (id: string) => setCycles(cycles.filter((r) => r.id !== id)),
    [cycles, setCycles]
  );

  const displayCycles = useMemo(() => {
    const sorted = [...cycles].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'label') cmp = compareCycleLabel(a, b, sortDir);
      else cmp = compareCycleEffectiveDate(a, b, sortDir);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });
    return sorted;
  }, [cycles, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: CycleSortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir(key === 'effectiveDate' ? 'desc' : 'asc');
      }
    },
    [sortKey]
  );

  const shell = (inner: ReactNode) =>
    embedded ? <div className="min-w-0">{inner}</div> : <div className="p-6">{inner}</div>;

  return shell(
    <>
      {!embedded && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Cycle settings</h3>
          <p className="text-sm text-slate-600 mt-1">
            Define review cycles (e.g. FY2026) and effective dates. Configure budget targets in{' '}
            <strong>Cycle &amp; budget</strong> → Budget targets.
          </p>
        </div>
      )}
      {!hideAddButton && (
        <div className="flex justify-end mb-3">
          <button type="button" onClick={addRow} className={parametersPrimaryButtonClass}>
            Add cycle
          </button>
        </div>
      )}
      <div className="mb-2" />
      <div className={`${TABLE_SHELL_OUTER} ${wideLayout ? 'w-full max-w-4xl' : 'max-w-2xl'}`}>
        <div className={TABLE_SCROLL_BODY}>
          <table className="app-data-table w-full min-w-[36rem] table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '18rem' }} />
              <col style={{ width: '12.5rem' }} />
              <col style={{ width: '3.25rem' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 [font:inherit] uppercase tracking-wide text-left w-full cursor-pointer select-none hover:text-slate-900"
                    onClick={() => toggleSort('label')}
                    aria-sort={
                      sortKey === 'label'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    Cycle
                    <SortIndicator active={sortKey === 'label'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-left whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 [font:inherit] uppercase tracking-wide text-left w-full cursor-pointer select-none hover:text-slate-900"
                    onClick={() => toggleSort('effectiveDate')}
                    aria-sort={
                      sortKey === 'effectiveDate'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    Effective date
                    <SortIndicator active={sortKey === 'effectiveDate'} dir={sortDir} />
                  </button>
                </th>
                <th className="w-12 px-2 text-center" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cycles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No cycles. Click “Add cycle” to create one.
                  </td>
                </tr>
              ) : (
                displayCycles.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 align-middle">
                      <input
                        type="text"
                        value={r.label}
                        onChange={(e) => update(r.id, { label: e.target.value })}
                        className={`w-full max-w-[22rem] ${parametersFieldInputClass}`}
                      />
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <input
                        type="date"
                        value={r.effectiveDate ?? ''}
                        onChange={(e) => update(r.id, { effectiveDate: e.target.value || undefined })}
                        className={`w-full min-w-0 ${parametersFieldInputClass}`}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="app-icon-btn-danger inline-flex"
                        aria-label="Remove cycle"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
