import { useCallback } from 'react';
import type { CfBySpecialtyRow } from '../../../types/cf-by-specialty';
import type { ParameterOptions } from '../../../lib/parameter-options';
import { SearchableSelect } from '../../../components/searchable-select';

interface ConversionFactorTabProps {
  cfBySpecialty: CfBySpecialtyRow[];
  setCfBySpecialty: (v: CfBySpecialtyRow[] | ((prev: CfBySpecialtyRow[]) => CfBySpecialtyRow[])) => void;
  options: ParameterOptions;
}

function newId() {
  return `cf-${Date.now()}`;
}

function optionsWithCurrent(options: string[], current: string | undefined): string[] {
  if (!current || current.trim() === '') return options;
  if (options.includes(current.trim())) return options;
  return [current.trim(), ...options];
}

function parseCurrency(val: string): number | undefined {
  const cleaned = val.replace(/[$,]/g, '').trim();
  if (cleaned === '') return undefined;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

function formatCurrency(num: number | undefined): string {
  if (num == null || !Number.isFinite(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ConversionFactorTab({
  cfBySpecialty,
  setCfBySpecialty,
  options,
}: ConversionFactorTabProps) {
  const addRow = useCallback(() => {
    setCfBySpecialty((prev) => [
      ...prev,
      { id: newId(), specialty: '', currentCf: undefined, proposedCf: undefined },
    ]);
  }, [setCfBySpecialty]);

  const update = useCallback(
    (id: string, updates: Partial<CfBySpecialtyRow>) => {
      setCfBySpecialty(cfBySpecialty.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [cfBySpecialty, setCfBySpecialty]
  );

  const remove = useCallback(
    (id: string) => setCfBySpecialty(cfBySpecialty.filter((r) => r.id !== id)),
    [cfBySpecialty, setCfBySpecialty]
  );

  const specialtyOpts = optionsWithCurrent(options.specialties, undefined);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Conversion factor by specialty</h3>
        <p className="text-sm text-slate-600 mt-1">
          Set Current CF and Proposed CF per specialty. These values apply when a provider record does not have CF set.
          Used for wRVU-based TCC (Proposed_TCC = Proposed_Base_Salary + Proposed_CF × wRVUs + supplemental).
        </p>
        {options.specialties.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">
            Upload provider data in Data to choose from existing specialties.
          </p>
        )}
      </div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Add specialty
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Specialty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Current CF ($)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Proposed CF ($)</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cfBySpecialty.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No specialty CFs. Click “Add specialty” to create one.
                </td>
              </tr>
            ) : (
              cfBySpecialty.map((r) => {
                const specOpts = optionsWithCurrent(specialtyOpts, r.specialty);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      {specOpts.length > 0 ? (
                        <SearchableSelect
                          value={r.specialty}
                          options={specOpts}
                          onChange={(v) => update(r.id, { specialty: v || '' })}
                          emptyOptionLabel="—"
                          className="min-w-[140px]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={r.specialty}
                          onChange={(e) => update(r.id, { specialty: e.target.value })}
                          className="w-full min-w-[140px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                          placeholder="e.g. Cardiology"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="text"
                        value={formatCurrency(r.currentCf)}
                        onChange={(e) => update(r.id, { currentCf: parseCurrency(e.target.value) })}
                        className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="text"
                        value={formatCurrency(r.proposedCf)}
                        onChange={(e) => update(r.id, { proposedCf: parseCurrency(e.target.value) })}
                        className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Remove"
                        aria-label="Remove"
                      >
                        ×
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
