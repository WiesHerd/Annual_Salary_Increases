import { useCallback, useMemo, useState } from 'react';
import type { BudgetSettingsRow } from '../../../types/budget-settings';
import type { Cycle } from '../../../types/cycle';
import {
  getPreferredCycleId,
  sortCyclesNewestFirst,
} from '../../../lib/cycle-defaults';
import {
  parametersFieldInputClass,
  parametersFieldSelectClass,
  parametersPrimaryButtonClass,
} from '../parameters-tab-ui';

interface BudgetSettingsTabProps {
  budgetSettings: BudgetSettingsRow[];
  setBudgetSettings: (v: BudgetSettingsRow[] | ((prev: BudgetSettingsRow[]) => BudgetSettingsRow[])) => void;
  cycles: Cycle[];
  embedded?: boolean;
  /** When true, do not render “Add budget row” (parent supplies it next to the section title). */
  hideAddButton?: boolean;
  wideLayout?: boolean;
}

function newId() {
  return `budget-${Date.now()}`;
}

/** Default row for “Add budget row” (shared with Cycle & budget page toolbar). */
export function createNewBudgetRow(cycles: Cycle[]): BudgetSettingsRow {
  const pref = getPreferredCycleId(cycles);
  const chosen = pref ? cycles.find((c) => c.id === pref) : cycles[cycles.length - 1];
  return {
    id: newId(),
    cycleId: chosen?.id ?? '',
    cycleLabel: chosen?.label ?? '',
    budgetTargetAmount: undefined,
    budgetTargetPercent: undefined,
    warningThresholdPercent: undefined,
    hardStopThresholdPercent: undefined,
  };
}

type BudgetSortKey =
  | 'cycle'
  | 'budgetTargetAmount'
  | 'budgetTargetPercent'
  | 'warningThresholdPercent'
  | 'hardStopThresholdPercent';

const TABLE_SHELL_OUTER =
  'rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] overflow-hidden';
const TABLE_SCROLL_BODY = 'max-h-[min(28rem,55vh)] overflow-auto';

function resolvedCycleLabel(r: BudgetSettingsRow, cycles: Cycle[]): string {
  const c = cycles.find((x) => x.id === r.cycleId);
  return (c?.label ?? r.cycleLabel ?? r.cycleId ?? '').trim();
}

function compareOptionalNumber(
  a: number | undefined,
  b: number | undefined,
  dir: 'asc' | 'desc'
): number {
  const na = a == null || !Number.isFinite(a);
  const nb = b == null || !Number.isFinite(b);
  if (na && nb) return 0;
  if (na) return 1;
  if (nb) return -1;
  const cmp = a! - b!;
  return dir === 'asc' ? cmp : -cmp;
}

