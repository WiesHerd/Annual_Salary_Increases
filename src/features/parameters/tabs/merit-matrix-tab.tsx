import { useCallback } from 'react';
import type { MeritMatrixRow } from '../../../types/merit-matrix-row';

interface MeritMatrixTabProps {
  meritMatrix: MeritMatrixRow[];
  setMeritMatrix: (v: MeritMatrixRow[] | ((prev: MeritMatrixRow[]) => MeritMatrixRow[])) => void;
}

function newId() {
  return `merit-${Date.now()}`;
}

export function MeritMatrixTab({ meritMatrix, setMeritMatrix }: MeritMatrixTabProps) {
  const addRow = useCallback(() => {
    setMeritMatrix((prev) => [...prev, { id: newId(), evaluationScore: 0, performanceLabel: '', defaultIncreasePercent: 0, notes: '' }]);
  }, [setMeritMatrix]);

  const update = useCallback(
    (id: string, updates: Partial<MeritMatrixRow>) => {
      setMeritMatrix(meritMatrix.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [meritMatrix, setMeritMatrix]
  );

  const remove = useCallback(
    (id: string) => setMeritMatrix(meritMatrix.filter((r) => r.id !== id)),
    [meritMatrix, setMeritMatrix]
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Merit matrix / PEVL scores</h3>
        <p className="text-sm text-slate-600 mt-1">
          This matrix defines what each <strong>evaluation score</strong> and <strong>performance category</strong> (e.g. Exceeds, Meets,
          Needs Improvement) means for default increase %. Provider evaluation data can come from the provider upload (map
          Evaluation_Score and Performance_Category) or from the separate <strong>Evaluations</strong> upload (matched by Employee ID).
        </p>
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Evaluation score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Performance label</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Default increase %</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Notes</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meritMatrix.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No rows. Click “Add row” to create one.
                </td>
              </tr>
            ) : (
              meritMatrix.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.evaluationScore}
                      onChange={(e) => update(r.id, { evaluationScore: Number(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.performanceLabel}
                      onChange={(e) => update(r.id, { performanceLabel: e.target.value })}
                      className="w-full min-w-[140px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="e.g. Exceeds, Meets"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.defaultIncreasePercent}
                      onChange={(e) => update(r.id, { defaultIncreasePercent: Number(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                      step={0.1}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.notes ?? ''}
                      onChange={(e) => update(r.id, { notes: e.target.value })}
                      className="w-full min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
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
