/**
 * Policy rule editor: metadata, targeting, conditions (from dataset fields), actions.
 * Conditions use fields from the data (e.g. TCC percentile, wRVU percentile) so the engine
 * knows when to apply the rule. Stored as JsonLogic; guided builder or raw JSON.
 */

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import type { AnnualIncreasePolicy, PolicyStage, ConflictStrategy, PolicyAction, PolicyModelConfig } from '../../types/compensation-policy';
import type { ConditionTree } from '../../types/compensation-policy';
import { POLICY_STAGE_LABELS } from '../../types/compensation-policy';
import { DEFAULT_PROVIDER_TYPES, type ParameterOptions } from '../../lib/parameter-options';
import {
  CONDITION_FACT_OPTIONS,
  getOperatorsForFact,
  getDefaultOperatorForFact,
  conditionsToJsonLogic,
  conditionToReadableSentence,
  parseConditionsListForEditor,
  type SimpleCondition,
} from '../../lib/policy-engine/condition-builder';
import { MultiSelectDropdown } from '../../components/multi-select-dropdown';
import { RangeInputs } from '../../components/range-inputs';
import { validatePolicy } from '../../lib/policy-engine/validation';

interface PolicyRuleEditorProps {
  policy: AnnualIncreasePolicy;
  onUpdate: (updates: Partial<AnnualIncreasePolicy>) => void;
  onClose: () => void;
  parameterOptions: ParameterOptions;
  /** When provided, shows "Save as template" to add current policy to the user template library. */
  onSaveAsTemplate?: (policy: AnnualIncreasePolicy) => void;
}

const STAGES: PolicyStage[] = ['EXCLUSION_GUARDRAIL', 'CUSTOM_MODEL', 'MODIFIER', 'GENERAL_MATRIX', 'CAP_FLOOR'];

/** Policy type dropdown options (display label only; engine uses stage). */
const POLICY_TYPE_OPTIONS = [
  'General Merit Matrix',
  'Guardrail',
  'Modifier',
  'Cap / Floor',
  'Manual Review',
  'Override',
  'Custom model',
];

const CONDITION_FACT_VALUE_OPTIONS: Record<string, keyof ParameterOptions> = {
  division: 'divisions',
  specialty: 'specialties',
  providerType: 'providerTypes',
  department: 'departments',
};

function getConditionValueOptions(factKey: string, parameterOptions: ParameterOptions): string[] {
  const key = CONDITION_FACT_VALUE_OPTIONS[factKey];
  if (!key) return [];
  const arr = parameterOptions[key];
  return Array.isArray(arr) && arr.length > 0 ? arr : [];
}

const PRIORITY_PRESETS: { value: number; label: string; isFallback?: boolean }[] = [
  { value: 0, label: 'Highest priority' },
  { value: 25, label: 'High' },
  { value: 50, label: 'Medium' },
  { value: 75, label: 'Low' },
  { value: 100, label: 'Fallback', isFallback: true },
];

const CONFLICT_STRATEGY_PLAIN: { value: ConflictStrategy; label: string }[] = [
  { value: 'FORCE_RESULT', label: 'Override and set the result' },
  { value: 'REPLACE_BASE_RESULT', label: 'Replace the base result' },
  { value: 'ADDITIVE_MODIFIER', label: 'Add to the current result' },
  { value: 'CAP_RESULT', label: 'Cap the result at a maximum' },
  { value: 'FLOOR_RESULT', label: 'Set a minimum floor' },
  { value: 'BLOCK_AUTOMATION', label: 'Block automation (require manual review)' },
  { value: 'FALLBACK_ONLY', label: 'Apply only when no other policy has set a result' },
  { value: 'ANNOTATE_ONLY', label: 'Annotate only (do not change the result)' },
];

const EDIT_STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'target', label: 'Target scope' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'actions', label: 'Actions' },
] as const;

const SAVED_INDICATOR_DURATION_MS = 2500;

