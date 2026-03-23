/**
 * Guided Create Custom Model wizard: type → scope → tiers → name & save.
 * Matches the look and sophistication of the policy create wizard.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CustomCompensationModel, CustomModelType, PolicyTargetScope } from '../../types/compensation-policy';
import type { ProviderRecord } from '../../types/provider';
import type { ParameterOptions } from '../../lib/parameter-options';
import type { MarketResolver } from '../../types/market-survey-config';
import { buildFactsFromRecord } from '../../lib/policy-engine/facts';
import { matchesTargetScope } from '../../lib/policy-engine/targeting';
import { MultiSelectDropdown } from '../../components/multi-select-dropdown';
import { RangeInputs } from '../../components/range-inputs';

const MODEL_TYPE_CARDS: { id: CustomModelType; label: string; description: string }[] = [
  {
    id: 'YOE_TIER_BASE_SALARY',
    label: 'Base salary by YOE',
    description: 'Assign a fixed base salary based on years of experience (e.g. 0–4 YOE → $175k).',
  },
  {
    id: 'YOE_TIER_TABLE',
    label: 'Increase % by YOE',
    description: 'Assign increase percentages by YOE tier instead of merit matrix (e.g. Tier 1 → 3.5%, Tier 2 → 4%).',
  },
  {
    id: 'FIXED_PERCENT',
    label: 'Fixed %',
    description: 'Apply a single increase percentage to the targeted population regardless of YOE or score.',
  },
];

function newModelId(): string {
  return `model-${Date.now()}`;
}

function countMatchingProviders(
  records: ProviderRecord[],
  scope: PolicyTargetScope,
  marketResolver: MarketResolver
): number {
  let n = 0;
  for (const r of records) {
    const key = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
    const marketRow = key ? marketResolver(r, key) : undefined;
    const facts = buildFactsFromRecord(r, { marketRow });
    if (matchesTargetScope(scope, facts)) n++;
  }
  return n;
}

function optionsWithCurrent(options: string[], current: string[]): string[] {
  const set = new Set(options ?? []);
  for (const c of current) {
    if (c?.trim() && !set.has(c.trim())) set.add(c.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export interface CustomModelCreateWizardProps {
  onClose: () => void;
  onSaved: (model: CustomCompensationModel) => void;
  setCustomModels: (updater: (prev: CustomCompensationModel[]) => CustomCompensationModel[]) => void;
  records: ProviderRecord[];
  parameterOptions: ParameterOptions;
  marketResolver: MarketResolver;
}

const STEPS = ['type', 'scope', 'tiers', 'save'] as const;

const DEFAULT_TIER_ROWS = [
  { minYoe: 0, maxYoe: 2, label: 'Tier 1', increasePercent: 3.5 },
  { minYoe: 2.01, maxYoe: 5, label: 'Tier 2', increasePercent: 4 },
  { minYoe: 5.01, maxYoe: 999, label: 'Tier 3', increasePercent: 4.5 },
];

const DEFAULT_TIER_BASE_SALARY_ROWS = [
  { minYoe: 0, maxYoe: 4, label: '0–4 YOE', baseSalary: 175000 },
  { minYoe: 4.01, maxYoe: 8, label: '4–8 YOE', baseSalary: 190000 },
  { minYoe: 8.01, maxYoe: 999, label: '8+ YOE', baseSalary: 200000 },
];

export function CustomModelCreateWizard({
  onClose,
  onSaved,
  setCustomModels,
  records,
  parameterOptions,
  marketResolver,
}: CustomModelCreateWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedTypeId, setSelectedTypeId] = useState<CustomModelType | null>(null);
  const [targetScope, setTargetScope] = useState<PolicyTargetScope>({});
  const [tierRows, setTierRows] = useState(DEFAULT_TIER_ROWS);
  const [tierBaseSalaryRows, setTierBaseSalaryRows] = useState(DEFAULT_TIER_BASE_SALARY_ROWS);
  const [fixedIncreasePercent, setFixedIncreasePercent] = useState(3.5);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CustomCompensationModel['status']>('draft');

  const selectedType = useMemo(
    () => MODEL_TYPE_CARDS.find((t) => t.id === selectedTypeId),
    [selectedTypeId]
  );

  const draftModel: CustomCompensationModel | null = useMemo(() => {
    if (!selectedType) return null;
    const base = {
      id: '',
      key: `custom-${Date.now()}`,
      name: name || 'New custom model',
      description: description || undefined,
      type: selectedType.id,
      status,
      targetScope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (selectedType.id === 'YOE_TIER_BASE_SALARY') {
      return { ...base, tierBaseSalaryRows, tierRows: undefined, fixedIncreasePercent: undefined };
    }
    if (selectedType.id === 'YOE_TIER_TABLE') {
      return { ...base, tierRows, tierBaseSalaryRows: undefined, fixedIncreasePercent: undefined };
    }
    return { ...base, fixedIncreasePercent, tierRows: undefined, tierBaseSalaryRows: undefined };
  }, [selectedType, name, description, status, targetScope, tierRows, tierBaseSalaryRows, fixedIncreasePercent]);

  const matchingCount = useMemo(
    () => (draftModel ? countMatchingProviders(records, draftModel.targetScope, marketResolver) : 0),
    [records, draftModel?.targetScope, marketResolver]
  );

  const updateScope = useCallback((key: keyof PolicyTargetScope, value: string[] | number | undefined) => {
    setTargetScope((prev) => {
      const next = { ...prev };
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete next[key];
      } else if (Array.isArray(value)) {
        (next as Record<string, string[] | number | undefined>)[key] = value;
      } else if (typeof value === 'number') {
        (next as Record<string, string[] | number | undefined>)[key] = value;
      }
      return next;
    });
  }, []);

  const updateTierRow = useCallback(
    (index: number, field: keyof (typeof tierRows)[0], value: number | string) => {
      setTierRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const updateTierBaseRow = useCallback(
    (index: number, field: keyof (typeof tierBaseSalaryRows)[0], value: number | string) => {
      setTierBaseSalaryRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const addTierRow = useCallback(() => {
    const last = tierRows[tierRows.length - 1];
    const maxYoe = last ? last.maxYoe + 1 : 0;
    setTierRows((prev) => [...prev, { minYoe: maxYoe, maxYoe: maxYoe + 4, label: '', increasePercent: 3.5 }]);
  }, [tierRows]);

  const addTierBaseRow = useCallback(() => {
    const last = tierBaseSalaryRows[tierBaseSalaryRows.length - 1];
    const maxYoe = last ? last.maxYoe + 1 : 0;
    setTierBaseSalaryRows((prev) => [...prev, { minYoe: maxYoe, maxYoe: maxYoe + 4, label: '', baseSalary: 0 }]);
  }, [tierBaseSalaryRows]);

  const removeTierRow = useCallback((index: number) => {
    setTierRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeTierBaseRow = useCallback((index: number) => {
    setTierBaseSalaryRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (!draftModel) return;
    const id = newModelId();
    const saved: CustomCompensationModel = {
      ...draftModel,
      id,
      key: `custom-${id}`,
      name: name.trim() || draftModel.name,
      description: description.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    setCustomModels((prev) => [...prev, saved]);
    onSaved(saved);
    onClose();
  }, [draftModel, name, description, setCustomModels, onSaved, onClose]);

  const step = STEPS[stepIndex];
  const divisionOpts = optionsWithCurrent(parameterOptions.divisions ?? [], targetScope.divisions ?? []);
  const specialtyOpts = optionsWithCurrent(parameterOptions.specialties ?? [], targetScope.specialties ?? []);
  const providerTypeOpts = optionsWithCurrent(parameterOptions.providerTypes ?? [], targetScope.providerTypes ?? []);

  const canNext =
    step === 'type'
      ? selectedTypeId != null
      : step === 'scope'
        ? true
        : step === 'tiers'
          ? true
          : true;
  const canPrev = stepIndex > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Create custom model"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Create Custom Model</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 p-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 px-6 py-2 flex gap-2 overflow-x-auto border-b border-slate-100">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStepIndex(i)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
                i === stepIndex
                  ? 'bg-indigo-600 text-white'
                  : i < stepIndex
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {step === 'type' && (
            <>
              <p className="text-sm text-slate-600 mb-4">Choose what type of custom model you are creating.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODEL_TYPE_CARDS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTypeId(t.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedTypeId === t.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">{t.label}</div>
                    <div className="text-sm text-slate-600 mt-1">{t.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'scope' && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Define who this model applies to. Leave filters empty to apply to all providers.
              </p>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 w-full">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      {parameterOptions.divisions && parameterOptions.divisions.length > 0 ? (
                        <MultiSelectDropdown
                          label="Division"
                          options={divisionOpts}
                          selected={targetScope.divisions ?? []}
                          onChange={(v) => updateScope('divisions', v)}
                          placeholder="All"
                        />
                      ) : (
                        <div className="h-9" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      {parameterOptions.specialties && parameterOptions.specialties.length > 0 ? (
                        <MultiSelectDropdown
                          label="Specialty"
                          options={specialtyOpts}
                          selected={targetScope.specialties ?? []}
                          onChange={(v) => updateScope('specialties', v)}
                          placeholder="All"
                        />
                      ) : (
                        <div className="h-9" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <MultiSelectDropdown
                        label="Provider type"
                        options={providerTypeOpts}
                        selected={targetScope.providerTypes ?? []}
                        onChange={(v) => updateScope('providerTypes', v)}
                        placeholder="All"
                      />
                    </div>
                    <div className="min-w-0">
                      <RangeInputs
                        label="YOE"
                        valueMin={targetScope.yoeMin}
                        valueMax={targetScope.yoeMax}
                        onChange={(min, max) => setTargetScope((prev) => ({ ...prev, yoeMin: min, yoeMax: max }))}
                        min={0}
                        max={50}
                      />
                    </div>
                    <div className="min-w-0">
                      <RangeInputs
                        label="TCC %ile"
                        valueMin={targetScope.tccPercentileMin}
                        valueMax={targetScope.tccPercentileMax}
                        onChange={(min, max) =>
                          setTargetScope((prev) => ({ ...prev, tccPercentileMin: min, tccPercentileMax: max }))
                        }
                        min={0}
                        max={100}
                      />
                    </div>
                    <div className="min-w-0">
                      <RangeInputs
                        label="wRVU %ile"
                        valueMin={targetScope.wrvuPercentileMin}
                        valueMax={targetScope.wrvuPercentileMax}
                        onChange={(min, max) =>
                          setTargetScope((prev) => ({ ...prev, wrvuPercentileMin: min, wrvuPercentileMax: max }))
                        }
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-800 mt-2">This model applies to {matchingCount} providers.</p>
              </div>
            </>
          )}

          {step === 'tiers' && selectedType && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                {selectedType.id === 'FIXED_PERCENT'
                  ? 'Set the increase percentage for the targeted population.'
                  : 'Configure the tier values. Providers are matched to tiers by years of experience.'}
              </p>

              {selectedType.id === 'YOE_TIER_TABLE' && (
                <div className="space-y-2">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="app-settings-table min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th>Label</th>
                          <th className="text-right">Min YOE</th>
                          <th className="text-right">Max YOE</th>
                          <th className="text-right">Increase %</th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tierRows.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={row.label}
                                onChange={(e) => updateTierRow(i, 'label', e.target.value)}
                                className="w-full min-w-[100px] px-2 py-1 text-sm border border-slate-300 rounded-lg"
                                placeholder="e.g. Tier 1"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.minYoe}
                                onChange={(e) => updateTierRow(i, 'minYoe', Number(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.maxYoe}
                                onChange={(e) => updateTierRow(i, 'maxYoe', Number(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                step={0.1}
                                value={row.increasePercent}
                                onChange={(e) =>
                                  updateTierRow(i, 'increasePercent', Number(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeTierRow(i)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                aria-label="Remove row"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addTierRow}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    + Add tier
                  </button>
                </div>
              )}

              {selectedType.id === 'YOE_TIER_BASE_SALARY' && (
                <div className="space-y-2">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="app-settings-table min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th>Label</th>
                          <th className="text-right">Min YOE</th>
                          <th className="text-right">Max YOE</th>
                          <th className="text-right">Base salary</th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tierBaseSalaryRows.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={row.label}
                                onChange={(e) => updateTierBaseRow(i, 'label', e.target.value)}
                                className="w-full min-w-[100px] px-2 py-1 text-sm border border-slate-300 rounded-lg"
                                placeholder="e.g. 0–4 YOE"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.minYoe}
                                onChange={(e) =>
                                  updateTierBaseRow(i, 'minYoe', Number(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.maxYoe}
                                onChange={(e) =>
                                  updateTierBaseRow(i, 'maxYoe', Number(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.baseSalary}
                                onChange={(e) =>
                                  updateTierBaseRow(i, 'baseSalary', Number(e.target.value) || 0)
                                }
                                className="w-28 px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeTierBaseRow(i)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                aria-label="Remove row"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addTierBaseRow}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    + Add tier
                  </button>
                </div>
              )}

              {selectedType.id === 'FIXED_PERCENT' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Increase %</label>
                  <input
                    type="number"
                    step={0.1}
                    value={fixedIncreasePercent}
                    onChange={(e) => setFixedIncreasePercent(Number(e.target.value) || 0)}
                    className="w-32 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </>
          )}

          {step === 'save' && (
            <>
              <p className="text-sm text-slate-600 mb-4">Name your model and save.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Model name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="e.g. PCP Base Salary by YOE Tier"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="Brief description"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomCompensationModel['status'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {draftModel && (
                  <div className="text-sm text-slate-600 pt-2">
                    <p>
                      <strong>Type:</strong> {selectedType?.label}
                    </p>
                    <p>
                      <strong>Applies to:</strong> {matchingCount} providers
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-slate-200 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
          >
            Back
          </button>
          {step !== 'save' ? (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
              disabled={!canNext}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save model
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
