import { useCallback } from 'react';
import type { MeritMatrixRow } from '../../../types/merit-matrix-row';
import {
  parametersFieldInputClass,
  parametersPrimaryButtonClass,
  parametersSectionDescriptionClass,
  parametersSectionHeadingClass,
  parametersTablePanelClass,
} from '../parameters-tab-ui';

interface MeritMatrixTabProps {
  meritMatrix: MeritMatrixRow[];
  setMeritMatrix: (v: MeritMatrixRow[] | ((prev: MeritMatrixRow[]) => MeritMatrixRow[])) => void;
}

function newId() {
  return `merit-${Date.now()}`;
}

function createNewMeritRow(): MeritMatrixRow {
  return { id: newId(), evaluationScore: 0, performanceLabel: '', defaultIncreasePercent: 0, notes: '' };
}

export function MeritMatrixTab({ meritMatrix, setMeritMatrix }: MeritMatrixTabProps) {
  const addRow = useCallback(() => {
    setMeritMatrix((prev) => [...prev, createNewMeritRow()]);
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
    <div className="p-6 max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h3 className={parametersSectionHeadingClass}>Merit matrix / PEVL scores</h3>
          <p className={parametersSectionDescriptionClass}>
            This matrix defines what each <strong>evaluation score</strong> and <strong>performance category</strong> (e.g. Exceeds, Meets,
            Needs Improvement) means for default increase %. Provider evaluation data can come from the provider upload (map
            Evaluation_Score and Performance_Category) or from the separate <strong>Evaluations</strong> upload (matched by Employee ID).
          </p>
        </div>
        <button type="button" onClick={addRow} className={`${parametersPrimaryButtonClass} sm:mt-0.5`}>
          Add row
        </button>
      </div>
      <div className={parametersTablePanelClass}>
        <table className="app-settings-table w-full min-w-[min(100%,44rem)] table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '8.75rem' }} />
            <col style={{ width: '14rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col className="min-w-0" />
            <col style={{ width: '3.25rem' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-right !whitespace-nowrap pl-4 pr-2">Evaluation score</th>
              <th className="text-left !whitespace-nowrap">Performance label</th>
              <th className="text-right !whitespace-nowrap pl-2 pr-4">Default increase %</th>
              <th className="text-left">Notes</th>
              <th className="w-12 px-2 text-center" aria-label="Actions" />
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
                  <td className="px-2 py-2 pl-4 text-right align-middle">
                    <input
                      type="number"
                      value={r.evaluationScore}
                      onChange={(e) => update(r.id, { evaluationScore: Number(e.target.value) || 0 })}
                      className={`ml-auto block w-full min-w-0 max-w-full ${parametersFieldInputClass} text-right tabular-nums`}
                    />
                  </td>
                  <td className="px-4 py-2 align-middle min-w-0">
                    <input
                      type="text"
                      value={r.performanceLabel}
                      onChange={(e) => update(r.id, { performanceLabel: e.target.value })}
                      className={`w-full min-w-0 ${parametersFieldInputClass}`}
                      placeholder="e.g. Exceeds, Meets"
                    />
                  </td>
                  <td className="px-2 py-2 pr-4 text-right align-middle">
                    <input
                      type="number"
                      value={r.defaultIncreasePercent}
                      onChange={(e) => update(r.id, { defaultIncreasePercent: Number(e.target.value) || 0 })}
                      className={`ml-auto block w-full min-w-0 max-w-full ${parametersFieldInputClass} text-right tabular-nums`}
                      step={0.1}
                    />
                  </td>
                  <td className="px-4 py-2 align-middle min-w-0">
                    <input
                      type="text"
                      value={r.notes ?? ''}
                      onChange={(e) => update(r.id, { notes: e.target.value })}
                      className={`w-full min-w-0 ${parametersFieldInputClass}`}
                    />
                  </td>
                  <td className="px-2 py-2 align-middle text-center">
                    <button type="button" onClick={() => remove(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded inline-flex" aria-label="Remove">
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