export function PolicyRuleEditor({ policy, onUpdate, onClose, parameterOptions, onSaveAsTemplate }: PolicyRuleEditorProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const initialPolicyRef = useRef<AnnualIncreasePolicy>(JSON.parse(JSON.stringify(policy)));

  useEffect(() => {
    initialPolicyRef.current = JSON.parse(JSON.stringify(policy));
  }, [policy.id]);

  // New policies are created as active; treat any existing draft as active when opening the editor.
  useEffect(() => {
    if (policy.status === 'draft') {
      onUpdate({ status: 'active' });
    }
  }, [policy.id, policy.status, onUpdate]);

  const handleRevert = useCallback(() => {
    onUpdate(initialPolicyRef.current);
    setShowSavedIndicator(true);
  }, [onUpdate]);

  const update = useCallback(
    (u: Partial<AnnualIncreasePolicy>) => {
      onUpdate(u);
      setShowSavedIndicator(true);
    },
    [onUpdate]
  );

  useEffect(() => {
    if (!showSavedIndicator) return;
    const t = setTimeout(() => setShowSavedIndicator(false), SAVED_INDICATOR_DURATION_MS);
    return () => clearTimeout(t);
  }, [showSavedIndicator]);

  const policyValidation = useMemo(() => validatePolicy(policy), [policy]);

  const updateScope = useCallback(
    (key: keyof NonNullable<AnnualIncreasePolicy['targetScope']>, value: string[] | number | undefined) => {
      const next = { ...policy.targetScope };
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete (next as Record<string, unknown>)[key];
      } else if (Array.isArray(value)) {
        (next as Record<string, string[] | undefined>)[key] = value;
      } else {
        (next as Record<string, number | undefined>)[key] = value;
      }
      onUpdate({ targetScope: next });
      setShowSavedIndicator(true);
    },
    [policy.targetScope, onUpdate]
  );

  const actionsList = policy.actions ?? [];
  const updateAction = useCallback(
    (index: number, u: Partial<PolicyAction>) => {
      const next = [...actionsList];
      next[index] = { ...next[index], ...u };
      onUpdate({ actions: next });
      setShowSavedIndicator(true);
    },
    [actionsList, onUpdate]
  );

  const addAction = useCallback(() => {
    onUpdate({ actions: [...actionsList, { type: 'ADD_INCREASE_PERCENT', value: 0 }] });
    setShowSavedIndicator(true);
  }, [actionsList, onUpdate]);

  const removeAction = useCallback(
    (index: number) => {
      onUpdate({ actions: actionsList.filter((_, i) => i !== index) });
      setShowSavedIndicator(true);
    },
    [actionsList, onUpdate]
  );

  const updateModelConfig = useCallback(
    (config: PolicyModelConfig | undefined) => {
      onUpdate({ modelConfig: config });
      setShowSavedIndicator(true);
    },
    [onUpdate]
  );

  const updateTierRow = useCallback(
    (index: number, field: 'label' | 'minYoe' | 'maxYoe' | 'increasePercent', value: number | string) => {
      const cfg = policy.modelConfig;
      if (!cfg || cfg.type !== 'YOE_TIER_TABLE') return;
      const tierRows = cfg.tierRows ?? [];
      const next = [...tierRows];
      if (!next[index]) return;
      next[index] = { ...next[index], [field]: value };
      updateModelConfig({ ...cfg, tierRows: next });
    },
    [policy.modelConfig, updateModelConfig]
  );
  const addTierRow = useCallback(() => {
    const cfg = policy.modelConfig;
    if (!cfg || cfg.type !== 'YOE_TIER_TABLE') return;
    const tierRows = cfg.tierRows ?? [];
    const last = tierRows[tierRows.length - 1];
    const maxYoe = last ? last.maxYoe + 1 : 0;
    updateModelConfig({
      ...cfg,
      tierRows: [...tierRows, { minYoe: maxYoe, maxYoe: maxYoe + 4, label: '', increasePercent: 3.5 }],
    });
  }, [policy.modelConfig, updateModelConfig]);
  const removeTierRow = useCallback(
    (index: number) => {
      const cfg = policy.modelConfig;
      if (!cfg || cfg.type !== 'YOE_TIER_TABLE') return;
      const tierRows = (cfg.tierRows ?? []).filter((_, i) => i !== index);
      updateModelConfig({ ...cfg, tierRows });
    },
    [policy.modelConfig, updateModelConfig]
  );

  const updateTierBaseRow = useCallback(
    (index: number, field: 'label' | 'minYoe' | 'maxYoe' | 'baseSalary', value: number | string) => {
      const cfg = policy.modelConfig;
      if (!cfg || cfg.type !== 'YOE_TIER_BASE_SALARY') return;
      const rows = cfg.tierBaseSalaryRows ?? [];
      const next = [...rows];
      if (!next[index]) return;
      next[index] = { ...next[index], [field]: value };
      updateModelConfig({ ...cfg, tierBaseSalaryRows: next });
    },
    [policy.modelConfig, updateModelConfig]
  );
  const addTierBaseRow = useCallback(() => {
    const cfg = policy.modelConfig;
    if (!cfg || cfg.type !== 'YOE_TIER_BASE_SALARY') return;
    const rows = cfg.tierBaseSalaryRows ?? [];
    const last = rows[rows.length - 1];
    const maxYoe = last ? last.maxYoe + 1 : 0;
    updateModelConfig({
      ...cfg,
      tierBaseSalaryRows: [...rows, { minYoe: maxYoe, maxYoe: maxYoe + 4, label: '', baseSalary: 0 }],
    });
  }, [policy.modelConfig, updateModelConfig]);
  const removeTierBaseRow = useCallback(
    (index: number) => {
      const cfg = policy.modelConfig;
      if (!cfg || cfg.type !== 'YOE_TIER_BASE_SALARY') return;
      const rows = (cfg.tierBaseSalaryRows ?? []).filter((_, i) => i !== index);
      updateModelConfig({ ...cfg, tierBaseSalaryRows: rows });
    },
    [policy.modelConfig, updateModelConfig]
  );

  const { conditions: initialConditions, combine: initialCombine } = parseConditionsListForEditor(policy.conditions);
  const [conditionList, setConditionList] = useState<SimpleCondition[]>(() =>
    initialConditions.length > 0 ? initialConditions : [{ factKey: 'tccPercentile', operator: '>', value: 75 }]
  );
  const [conditionCombine, setConditionCombine] = useState<'and' | 'or'>(() => initialCombine);

  useEffect(() => {
    const { conditions, combine } = parseConditionsListForEditor(policy.conditions);
    if (conditions.length > 0) {
      setConditionList(conditions);
      setConditionCombine(combine);
    }
  }, [policy.conditions]);

  const applyConditions = useCallback(
    (tree: ConditionTree | undefined) => {
      if (!tree || Object.keys(tree).length === 0) {
        onUpdate({ conditions: undefined });
      } else {
        onUpdate({ conditions: tree });
      }
      setShowSavedIndicator(true);
    },
    [onUpdate]
  );

  const addCondition = useCallback(() => {
    const newCondition: SimpleCondition = { factKey: 'tccPercentile', operator: '>', value: 75 };
    setConditionList((prev) => {
      const next = [...prev, newCondition];
      const tree = conditionsToJsonLogic(next, conditionCombine);
      applyConditions(tree ?? undefined);
      return next;
    });
  }, [conditionCombine, applyConditions]);

  const removeCondition = useCallback((index: number) => {
    setConditionList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const valid = next.filter((c) => c.factKey !== '');
      const tree = conditionsToJsonLogic(valid, conditionCombine);
      applyConditions(tree ?? undefined);
      return next;
    });
  }, [conditionCombine, applyConditions]);

  const clearAllConditions = useCallback(() => {
    setConditionList([]);
    applyConditions(undefined);
  }, [applyConditions]);

  const updateCondition = useCallback(
    (index: number, next: Partial<SimpleCondition>) => {
      setConditionList((prev) => {
        let merged = prev.map((c, i) => (i === index ? { ...c, ...next } : c)) as SimpleCondition[];
        const at = merged[index];
        if (at && next.factKey != null) {
          const allowedOps = getOperatorsForFact(next.factKey).map((o) => o.value);
          if (!allowedOps.includes(at.operator)) {
            merged = merged.map((c, i) =>
              i === index ? { ...c, operator: getDefaultOperatorForFact(next.factKey!) } : c
            ) as SimpleCondition[];
          }
        }
        const valid = merged.filter((c) => c.factKey !== '');
        const tree = conditionsToJsonLogic(valid, conditionCombine);
        applyConditions(tree ?? undefined);
        return merged;
      });
    },
    [conditionCombine, applyConditions]
  );

  const handleConditionCombineChange = useCallback(
    (combine: 'and' | 'or') => {
      setConditionCombine(combine);
      const valid = conditionList.filter((c) => c.factKey !== '');
      const tree = conditionsToJsonLogic(valid, combine);
      applyConditions(tree ?? undefined);
    },
    [conditionList, applyConditions]
  );

  const conditionSentence = conditionToReadableSentence(
    conditionsToJsonLogic(conditionList.filter((c) => c.factKey !== ''), conditionCombine) ?? undefined
  );

  const step = EDIT_STEPS[stepIndex];
  const canPrev = stepIndex > 0;
  const canNext = stepIndex < EDIT_STEPS.length - 1;
  const isLastStep = stepIndex === EDIT_STEPS.length - 1;

  const isTieredModel = policy.stage === 'CUSTOM_MODEL' && (policy.modelConfig?.type === 'YOE_TIER_TABLE' || policy.modelConfig?.type === 'YOE_TIER_BASE_SALARY');

  return (
    <div className="flex flex-col w-full min-w-0 relative">
      <div className="shrink-0 px-6 py-4 flex justify-between items-center border-b border-slate-100">
        <h4 className="text-base font-semibold text-slate-800">Edit rule</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRevert}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            title="Revert to original"
            aria-label="Revert to original"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Revert
          </button>
          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={() => onSaveAsTemplate(policy)}
              className="text-indigo-600 hover:text-indigo-800 text-sm px-2 py-1 font-medium"
            >
              Save as template
            </button>
          )}
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm px-2 py-1">
            Close
          </button>
        </div>
      </div>

      {/* Stepper: clickable numbered steps with connecting line */}
      <div className="shrink-0 px-6 pt-4">
        <nav className="flex items-center gap-1" aria-label="Edit steps">
          {EDIT_STEPS.map((s, i) => {
            const isActive = i === stepIndex;
            const isPast = i < stepIndex;
            return (
              <div key={s.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 ring-offset-2'
                      : isPast
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={s.label}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {i + 1}
                </button>
                {i < EDIT_STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-0.5 ${
                      isPast ? 'bg-indigo-200' : 'bg-slate-200'
                    }`}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </nav>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">{step.label}</p>
      </div>

      <div className="p-6 pt-4 pb-6 w-full min-w-0 overflow-y-auto">
        {(policyValidation.errors.length > 0 || policyValidation.warnings.length > 0) && (
          <div className="mb-4 space-y-2">
            {policyValidation.errors.length > 0 && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
                <p className="font-medium mb-1">Validation errors:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {policyValidation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {policyValidation.warnings.length > 0 && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-800 text-sm">
                <p className="font-medium mb-1">Warnings:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {policyValidation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {stepIndex === 0 && (
        <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={policy.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              type="text"
              value={policy.description ?? ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={policy.status === 'draft' ? 'active' : policy.status}
              onChange={(e) => update({ status: e.target.value as AnnualIncreasePolicy['status'] })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
            <select
              value={policy.stage}
              onChange={(e) => update({ stage: e.target.value as PolicyStage })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {POLICY_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Policy type</label>
            <select
              value={policy.policyType}
              onChange={(e) => update({ policyType: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {!POLICY_TYPE_OPTIONS.includes(policy.policyType) && policy.policyType && (
                <option value={policy.policyType}>{policy.policyType}</option>
              )}
              {POLICY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
            <select
              value={policy.isFallback ? 100 : policy.priority}
              onChange={(e) => {
                const opt = PRIORITY_PRESETS.find((p) => String(p.value) === e.target.value);
                if (opt) update({ priority: opt.value, isFallback: opt.isFallback ?? false });
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              title="Within this stage: 1st runs first, then 2nd, 3rd, 4th; Fallback runs last"
            >
              {PRIORITY_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-0.5">Within stage: 1st → 2nd → 3rd → 4th → Fallback</p>
          </div>
        </div>
        </div>
        )}

        {stepIndex === 1 && (
        <div className="rounded-lg border border-slate-200 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Target scope (optional)</label>
            <p className="text-xs text-slate-500 mb-3">Leave empty to apply to all providers.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="min-w-0 flex flex-col items-center text-center rounded-md border border-slate-100 bg-slate-50/50 px-3 py-3">
                {parameterOptions.divisions && parameterOptions.divisions.length > 0 ? (
                  <MultiSelectDropdown
                    label="Divisions"
                    options={parameterOptions.divisions}
                    selected={policy.targetScope.divisions ?? []}
                    onChange={(v) => updateScope('divisions', v)}
                    placeholder="All"
                    className="w-full"
                  />
                ) : (
                  <div className="h-9 w-full" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex flex-col items-center text-center rounded-md border border-slate-100 bg-slate-50/50 px-3 py-3">
                {parameterOptions.specialties && parameterOptions.specialties.length > 0 ? (
                  <MultiSelectDropdown
                    label="Specialties"
                    options={parameterOptions.specialties}
                    selected={policy.targetScope.specialties ?? []}
                    onChange={(v) => updateScope('specialties', v)}
                    placeholder="All"
                    className="w-full"
                  />
                ) : (
                  <div className="h-9 w-full" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex flex-col items-center text-center rounded-md border border-slate-100 bg-slate-50/50 px-3 py-3">
                <MultiSelectDropdown
                  label="Provider type"
                  options={(parameterOptions.providerTypes?.length ?? 0) > 0 ? parameterOptions.providerTypes : DEFAULT_PROVIDER_TYPES}
                  selected={policy.targetScope.providerTypes ?? []}
                  onChange={(v) => updateScope('providerTypes', v)}
                  placeholder="All"
                  className="w-full"
                />
              </div>
              <div className="min-w-0 flex flex-col items-center text-center rounded-md border border-slate-100 bg-slate-50/50 px-3 py-3">
                <RangeInputs
                  label="YOE"
                  labelPosition="top"
                  valueMin={policy.targetScope.yoeMin}
                  valueMax={policy.targetScope.yoeMax}
                  onChange={(min, max) =>
                    update({ targetScope: { ...policy.targetScope, yoeMin: min, yoeMax: max } })
                  }
                  min={0}
                  max={50}
                />
              </div>
              <div className="min-w-0 flex flex-col items-center text-center rounded-md border border-slate-100 bg-slate-50/50 px-3 py-3">
                <RangeInputs
                  label="TCC %ile"
                  labelPosition="top"
                  valueMin={policy.targetScope.tccPercentileMin}
                  valueMax={policy.targetScope.tccPercentileMax}
                  onChange={(min, max) =>
                    update({ targetScope: { ...policy.targetScope, tccPercentileMin: min, tccPercentileMax: max } })
                  }
                  min={0}
                  max={100}
                />
              </div>
              <div className="min-w-0 flex flex-col items-center text-center rounded-md border border-slate-100 bg-slate-50/50 px-3 py-3">
                <RangeInputs
                  label="wRVU %ile"
                  labelPosition="top"
                  valueMin={policy.targetScope.wrvuPercentileMin}
                  valueMax={policy.targetScope.wrvuPercentileMax}
                  onChange={(min, max) =>
                    update({ targetScope: { ...policy.targetScope, wrvuPercentileMin: min, wrvuPercentileMax: max } })
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {stepIndex === 2 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Conditions (when to apply)</label>
          <p className="text-xs text-slate-500 mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>Empty = scope match.</span>
            {policy.stage === 'CUSTOM_MODEL' && (
              <span className="text-indigo-600">YOE tier: empty = all.</span>
            )}
          </p>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleConditionCombineChange('and')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${conditionCombine === 'and' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => handleConditionCombineChange('or')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${conditionCombine === 'or' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              OR
            </button>
          </div>
          <div className="space-y-3">
            {conditionList.map((c, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 p-3 bg-white rounded-lg border border-slate-200">
                <div className="min-w-[130px] flex-1">
                  <span className="text-xs text-slate-500 block mb-0.5">Field</span>
                  <select
                    value={c.factKey}
                    onChange={(e) => updateCondition(i, { factKey: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                  >
                    <option value="">No condition</option>
                    {CONDITION_FACT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {c.factKey !== '' && (
                  <>
                    <div className="min-w-[90px] flex-1">
                      <span className="text-xs text-slate-500 block mb-0.5">Operator</span>
                      <select
                        value={c.operator}
                        onChange={(e) => updateCondition(i, { operator: e.target.value as SimpleCondition['operator'] })}
                        className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                      >
                        {getOperatorsForFact(c.factKey).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <span className="text-xs text-slate-500 block mb-0.5">Value</span>
                      {(() => {
                        const factType = CONDITION_FACT_OPTIONS.find((o) => o.value === c.factKey)?.type;
                        const valueOptions = factType === 'string' ? getConditionValueOptions(c.factKey, parameterOptions) : [];
                        const useDropdown = valueOptions.length > 0;
                        if (c.operator === 'in') {
                          if (useDropdown) {
                            return (
                              <MultiSelectDropdown
                                options={valueOptions}
                                selected={c.valueList ?? (typeof c.value === 'string' && c.value ? [c.value] : [])}
                                onChange={(v) => updateCondition(i, { valueList: v, value: v[0] ?? '' })}
                                placeholder="Select…"
                                compact
                              />
                            );
                          }
                          return (
                            <input
                              type="text"
                              value={c.valueList?.join(', ') ?? c.value}
                              onChange={(e) => {
                                const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                                updateCondition(i, { valueList: parts, value: parts[0] ?? '' });
                              }}
                              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                              placeholder="e.g. Exceeds, Outstanding"
                            />
                          );
                        }
                        if (useDropdown) {
                          const singleVal = typeof c.value === 'string' ? c.value : String(c.value ?? '');
                          return (
                            <select
                              value={valueOptions.includes(singleVal) ? singleVal : ''}
                              onChange={(e) => updateCondition(i, { value: e.target.value })}
                              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                            >
                              <option value="">Select…</option>
                              {valueOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          );
                        }
                        return (
                          <input
                            type={factType === 'number' ? 'number' : 'text'}
                            value={c.value}
                            onChange={(e) =>
                              updateCondition(i, {
                                value: factType === 'number' ? Number(e.target.value) || 0 : e.target.value,
                              })
                            }
                            className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                            step={0.1}
                            placeholder={factType === 'number' ? 'e.g. 75' : 'e.g. Cardiology'}
                          />
                        );
                      })()}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeCondition(i)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  aria-label="Remove condition"
                  title="Remove this condition"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-3">
              <button type="button" onClick={addCondition} className="text-sm text-indigo-600 hover:underline">
                + Add condition
              </button>
              {conditionList.length > 0 && (
                <button type="button" onClick={clearAllConditions} className="text-sm text-slate-500 hover:text-slate-700 hover:underline" title="Apply when scope matches">
                  Clear all
                </button>
              )}
            </div>
          </div>
          {conditionSentence && (
            <p className="mt-3 text-sm text-slate-700 font-medium">Summary: {conditionSentence}</p>
          )}
        </div>
        )}

        {stepIndex === 3 && (
        <div className={isTieredModel ? 'flex flex-col gap-6' : 'space-y-4'}>
          {/* Non-tiered: conflict strategy and stop processing at top */}
          {!isTieredModel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1" title="Behavior is determined by stage and actions; strategy is for labeling and audit.">
                  Conflict strategy
                </label>
                <select
                  value={policy.conflictStrategy}
                  onChange={(e) => update({ conflictStrategy: e.target.value as ConflictStrategy })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  title="Behavior is determined by stage and actions; strategy is for labeling and audit."
                >
                  {CONFLICT_STRATEGY_PLAIN.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Behavior is determined by stage and actions; strategy is for labeling and audit.
                </p>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.stopProcessing ?? false}
                    onChange={(e) => update({ stopProcessing: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Stop processing after this rule</span>
                </label>
              </div>
            </div>
          )}
          <div className={isTieredModel ? 'min-w-0' : 'space-y-4'}>
          {policy.stage === 'CUSTOM_MODEL' && !policy.modelConfig && (
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Custom model — select a model type:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateModelConfig({
                      type: 'YOE_TIER_TABLE',
                      tierRows: [
                        { minYoe: 0, maxYoe: 5, label: '0–5 YOE', increasePercent: 3.5 },
                        { minYoe: 5.01, maxYoe: 10, label: '5–10 YOE', increasePercent: 4 },
                        { minYoe: 10.01, maxYoe: 999, label: '10+ YOE', increasePercent: 4.5 },
                      ],
                    })
                  }
                  className="px-4 py-3 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-left"
                >
                  YOE tier → Increase %
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateModelConfig({
                      type: 'YOE_TIER_BASE_SALARY',
                      tierBaseSalaryRows: [
                        { minYoe: 0, maxYoe: 4, label: '0–4 YOE', baseSalary: 200000 },
                        { minYoe: 4.01, maxYoe: 8, label: '4–8 YOE', baseSalary: 220000 },
                        { minYoe: 8.01, maxYoe: 999, label: '8+ YOE', baseSalary: 240000 },
                      ],
                    })
                  }
                  className="px-4 py-3 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-left"
                >
                  YOE tier → Base salary
                </button>
                <button
                  type="button"
                  onClick={() => updateModelConfig({ type: 'FIXED_PERCENT', fixedIncreasePercent: 3.5 })}
                  className="px-4 py-3 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-left"
                >
                  Fixed %
                </button>
              </div>
            </div>
          )}
          {policy.stage === 'CUSTOM_MODEL' && policy.modelConfig?.type === 'FIXED_PERCENT' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-700">Fixed increase %</h4>
                <button
                  type="button"
                  onClick={() => updateModelConfig(undefined)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Change model type
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.1}
                  value={policy.modelConfig.fixedIncreasePercent ?? 0}
                  onChange={(e) =>
                    updateModelConfig({
                      type: 'FIXED_PERCENT',
                      fixedIncreasePercent: Number(e.target.value) || 0,
                    })
                  }
                  className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg text-right"
                />
                <span className="text-sm text-slate-600">%</span>
              </div>
            </div>
          )}
          {policy.stage === 'CUSTOM_MODEL' && policy.modelConfig?.type === 'YOE_TIER_TABLE' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-700">Tier increase % (YOE range → %)</h4>
                <button
                  type="button"
                  onClick={() => updateModelConfig(undefined)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Change model type
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                <table className="app-settings-table w-full border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '48px' }} />
                  </colgroup>
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
                    {(policy.modelConfig.tierRows ?? []).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={row.label}
                            onChange={(e) => updateTierRow(i, 'label', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-lg"
                            placeholder="e.g. Tier 1"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            value={row.minYoe}
                            onChange={(e) => updateTierRow(i, 'minYoe', Number(e.target.value) || 0)}
                            className="w-full max-w-[72px] ml-auto block px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            value={row.maxYoe}
                            onChange={(e) => updateTierRow(i, 'maxYoe', Number(e.target.value) || 0)}
                            className="w-full max-w-[72px] ml-auto block px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            step={0.1}
                            value={row.increasePercent}
                            onChange={(e) => updateTierRow(i, 'increasePercent', Number(e.target.value) || 0)}
                            className="w-full max-w-[72px] ml-auto block px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center w-12">
                          <button
                            type="button"
                            onClick={() => removeTierRow(i)}
                            className="inline-flex p-1 text-slate-400 hover:text-red-600"
                            aria-label="Remove row"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                className="mt-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
              >
                + Add tier
              </button>
            </div>
          )}
          {policy.stage === 'CUSTOM_MODEL' && policy.modelConfig?.type === 'YOE_TIER_BASE_SALARY' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-700">Tier base salary (YOE range → $)</h4>
                <button
                  type="button"
                  onClick={() => updateModelConfig(undefined)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Change model type
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                <table className="app-settings-table w-full border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '48px' }} />
                  </colgroup>
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
                    {(policy.modelConfig.tierBaseSalaryRows ?? []).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={row.label}
                            onChange={(e) => updateTierBaseRow(i, 'label', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-lg"
                            placeholder="e.g. 0–4 YOE"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            value={row.minYoe}
                            onChange={(e) => updateTierBaseRow(i, 'minYoe', Number(e.target.value) || 0)}
                            className="w-full max-w-[72px] ml-auto block px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            value={row.maxYoe}
                            onChange={(e) => updateTierBaseRow(i, 'maxYoe', Number(e.target.value) || 0)}
                            className="w-full max-w-[72px] ml-auto block px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            value={row.baseSalary}
                            onChange={(e) => updateTierBaseRow(i, 'baseSalary', Number(e.target.value) || 0)}
                            className="w-full max-w-[120px] ml-auto block px-2 py-1 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center w-12">
                          <button
                            type="button"
                            onClick={() => removeTierBaseRow(i)}
                            className="inline-flex p-1 text-slate-400 hover:text-red-600"
                            aria-label="Remove row"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                className="mt-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
              >
                + Add tier
              </button>
            </div>
          )}
          {policy.stage !== 'CUSTOM_MODEL' && !policy.modelConfig && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-600">Actions</label>
              <button type="button" onClick={addAction} className="text-xs text-indigo-600 hover:underline">
                Add action
              </button>
            </div>
          <ul className="space-y-2">
            {(policy.actions ?? []).map((a, i) => (
              <li key={i} className="flex gap-2 items-center border border-slate-200 rounded-lg p-2 bg-white">
                <select
                  value={a.type}
                  onChange={(e) => updateAction(i, { type: e.target.value as PolicyAction['type'] })}
                  className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <option value="ADD_INCREASE_PERCENT">Add increase %</option>
                  <option value="CAP_INCREASE_PERCENT">Cap increase %</option>
                  <option value="FLOOR_INCREASE_PERCENT">Floor increase %</option>
                  <option value="ZERO_OUT_INCREASE">Zero out increase</option>
                  <option value="SET_BASE_INCREASE_PERCENT">Set base increase %</option>
                  <option value="FORCE_INCREASE_PERCENT">Force increase %</option>
                  <option value="FLAG_MANUAL_REVIEW">Flag manual review</option>
                  <option value="EXCLUDE_FROM_STANDARD_PROCESS">Exclude from standard process</option>
                </select>
                {(a.type === 'ADD_INCREASE_PERCENT' || a.type === 'CAP_INCREASE_PERCENT' || a.type === 'FLOOR_INCREASE_PERCENT' || a.type === 'SET_BASE_INCREASE_PERCENT' || a.type === 'FORCE_INCREASE_PERCENT') && (
                  <input
                    type="number"
                    value={a.value ?? 0}
                    onChange={(e) => updateAction(i, { value: Number(e.target.value) })}
                    className="w-20 text-sm border border-slate-300 rounded px-2 py-1 text-right bg-white"
                    step={0.1}
                  />
                )}
                <button type="button" onClick={() => removeAction(i)} className="p-1 text-slate-400 hover:text-red-600">
                  ×
                </button>
              </li>
            ))}
          </ul>
          </div>
          )}
          </div>
          {/* Tiered model: conflict strategy and stop processing below the tier table */}
          {isTieredModel && (
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rule behavior</h4>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1" title="Behavior is determined by stage and actions; strategy is for labeling and audit.">
                    Conflict strategy
                  </label>
                  <select
                    value={policy.conflictStrategy}
                    onChange={(e) => update({ conflictStrategy: e.target.value as ConflictStrategy })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    title="Behavior is determined by stage and actions; strategy is for labeling and audit."
                  >
                    {CONFLICT_STRATEGY_PLAIN.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-6 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policy.stopProcessing ?? false}
                      onChange={(e) => update({ stopProcessing: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Stop processing after this rule</span>
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Behavior is determined by stage and actions; strategy is for labeling and audit.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Stepper footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
          >
            Back
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(EDIT_STEPS.length - 1, i + 1))}
              disabled={!canNext}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {showSavedIndicator && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-900/20"
          role="status"
          aria-live="polite"
        >
          <svg className="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </div>
      )}
    </div>
  );
}
