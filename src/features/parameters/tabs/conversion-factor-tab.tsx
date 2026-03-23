import { useCallback } from 'react';
import type { CfBySpecialtyRow } from '../../../types/cf-by-specialty';
import type { ParameterOptions } from '../../../lib/parameter-options';
import { SearchableSelect } from '../../../components/searchable-select';
import {
  parametersFieldInputClass,
  parametersPrimaryButtonClass,
  parametersSectionDescriptionClass,
  parametersSectionHeadingClass,
  parametersTablePanelClass,
} from '../parameters-tab-ui';

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
    <div className="p-6 max-w-4xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h3 className={parametersSectionHeadingClass}>Conversion factor by specialty</h3>
          <p className={parametersSectionDescriptionClass}>
            Set Current CF and Proposed CF per specialty. These values apply when a provider record does not have CF set.
            Used for wRVU-based TCC (Proposed_TCC = Proposed_Base_Salary + Proposed_CF × wRVUs + supplemental).
          </p>
          {options.specialties.length === 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Upload provider data in Data to choose from existing specialties.
            </p>
          )}
        </div>
        <button type="button" onClick={addRow} className={`${parametersPrimaryButtonClass} sm:mt-0.5`}>
          Add specialty
        </button>
      </div>
      <div className={parametersTablePanelClass}>
        <table className="app-settings-table w-full border-collapse table-fixed">
          <colgroup>
            <col className="min-w-0" />
            <col className="w-[7.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Specialty</th>
              <th className="text-right whitespace-nowrap">Current CF ($)</th>
              <th className="text-right whitespace-nowrap">Proposed CF ($)</th>
              <th className="w-12 px-2" aria-label="Actions" />
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
                    <td className="px-4 py-2 align-middle min-w-0">
                      {specOpts.length > 0 ? (
                        <SearchableSelect
                          value={r.specialty}
                          options={specOpts}
                          onChange={(v) => update(r.id, { specialty: v || '' })}
                          emptyOptionLabel="—"
                          className="w-full max-w-md min-w-0"
                        />
                      ) : (
                        <input
                          type="text"
                          value={r.specialty}
                          onChange={(e) => update(r.id, { specialty: e.target.value })}
                          className={`w-full max-w-md min-w-0 ${parametersFieldInputClass}`}
                          placeholder="e.g. Cardiology"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      <input
                        type="text"
                        value={formatCurrency(r.currentCf)}
                        onChange={(e) => update(r.id, { currentCf: parseCurrency(e.target.value) })}
                        className={`ml-auto block w-24 max-w-full ${parametersFieldInputClass} text-right tabular-nums`}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      <input
                        type="text"
                        value={formatCurrency(r.proposedCf)}
                        onChange={(e) => update(r.id, { proposedCf: parseCurrency(e.target.value) })}
                        className={`ml-auto block w-24 max-w-full ${parametersFieldInputClass} text-right tabular-nums`}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded inline-flex"
                        title="Remove"
                        aria-label="Remove"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
