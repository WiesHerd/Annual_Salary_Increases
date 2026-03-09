import { useCallback } from 'react';
import type { Cycle } from '../../../types/cycle';

interface CycleSettingsTabProps {
  cycles: Cycle[];
  setCycles: (v: Cycle[] | ((prev: Cycle[]) => Cycle[])) => void;
}

function newId() {
  return `cycle-${Date.now()}`;
}

export function CycleSettingsTab({ cycles, setCycles }: CycleSettingsTabProps) {
  const addRow = useCallback(() => {
    setCycles((prev) => [...prev, { id: newId(), label: 'New cycle', effectiveDate: '', budgetTargetAmount: undefined, budgetTargetPercent: undefined }]);
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

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Cycle settings</h3>
        <p className="text-sm text-slate-600 mt-1">Define review cycles (e.g. FY2026) with effective dates and budget targets.</p>
      </div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Add cycle
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cycle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Effective date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget target $</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget target %</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cycles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No cycles. Click “Add cycle” to create one.
                </td>
              </tr>
            ) : (
              cycles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                      className="w-full min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={r.effectiveDate ?? ''}
                      onChange={(e) => update(r.id, { effectiveDate: e.target.value || undefined })}
                      className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.budgetTargetAmount ?? ''}
                      onChange={(e) => update(r.id, { budgetTargetAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-32 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
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