function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="text-slate-300 ml-0.5" aria-hidden>↕</span>;
  return (
    <span className="text-indigo-600 ml-0.5 tabular-nums" aria-hidden>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function BudgetSettingsTab({
  budgetSettings,
  setBudgetSettings,
  cycles,
  embedded = false,
  hideAddButton = false,
  wideLayout = false,
}: BudgetSettingsTabProps) {
  const [sortKey, setSortKey] = useState<BudgetSortKey>('cycle');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const cyclesForSelect = useMemo(() => sortCyclesNewestFirst(cycles), [cycles]);

  const addRow = useCallback(() => {
    setBudgetSettings((prev) => [...prev, createNewBudgetRow(cycles)]);
  }, [setBudgetSettings, cycles]);

  const update = useCallback(
    (id: string, updates: Partial<BudgetSettingsRow>) => {
      setBudgetSettings(budgetSettings.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [budgetSettings, setBudgetSettings]
  );

  const remove = useCallback(
    (id: string) => setBudgetSettings(budgetSettings.filter((r) => r.id !== id)),
    [budgetSettings, setBudgetSettings]
  );

  const displayRows = useMemo(() => {
    const sorted = [...budgetSettings].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'cycle': {
          const la = resolvedCycleLabel(a, cycles);
          const lb = resolvedCycleLabel(b, cycles);
          cmp = la.localeCompare(lb, undefined, { sensitivity: 'base', numeric: true });
          if (sortDir === 'desc') cmp = -cmp;
          break;
        }
        case 'budgetTargetAmount':
          cmp = compareOptionalNumber(a.budgetTargetAmount, b.budgetTargetAmount, sortDir);
          break;
        case 'budgetTargetPercent':
          cmp = compareOptionalNumber(a.budgetTargetPercent, b.budgetTargetPercent, sortDir);
          break;
        case 'warningThresholdPercent':
          cmp = compareOptionalNumber(a.warningThresholdPercent, b.warningThresholdPercent, sortDir);
          break;
        case 'hardStopThresholdPercent':
          cmp = compareOptionalNumber(a.hardStopThresholdPercent, b.hardStopThresholdPercent, sortDir);
          break;
        default:
          break;
      }
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });
    return sorted;
  }, [budgetSettings, cycles, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: BudgetSortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const sortAria = (key: BudgetSortKey) =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  const headerBtn =
    'inline-flex items-center justify-end gap-0.5 [font:inherit] uppercase tracking-wide w-full cursor-pointer select-none hover:text-slate-900';
  const headerBtnLeft =
    'inline-flex items-center gap-0.5 [font:inherit] uppercase tracking-wide w-full cursor-pointer select-none hover:text-slate-900 text-left';

  return (
    <div className={embedded ? 'min-w-0' : 'p-6'}>
      {!embedded && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Budget settings</h3>
          <p className="text-sm text-slate-600 mt-1">
            Per-cycle budget target and thresholds. Open <strong>Cycle &amp; budget</strong> in Controls for the
            full view.
          </p>
        </div>
      )}
      {!hideAddButton && (
        <div className="flex justify-end mb-3">
          <button type="button" onClick={addRow} className={parametersPrimaryButtonClass}>
            Add budget row
          </button>
        </div>
      )}
      <div className="mb-2" />
      <div className={`${TABLE_SHELL_OUTER} ${wideLayout ? 'w-full max-w-5xl' : 'max-w-5xl'}`}>
        <div className={TABLE_SCROLL_BODY}>
          <table className="app-data-table w-full min-w-[52rem] table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '22rem' }} />
              <col style={{ width: '9rem' }} />
              <col style={{ width: '6.5rem' }} />
              <col style={{ width: '6.75rem' }} />
              <col style={{ width: '6.75rem' }} />
              <col style={{ width: '3.25rem' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left" aria-sort={sortAria('cycle')}>
                  <button
                    type="button"
                    className={headerBtnLeft}
                    onClick={() => toggleSort('cycle')}
                  >
                    Cycle
                    <SortIndicator active={sortKey === 'cycle'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right whitespace-nowrap" aria-sort={sortAria('budgetTargetAmount')}>
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort('budgetTargetAmount')}
                  >
                    Budget target $
                    <SortIndicator active={sortKey === 'budgetTargetAmount'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right whitespace-nowrap" aria-sort={sortAria('budgetTargetPercent')}>
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort('budgetTargetPercent')}
                  >
                    Budget target %
                    <SortIndicator active={sortKey === 'budgetTargetPercent'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right whitespace-nowrap" aria-sort={sortAria('warningThresholdPercent')}>
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort('warningThresholdPercent')}
                  >
                    Warning threshold
                    <SortIndicator active={sortKey === 'warningThresholdPercent'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right whitespace-nowrap" aria-sort={sortAria('hardStopThresholdPercent')}>
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort('hardStopThresholdPercent')}
                  >
                    Hard stop threshold
                    <SortIndicator active={sortKey === 'hardStopThresholdPercent'} dir={sortDir} />
                  </button>
                </th>
                <th className="w-12 px-2 text-center" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetSettings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No rows. Click “Add budget row” to create one.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 align-middle">
                      <select
                        value={r.cycleId}
                        onChange={(e) => {
                          const c = cycles.find((x) => x.id === e.target.value);
                          update(r.id, { cycleId: c?.id ?? e.target.value, cycleLabel: c?.label ?? '' });
                        }}
                        className={`w-full max-w-full ${parametersFieldSelectClass}`}
                      >
                        <option value="">Select cycle</option>
                        {cyclesForSelect.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label || c.id}
                          </option>
                        ))}
                        {r.cycleId && !cycles.some((c) => c.id === r.cycleId) && (
                          <option value={r.cycleId}>{r.cycleLabel || r.cycleId}</option>
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      <input
                        type="number"
                        value={r.budgetTargetAmount ?? ''}
                        onChange={(e) =>
                          update(r.id, { budgetTargetAmount: e.target.value === '' ? undefined : Number(e.target.value) })
                        }
                        className={`w-full max-w-full min-w-0 ${parametersFieldInputClass} text-right tabular-nums`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      <input
                        type="number"
                        value={r.budgetTargetPercent ?? ''}
                        onChange={(e) =>
                          update(r.id, { budgetTargetPercent: e.target.value === '' ? undefined : Number(e.target.value) })
                        }
                        className={`w-full max-w-full min-w-0 ${parametersFieldInputClass} text-right tabular-nums`}
                        step={0.1}
                      />
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      <input
                        type="number"
                        value={r.warningThresholdPercent ?? ''}
                        onChange={(e) =>
                          update(r.id, {
                            warningThresholdPercent: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={`w-full max-w-full min-w-0 ${parametersFieldInputClass} text-right tabular-nums`}
                        placeholder="95"
                      />
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      <input
                        type="number"
                        value={r.hardStopThresholdPercent ?? ''}
                        onChange={(e) =>
                          update(r.id, {
                            hardStopThresholdPercent: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className={`w-full max-w-full min-w-0 ${parametersFieldInputClass} text-right tabular-nums`}
                        placeholder="100"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="app-icon-btn-danger inline-flex"
                        aria-label="Remove budget row"
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
    </div>
  );
}
