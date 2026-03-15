import { useCallback } from 'react';
import type { PcpAppRuleRow } from '../../../types/pcp-app-rules';
import type { ParameterOptions } from '../../../lib/parameter-options';
import { SearchableSelect } from '../../../components/searchable-select';

interface PcpAppRulesTabProps {
  pcpAppRules: PcpAppRuleRow[];
  setPcpAppRules: (v: PcpAppRuleRow[] | ((prev: PcpAppRuleRow[]) => PcpAppRuleRow[])) => void;
  options: ParameterOptions;
}

function optionsWithCurrent(options: string[], current: string | undefined): string[] {
  if (!current || current.trim() === '') return options;
  if (options.includes(current.trim())) return options;
  return [current.trim(), ...options];
}

function newId() {
  return `pcp-app-${Date.now()}`;
}

export function PcpAppRulesTab({ pcpAppRules, setPcpAppRules, options }: PcpAppRulesTabProps) {
  const addRow = useCallback(() => {
    setPcpAppRules((prev) => [...prev, { id: newId(), division: '', fixedTarget: 0, defaultCurrentCf: 0, defaultProposedCf: 0, allowOverride: true }]);
  }, [setPcpAppRules]);

  const update = useCallback(
    (id: string, updates: Partial<PcpAppRuleRow>) => {
      setPcpAppRules(pcpAppRules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [pcpAppRules, setPcpAppRules]
  );

  const remove = useCallback(
    (id: string) => setPcpAppRules(pcpAppRules.filter((r) => r.id !== id)),
    [pcpAppRules, setPcpAppRules]
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">PCP APP fixed target / CF settings</h3>
        <p className="text-sm text-slate-600 mt-1">Per-division fixed target and default CF values. Allow override lets analysts change CF in the review.</p>
        {options.divisions.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">Upload provider data in Data to choose division from existing values.</p>
        )}
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Fixed target</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Default current CF</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Default proposed CF</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Allow override</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pcpAppRules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No rows. Click “Add row” to create one.
                </td>
              </tr>
            ) : (
              pcpAppRules.map((r) => {
                const divisionOpts = optionsWithCurrent(options.divisions, r.division);
                return (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    {divisionOpts.length > 0 ? (
                      <SearchableSelect
                        value={r.division}
                        options={divisionOpts}
                        onChange={(v) => update(r.id, { division: v })}
                        emptyOptionLabel="—"
                        className="min-w-[120px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={r.division}
                        onChange={(e) => update(r.id, { division: e.target.value })}
                        className="w-full min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                        placeholder="Division"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.fixedTarget}
                      onChange={(e) => update(r.id, { fixedTarget: Number(e.target.value) || 0 })}
                      className="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.defaultCurrentCf}
                      onChange={(e) => update(r.id, { defaultCurrentCf: Number(e.target.value) || 0 })}
                      className="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.defaultProposedCf}
                      onChange={(e) => update(r.id, { defaultProposedCf: Number(e.target.value) || 0 })}
                      className="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.allowOverride}
                        onChange={(e) => update(r.id, { allowOverride: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm">Allow override</span>
                    </label>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => remove(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" aria-label="Remove">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
