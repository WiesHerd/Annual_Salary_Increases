import { useCallback } from 'react';
import type { PcpPhysicianTierRow } from '../../../types/pcp-tier';
import type { ParameterOptions } from '../../../lib/parameter-options';
import { SearchableSelect } from '../../../components/searchable-select';

interface PcpTierTabProps {
  pcpTierSettings: PcpPhysicianTierRow[];
  setPcpTierSettings: (v: PcpPhysicianTierRow[] | ((prev: PcpPhysicianTierRow[]) => PcpPhysicianTierRow[])) => void;
  options: ParameterOptions;
}

function optionsWithCurrent(options: string[], current: string | undefined): string[] {
  if (!current || current.trim() === '') return options;
  if (options.includes(current.trim())) return options;
  return [current.trim(), ...options];
}

function newId() {
  return `tier-${Date.now()}`;
}

export function PcpTierTab({ pcpTierSettings, setPcpTierSettings, options }: PcpTierTabProps) {
  const addRow = useCallback(() => {
    setPcpTierSettings((prev) => [...prev, { id: newId(), tierName: '', minYoe: 0, maxYoe: 0, baseSalary: 0, division: '', active: true }]);
  }, [setPcpTierSettings]);

  const update = useCallback(
    (id: string, updates: Partial<PcpPhysicianTierRow>) => {
      setPcpTierSettings(pcpTierSettings.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [pcpTierSettings, setPcpTierSettings]
  );

  const remove = useCallback(
    (id: string) => setPcpTierSettings(pcpTierSettings.filter((r) => r.id !== id)),
    [pcpTierSettings, setPcpTierSettings]
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">PCP physician tier settings</h3>
        <p className="text-sm text-slate-600 mt-1">Tier name, YOE range, base salary, and division. Inactive rows are excluded from matching.</p>
        {options.divisions.length === 0 && options.tierNames.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">Upload provider data in Data to choose division and tier from existing values.</p>
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tier name</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Min YOE</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Max YOE</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Base salary</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Division</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Active</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pcpTierSettings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No rows. Click “Add row” to create one.
                </td>
              </tr>
            ) : (
              pcpTierSettings.map((r) => {
                const tierOpts = optionsWithCurrent(options.tierNames, r.tierName);
                const divisionOpts = optionsWithCurrent(options.divisions, r.division);
                return (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    {tierOpts.length > 0 ? (
                      <SearchableSelect
                        value={r.tierName}
                        options={tierOpts}
                        onChange={(v) => update(r.id, { tierName: v })}
                        emptyOptionLabel="—"
                        className="min-w-[100px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={r.tierName}
                        onChange={(e) => update(r.id, { tierName: e.target.value })}
                        className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                        placeholder="Tier name"
                      />
                    )}
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
                      value={r.baseSalary}
                      onChange={(e) => update(r.id, { baseSalary: Number(e.target.value) || 0 })}
                      className="w-32 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {divisionOpts.length > 0 ? (
                      <SearchableSelect
                        value={r.division}
                        options={divisionOpts}
                        onChange={(v) => update(r.id, { division: v })}
                        emptyOptionLabel="—"
                        className="min-w-[100px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={r.division}
                        onChange={(e) => update(r.id, { division: e.target.value })}
                        className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                        placeholder="Division"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.active}
                        onChange={(e) => update(r.id, { active: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm">Active</span>
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
