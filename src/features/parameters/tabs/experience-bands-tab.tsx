import { useCallback } from 'react';
import type { ExperienceBand } from '../../../types/experience-band';

interface ExperienceBandsTabProps {
  experienceBands: ExperienceBand[];
  setExperienceBands: (v: ExperienceBand[] | ((prev: ExperienceBand[]) => ExperienceBand[])) => void;
}

function newId() {
  return `band-${Date.now()}`;
}

export function ExperienceBandsTab({ experienceBands, setExperienceBands }: ExperienceBandsTabProps) {
  const addRow = useCallback(() => {
    setExperienceBands((prev) => [
      ...prev,
      { id: newId(), label: 'New band', minYoe: 0, maxYoe: 5, targetTccPercentileLow: 25, targetTccPercentileHigh: 50, populationScope: [], planScope: [] },
    ]);
  }, [setExperienceBands]);

  const update = useCallback(
    (id: string, updates: Partial<ExperienceBand>) => {
      setExperienceBands(experienceBands.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [experienceBands, setExperienceBands]
  );

  const remove = useCallback(
    (id: string) => setExperienceBands(experienceBands.filter((r) => r.id !== id)),
    [experienceBands, setExperienceBands]
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Experience band target ranges</h3>
        <p className="text-sm text-slate-600 mt-1">YOE ranges and target TCC percentile ranges. Optionally scope by population or plan.</p>
      </div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Add band
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Band name</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Min YOE</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Max YOE</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Target TCC % min</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Target TCC % max</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Applies to provider type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Applies to plan</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {experienceBands.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No bands. Click “Add band” to create one.
                </td>
              </tr>
            ) : (
              experienceBands.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                      className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.minYoe}
                      onChange={(e) => update(r.id, { minYoe: Number(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.maxYoe}
                      onChange={(e) => update(r.id, { maxYoe: Number(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.targetTccPercentileLow}
                      onChange={(e) => update(r.id, { targetTccPercentileLow: Number(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.targetTccPercentileHigh}
                      onChange={(e) => update(r.id, { targetTccPercentileHigh: Number(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.populationScope?.join(', ') ?? ''}
                      onChange={(e) => update(r.id, { populationScope: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined })}
                      className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="physician, app"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.planScope?.join(', ') ?? ''}
                      onChange={(e) => update(r.id, { planScope: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined })}
                      className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="wrvu, salary"
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
