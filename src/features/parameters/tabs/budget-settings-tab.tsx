import { useCallback } from 'react';
import type { BudgetSettingsRow } from '../../../types/budget-settings';
import type { Cycle } from '../../../types/cycle';

interface BudgetSettingsTabProps {
  budgetSettings: BudgetSettingsRow[];
  setBudgetSettings: (v: BudgetSettingsRow[] | ((prev: BudgetSettingsRow[]) => BudgetSettingsRow[])) => void;
  cycles: Cycle[];
}

function newId() {
  return `budget-${Date.now()}`;
}

export function BudgetSettingsTab({ budgetSettings, setBudgetSettings, cycles }: BudgetSettingsTabProps) {
  const addRow = useCallback(() => {
    const first = cycles[0];
    const cycleId = first?.id ?? '';
    const cycleLabel = first?.label ?? '';
    setBudgetSettings((prev) => [
      ...prev,
      {
        id: newId(),
        cycleId,
        cycleLabel,
        budgetTargetAmount: undefined,
        budgetTargetPercent: undefined,
        warningThresholdPercent: undefined,
        hardStopThresholdPercent: undefined,
      },
    ]);
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

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Budget settings</h3>
        <p className="text-sm text-slate-600 mt-1">Per-cycle budget target and thresholds. Warning and hard stop are percent of budget (e.g. 95 = warn at 95%).</p>
      </div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Add row
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cycle</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget target $</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget target %</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Warning threshold</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Hard stop threshold</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgetSettings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No rows. Click “Add row” to create one.
                </td>
              </tr>
            ) : (
              budgetSettings.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <select
                      value={r.cycleId}
                      onChange={(e) => {
                        const c = cycles.find((x) => x.id === e.target.value);
                        update(r.id, { cycleId: c?.id ?? e.target.value, cycleLabel: c?.label ?? '' });
                      }}
                      className="w-full min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select cycle</option>
                      {cycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label || c.id}
                        </option>
                      ))}
                      {r.cycleId && !cycles.some((c) => c.id === r.cycleId) && (
                        <option value={r.cycleId}>{r.cycleLabel || r.cycleId}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.budgetTargetAmount ?? ''}
                      onChange={(e) => update(r.id, { budgetTargetAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-36 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.budgetTargetPercent ?? ''}
                      onChange={(e) => update(r.id, { budgetTargetPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                      step={0.1}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.warningThresholdPercent ?? ''}
                      onChange={(e) => update(r.id, { warningThresholdPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                      placeholder="95"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.hardStopThresholdPercent ?? ''}
                      onChange={(e) => update(r.id, { hardStopThresholdPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                      placeholder="100"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => remove(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" aria-label="Remove">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  );
}
