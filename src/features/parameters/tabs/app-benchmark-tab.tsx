import { useCallback } from 'react';
import type { AppBenchmarkMappingRow } from '../../../types/app-benchmark-mapping';

interface AppBenchmarkTabProps {
  appBenchmarkMapping: AppBenchmarkMappingRow[];
  setAppBenchmarkMapping: (v: AppBenchmarkMappingRow[] | ((prev: AppBenchmarkMappingRow[]) => AppBenchmarkMappingRow[])) => void;
}

function newId() {
  return `app-bm-${Date.now()}`;
}

export function AppBenchmarkTab({ appBenchmarkMapping, setAppBenchmarkMapping }: AppBenchmarkTabProps) {
  const addRow = useCallback(() => {
    setAppBenchmarkMapping((prev) => [...prev, { id: newId(), division: '', specialtyOrGroup: '', benchmarkGroup: '', surveySource: '' }]);
  }, [setAppBenchmarkMapping]);

  const update = useCallback(
    (id: string, updates: Partial<AppBenchmarkMappingRow>) => {
      setAppBenchmarkMapping(appBenchmarkMapping.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [appBenchmarkMapping, setAppBenchmarkMapping]
  );

  const remove = useCallback(
    (id: string) => setAppBenchmarkMapping(appBenchmarkMapping.filter((r) => r.id !== id)),
    [appBenchmarkMapping, setAppBenchmarkMapping]
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">APP benchmark mapping</h3>
        <p className="text-sm text-slate-600 mt-1">Map APP division or specialty/group to a benchmark group and survey source.</p>
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Division</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Specialty / group</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Benchmark group</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Survey source</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appBenchmarkMapping.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No rows. Click “Add row” to create one.
                </td>
              </tr>
            ) : (
              appBenchmarkMapping.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.division ?? ''}
                      onChange={(e) => update(r.id, { division: e.target.value || undefined })}
                      className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.specialtyOrGroup}
                      onChange={(e) => update(r.id, { specialtyOrGroup: e.target.value })}
                      className="w-full min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.benchmarkGroup}
                      onChange={(e) => update(r.id, { benchmarkGroup: e.target.value })}
                      className="w-full min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.surveySource ?? ''}
                      onChange={(e) => update(r.id, { surveySource: e.target.value || undefined })}
                      className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
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
