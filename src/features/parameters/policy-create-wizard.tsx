/**
 * Guided Create Policy wizard: type → target population → conditions → action → priority → preview → save.
 * No raw JSON or code exposed to admins.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnnualIncreasePolicy, PolicyStage, PolicyTargetScope, PolicyAction, ConflictStrategy, PolicyModelConfig } from '../../types/compensation-policy';
import type { ConditionTree } from '../../types/compensation-policy';
import { POLICY_STAGE_LABELS } from '../../types/compensation-policy';
import type { ProviderRecord } from '../../types/provider';
import { DEFAULT_PROVIDER_TYPES, type ParameterOptions } from '../../lib/parameter-options';
import { buildFactsFromRecord } from '../../lib/policy-engine/facts';
import { matchesTargetScope } from '../../lib/policy-engine/targeting';
import {
  CONDITION_FACT_OPTIONS,
  getOperatorsForFact,
  getDefaultOperatorForFact,
  conditionsToJsonLogic,
  conditionToReadableSentence,
  type SimpleCondition,
} from '../../lib/policy-engine/condition-builder';
import { MultiSelectDropdown } from '../../components/multi-select-dropdown';
import { RangeInputs } from '../../components/range-inputs';
import { evaluatePolicyForProvider } from '../../lib/policy-engine/evaluator';
import type { PolicyEvaluationContext } from '../../lib/policy-engine/evaluator';
import { validatePolicy, testConditionAgainstFacts } from '../../lib/policy-engine/validation';
import type { MarketResolver } from '../../types/market-survey-config';
import type { MeritMatrixRow } from '../../types/merit-matrix-row';

const POLICY_TYPE_CARDS: {
  id: string;
  label: string;
  description: string;
  stage: PolicyStage;
  policyType: string;
  conflictStrategy: ConflictStrategy;
  defaultActions: PolicyAction[];
}[] = [
  {
    id: 'general-merit-matrix',
    label: 'General Merit Matrix',
    description: 'The default annual increase table based on provider review scores.',
    stage: 'GENERAL_MATRIX',
    policyType: 'General Merit Matrix',
    conflictStrategy: 'FALLBACK_ONLY',
    defaultActions: [{ type: 'ASSIGN_GENERAL_MATRIX' }],
  },
  {
    id: 'guardrail',
    label: 'Guardrail Rule',
    description: 'A rule that stops or overrides increases if certain thresholds are met.',
    stage: 'EXCLUSION_GUARDRAIL',
    policyType: 'Guardrail',
    conflictStrategy: 'FORCE_RESULT',
    defaultActions: [{ type: 'ZERO_OUT_INCREASE' }],
  },
  {
    id: 'modifier',
    label: 'Modifier Rule',
    description: 'Add or adjust increase (e.g. +0.5% for high wRVU).',
    stage: 'MODIFIER',
    policyType: 'Modifier',
    conflictStrategy: 'ADDITIVE_MODIFIER',
    defaultActions: [{ type: 'ADD_INCREASE_PERCENT', value: 0 }],
  },
  {
    id: 'cap-floor',
    label: 'Cap / Floor Rule',
    description: 'Cap or set a minimum on the increase percentage.',
    stage: 'CAP_FLOOR',
    policyType: 'Cap / Floor',
    conflictStrategy: 'CAP_RESULT',
    defaultActions: [{ type: 'CAP_INCREASE_PERCENT', value: 5 }],
  },
  {
    id: 'manual-review',
    label: 'Manual Review Rule',
    description: 'Require manual review when conditions are met.',
    stage: 'EXCLUSION_GUARDRAIL',
    policyType: 'Manual Review',
    conflictStrategy: 'BLOCK_AUTOMATION',
    defaultActions: [{ type: 'FLAG_MANUAL_REVIEW' }],
  },
  {
    id: 'override',
    label: 'Override Rule',
    description: 'Force a specific increase (e.g. for selected providers or conditions).',
    stage: 'EXCLUSION_GUARDRAIL',
    policyType: 'Override',
    conflictStrategy: 'FORCE_RESULT',
    defaultActions: [{ type: 'FORCE_INCREASE_PERCENT', value: 0 }],
  },
  {
    id: 'yoe-tier-increase',
    label: 'YOE Tier (Increase %)',
    description: 'Assign increase % by Years of Experience tier (e.g. 3.5% for 3–5 YOE).',
    stage: 'CUSTOM_MODEL',
    policyType: 'Custom model',
    conflictStrategy: 'REPLACE_BASE_RESULT',
    defaultActions: [],
  },
  {
    id: 'yoe-tier-base-salary',
    label: 'YOE Tier (Base Salary)',
    description: 'Assign fixed base salary by YOE tier (e.g. $190k for 4–8 YOE). Replaces merit % for matched providers.',
    stage: 'CUSTOM_MODEL',
    policyType: 'Custom model',
    conflictStrategy: 'REPLACE_BASE_RESULT',
    defaultActions: [],
  },
];

/** Categorical condition facts that have dropdown options from parameterOptions (no free text). */
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

const PRIORITY_OPTIONS: { value: number; label: string; isFallback: boolean; sentence: string }[] = [
  { value: 0, label: 'Highest Priority', isFallback: false, sentence: 'This policy will override standard matrix logic.' },
  { value: 25, label: 'High', isFallback: false, sentence: 'This policy runs before most others in its stage.' },
  { value: 50, label: 'Medium', isFallback: false, sentence: 'This policy runs in normal order with others.' },
  { value: 75, label: 'Low', isFallback: false, sentence: 'This policy runs after higher-priority policies.' },
  { value: 100, label: 'Fallback', isFallback: true, sentence: 'Used only when no other policy has set a result.' },
];

const ACTION_LABELS: Record<string, string> = {
  SET_BASE_INCREASE_PERCENT: 'Set increase percentage',
  ADD_INCREASE_PERCENT: 'Add increase percentage',
  CAP_INCREASE_PERCENT: 'Cap increase percentage',
  FLOOR_INCREASE_PERCENT: 'Floor increase percentage',
  FORCE_INCREASE_PERCENT: 'Force increase to',
  ZERO_OUT_INCREASE: 'Force increase to zero',
  FLAG_MANUAL_REVIEW: 'Require manual review',
  EXCLUDE_FROM_STANDARD_PROCESS: 'Exclude from standard process',
  ASSIGN_TIER_TABLE: 'Assign tier table',
  ASSIGN_CUSTOM_MODEL: 'Assign custom model',
  ADD_POLICY_LABEL: 'Attach policy label',
};

function newPolicyId(): string {
  return `pol-${Date.now()}`;
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

export interface PolicyCreateWizardProps {
  onClose: () => void;
  onSaved: (policy: AnnualIncreasePolicy) => void;
  policyState: {
    policies: AnnualIncreasePolicy[];
    setPolicies: (updater: (prev: AnnualIncreasePolicy[]) => AnnualIncreasePolicy[]) => void;
    customModels: PolicyEvaluationContext['customModels'];
    tierTables: PolicyEvaluationContext['tierTables'];
  };
  records: ProviderRecord[];
  parameterOptions: ParameterOptions;
  meritMatrixRows: MeritMatrixRow[];
  marketResolver: MarketResolver;
  /** ISO date for policy effective date checks (from selected cycle). */
  asOfDate?: string;
}

const STEPS = ['type', 'target', 'conditions', 'action', 'priority', 'preview', 'save'] as const;

export function PolicyCreateWizard({
  onClose,
  onSaved,
  policyState,
  records,
  parameterOptions,
  meritMatrixRows,
  marketResolver,
  asOfDate,
}: PolicyCreateWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [targetScope, setTargetScope] = useState<PolicyTargetScope>({});
  const [conditionList, setConditionList] = useState<SimpleCondition[]>([
    { factKey: 'tccPercentile', operator: '>', value: 75 },
  ]);
  const [conditionCombine, setConditionCombine] = useState<'and' | 'or'>('and');
  const [actions, setActions] = useState<PolicyAction[]>([]);
  const [modelConfig, setModelConfig] = useState<PolicyModelConfig | undefined>(undefined);
  const [priorityOption, setPriorityOption] = useState(50); // Medium
  const [isFallback, setIsFallback] = useState(false);

  const selectedType = useMemo(() => POLICY_TYPE_CARDS.find((t) => t.id === selectedTypeId), [selectedTypeId]);

  useEffect(() => {
    if (selectedTypeId === 'yoe-tier-increase') {
      setModelConfig(
        modelConfig && modelConfig.type === 'YOE_TIER_TABLE'
          ? modelConfig
          : {
              type: 'YOE_TIER_TABLE',
              tierRows: [
                { minYoe: 0, maxYoe: 2, label: 'Tier 1', increasePercent: 3.5 },
                { minYoe: 2.01, maxYoe: 5, label: 'Tier 2', increasePercent: 4 },
                { minYoe: 5.01, maxYoe: 999, label: 'Tier 3', increasePercent: 4.5 },
              ],
            }
      );
      // YOE tier policies apply by scope; default to no conditions (apply when target scope matches)
      setConditionList([]);
    } else if (selectedTypeId === 'yoe-tier-base-salary') {
      setModelConfig(
        modelConfig && modelConfig.type === 'YOE_TIER_BASE_SALARY'
          ? modelConfig
          : {
              type: 'YOE_TIER_BASE_SALARY',
              tierBaseSalaryRows: [
                { minYoe: 0, maxYoe: 4, label: '0–4 YOE', baseSalary: 175000 },
                { minYoe: 4.01, maxYoe: 8, label: '4–8 YOE', baseSalary: 190000 },
                { minYoe: 8.01, maxYoe: 999, label: '8+ YOE', baseSalary: 200000 },
              ],
            }
      );
      setConditionList([]);
    } else {
      setModelConfig(undefined);
    }
  }, [selectedTypeId]);

  const draftPolicy: AnnualIncreasePolicy | null = useMemo(() => {
    if (!selectedType) return null;
    const conditions: ConditionTree | undefined = conditionsToJsonLogic(conditionList, conditionCombine) ?? undefined;
    return {
      id: '',
      key: `rule-${Date.now()}`,
      name: name || 'New policy',
      description: description || undefined,
      status: 'draft',
      stage: selectedType.stage,
      policyType: selectedType.policyType,
      priority: priorityOption,
      targetScope,
      conditions,
      modelConfig: selectedType.stage === 'CUSTOM_MODEL' ? modelConfig : undefined,
      actions: actions.length > 0 ? actions : selectedType.defaultActions,
      conflictStrategy: selectedType.conflictStrategy,
      isFallback,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [selectedType, name, description, priorityOption, targetScope, conditionList, conditionCombine, actions, modelConfig, isFallback]);

  const matchingCount = useMemo(
    () => (draftPolicy ? countMatchingProviders(records, draftPolicy.targetScope, marketResolver) : 0),
    [records, draftPolicy?.targetScope, marketResolver]
  );

  const conditionSentence = useMemo(() => {
    const tree = conditionsToJsonLogic(conditionList, conditionCombine);
    return conditionToReadableSentence(tree ?? undefined);
  }, [conditionList, conditionCombine]);

  const conditionMatchCount = useMemo(() => {
    const tree = conditionsToJsonLogic(conditionList, conditionCombine);
    if (!tree || !records.length) return null;
    const factsArray = records.map((r) => {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      return buildFactsFromRecord(r, { marketRow });
    });
    return testConditionAgainstFacts(tree, factsArray);
  }, [conditionList, conditionCombine, records, marketResolver]);

  const contextWithoutDraft: PolicyEvaluationContext = useMemo(
    () => ({
      policies: policyState.policies,
      customModels: policyState.customModels,
      tierTables: policyState.tierTables,
      meritMatrixRows,
      asOfDate,
    }),
    [policyState.policies, policyState.customModels, policyState.tierTables, meritMatrixRows, asOfDate]
  );

  const previewImpact = useMemo(() => {
    if (!draftPolicy) return { affected: 0, changes: [] as { name: string; from: number; to: number }[] };
    const withDraft = {
      ...contextWithoutDraft,
      policies: [
        ...contextWithoutDraft.policies.filter((p) => p.status === 'active'),
        { ...draftPolicy, id: draftPolicy.id || 'draft-preview', status: 'active' as const },
      ],
    };
    const changes: { name: string; from: number; to: number }[] = [];
    for (const record of records) {
      const key = (record.Market_Specialty_Override ?? record.Specialty ?? record.Benchmark_Group ?? '').trim();
      const marketRow = key ? marketResolver(record, key) : undefined;
      const before = evaluatePolicyForProvider(record, { ...contextWithoutDraft, marketRow });
      const after = evaluatePolicyForProvider(record, { ...withDraft, marketRow });
      if (before.finalRecommendedIncreasePercent !== after.finalRecommendedIncreasePercent) {
        changes.push({
          name: record.Provider_Name ?? record.Employee_ID,
          from: before.finalRecommendedIncreasePercent,
          to: after.finalRecommendedIncreasePercent,
        });
      }
    }
    return { affected: changes.length, changes };
  }, [draftPolicy, records, contextWithoutDraft, marketResolver]);

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

  const addCondition = useCallback(() => {
    setConditionList((prev) => [...prev, { factKey: 'tccPercentile', operator: '>', value: 75 }]);
  }, []);
  const updateCondition = useCallback((index: number, upd: Partial<SimpleCondition>) => {
    setConditionList((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...upd };
        if (upd.factKey != null) {
          const allowedOps = getOperatorsForFact(upd.factKey).map((o) => o.value);
          if (!allowedOps.includes(next.operator)) {
            next.operator = getDefaultOperatorForFact(upd.factKey);
          }
        }
        return next;
      })
    );
  }, []);
  const removeCondition = useCallback((index: number) => {
    setConditionList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAction = useCallback((index: number, upd: Partial<PolicyAction>) => {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...upd } : a)));
  }, []);
  const addAction = useCallback(() => {
    setActions((prev) => [...prev, { type: 'ADD_INCREASE_PERCENT', value: 0 }]);
  }, []);
  const removeAction = useCallback((index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTierRow = useCallback(
    (index: number, field: 'label' | 'minYoe' | 'maxYoe' | 'increasePercent', value: number | string) => {
      setModelConfig((prev) => {
        if (!prev || prev.type !== 'YOE_TIER_TABLE') return prev;
        const tierRows = prev.tierRows ?? [];
        const next = [...tierRows];
        if (!next[index]) return prev;
        next[index] = { ...next[index], [field]: value };
        return { ...prev, tierRows: next };
      });
    },
    []
  );
  const addTierRow = useCallback(() => {
    setModelConfig((prev) => {
      if (!prev || prev.type !== 'YOE_TIER_TABLE') return prev;
      const tierRows = prev.tierRows ?? [];
      const last = tierRows[tierRows.length - 1];
      const maxYoe = last ? last.maxYoe + 1 : 0;
      return {
        ...prev,
        tierRows: [...tierRows, { minYoe: maxYoe, maxYoe: maxYoe + 4, label: '', increasePercent: 3.5 }],
      };
    });
  }, []);
  const removeTierRow = useCallback((index: number) => {
    setModelConfig((prev) => {
      if (!prev || prev.type !== 'YOE_TIER_TABLE') return prev;
      const tierRows = (prev.tierRows ?? []).filter((_, i) => i !== index);
      return { ...prev, tierRows };
    });
  }, []);

  const updateTierBaseRow = useCallback(
    (index: number, field: 'label' | 'minYoe' | 'maxYoe' | 'baseSalary', value: number | string) => {
      setModelConfig((prev) => {
        if (!prev || prev.type !== 'YOE_TIER_BASE_SALARY') return prev;
        const rows = prev.tierBaseSalaryRows ?? [];
        const next = [...rows];
        if (!next[index]) return prev;
        next[index] = { ...next[index], [field]: value };
        return { ...prev, tierBaseSalaryRows: next };
      });
    },
    []
  );
  const addTierBaseRow = useCallback(() => {
    setModelConfig((prev) => {
      if (!prev || prev.type !== 'YOE_TIER_BASE_SALARY') return prev;
      const rows = prev.tierBaseSalaryRows ?? [];
      const last = rows[rows.length - 1];
      const maxYoe = last ? last.maxYoe + 1 : 0;
      return {
        ...prev,
        tierBaseSalaryRows: [...rows, { minYoe: maxYoe, maxYoe: maxYoe + 4, label: '', baseSalary: 0 }],
      };
    });
  }, []);
  const removeTierBaseRow = useCallback((index: number) => {
    setModelConfig((prev) => {
      if (!prev || prev.type !== 'YOE_TIER_BASE_SALARY') return prev;
      const rows = (prev.tierBaseSalaryRows ?? []).filter((_, i) => i !== index);
      return { ...prev, tierBaseSalaryRows: rows };
    });
  }, []);

  const saveValidation = useMemo(() => {
    if (!draftPolicy) return { errors: [] as string[], warnings: [] as string[] };
    const toValidate: AnnualIncreasePolicy = {
      ...draftPolicy,
      id: 'preview',
      key: (draftPolicy.key || `rule-${name || 'new'}`).trim() || 'rule-preview',
      name: name || draftPolicy.name,
    };
    return validatePolicy(toValidate);
  }, [draftPolicy, name]);

  const handleSave = useCallback(() => {
    if (!draftPolicy) return;
    if (saveValidation.errors.length > 0) return;
    const id = newPolicyId();
    const saved: AnnualIncreasePolicy = {
      ...draftPolicy,
      id,
      key: `rule-${id}`,
      name: name || draftPolicy.name,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    policyState.setPolicies((prev) => [...prev, saved]);
    onSaved(saved);
    onClose();
  }, [draftPolicy, name, policyState, onSaved, onClose, saveValidation.errors.length]);

  const step = STEPS[stepIndex];
  useEffect(() => {
    if (step === 'action' && selectedType && actions.length === 0) {
      setActions(selectedType.defaultActions);
    }
  }, [step, selectedType, actions.length]);
  const actionStepValid =
    step !== 'action' ||
    (selectedTypeId !== 'yoe-tier-increase' && selectedTypeId !== 'yoe-tier-base-salary') ||
    (modelConfig &&
      ((modelConfig.type === 'YOE_TIER_TABLE' && (modelConfig.tierRows?.length ?? 0) > 0) ||
        (modelConfig.type === 'YOE_TIER_BASE_SALARY' && (modelConfig.tierBaseSalaryRows?.length ?? 0) > 0)));
  const canNext =
    step === 'type'
      ? selectedTypeId != null
      : step === 'target'
        ? true
        : step === 'conditions'
          ? true
          : step === 'action'
            ? actionStepValid
            : step === 'priority'
              ? true
              : step === 'preview'
                ? true
                : true;
  const canPrev = stepIndex > 0;

  const saveStepValid = (name?.trim() ?? '').length > 0 && draftPolicy != null && saveValidation.errors.length === 0;
  const providerTypeOptions =
    (parameterOptions.providerTypes?.length ?? 0) > 0 ? parameterOptions.providerTypes : DEFAULT_PROVIDER_TYPES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-label="Create policy">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Create Policy</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 p-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="shrink-0 px-6 py-2 flex gap-2 overflow-x-auto border-b border-slate-100">
          {STEPS.map((s, i) => {
            const isTiered = selectedTypeId === 'yoe-tier-increase' || selectedTypeId === 'yoe-tier-base-salary';
            const label = s === 'action' && isTiered ? 'Define tiers' : s.charAt(0).toUpperCase() + s.slice(1);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStepIndex(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${i === stepIndex ? 'bg-indigo-600 text-white' : i < stepIndex ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}
              >
                {i + 1}. {label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {step === 'type' && (
            <>
              <p className="text-sm text-slate-600 mb-4">Choose what type of policy you are creating.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POLICY_TYPE_CARDS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTypeId(t.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${selectedTypeId === t.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="font-semibold text-slate-800">{t.label}</div>
                    <div className="text-sm text-slate-600 mt-1">{t.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'target' && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                {selectedTypeId === 'yoe-tier-increase' || selectedTypeId === 'yoe-tier-base-salary' ? (
                  <>Define <strong>who gets these tiers</strong>: select specialty and/or division. The YOE ranges and salary/increase % are configured in the next step—not here.</>
                ) : (
                  <>Define who this policy applies to. Leave filters empty to apply to all providers.</>
                )}
              </p>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 w-full">
                  <div className={`grid gap-x-6 gap-y-3 ${(selectedTypeId === 'yoe-tier-increase' || selectedTypeId === 'yoe-tier-base-salary') ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-3'}`}>
                    <div className="min-w-0">
                      {parameterOptions.divisions && parameterOptions.divisions.length > 0 ? (
                        <MultiSelectDropdown
                          label="Division"
                          options={parameterOptions.divisions}
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
                          options={parameterOptions.specialties}
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
                        options={providerTypeOptions}
                        selected={targetScope.providerTypes ?? []}
                        onChange={(v) => updateScope('providerTypes', v)}
                        placeholder="All"
                      />
                    </div>
                    {(selectedTypeId !== 'yoe-tier-increase' && selectedTypeId !== 'yoe-tier-base-salary') && (
                      <>
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
                            onChange={(min, max) => setTargetScope((prev) => ({ ...prev, tccPercentileMin: min, tccPercentileMax: max }))}
                            min={0}
                            max={100}
                          />
                        </div>
                        <div className="min-w-0">
                          <RangeInputs
                            label="wRVU %ile"
                            valueMin={targetScope.wrvuPercentileMin}
                            valueMax={targetScope.wrvuPercentileMax}
                            onChange={(min, max) => setTargetScope((prev) => ({ ...prev, wrvuPercentileMin: min, wrvuPercentileMax: max }))}
                            min={0}
                            max={100}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-800 mt-2">This policy applies to {matchingCount} providers.</p>
              </div>
            </>
          )}

          {step === 'conditions' && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                {(selectedTypeId === 'yoe-tier-increase' || selectedTypeId === 'yoe-tier-base-salary') ? (
                  <>For tiered policies, leave conditions empty so the policy applies to all providers in your target scope. Add conditions only if you need extra filters.</>
                ) : (
                  <>Define when this policy triggers. All conditions below are combined with {conditionCombine.toUpperCase()}.</>
                )}
              </p>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setConditionCombine('and')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${conditionCombine === 'and' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => setConditionCombine('or')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${conditionCombine === 'or' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  OR
                </button>
              </div>
              <div className="space-y-3">
                {conditionList.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="min-w-[140px]">
                      <span className="text-xs text-slate-500 block mb-0.5">Field</span>
                      <select
                        value={c.factKey}
                        onChange={(e) => updateCondition(i, { factKey: e.target.value })}
                        className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                      >
                        {CONDITION_FACT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[90px]">
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
                    <div className="min-w-[140px]">
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
                                value:
                                  factType === 'number' ? Number(e.target.value) || 0 : e.target.value,
                              })
                            }
                            className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                            placeholder={factType === 'number' ? 'e.g. 75' : 'e.g. Cardiology'}
                          />
                        );
                      })()}
                    </div>
                    <button type="button" onClick={() => removeCondition(i)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">×</button>
                  </div>
                ))}
                <button type="button" onClick={addCondition} className="text-sm text-indigo-600 hover:underline">+ Add condition</button>
              </div>
              {conditionSentence && <p className="mt-3 text-sm text-slate-700 font-medium">Summary: {conditionSentence}</p>}
              {conditionMatchCount != null && conditionMatchCount.total > 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  Test against current data: matches <strong>{conditionMatchCount.matched}</strong> of <strong>{conditionMatchCount.total}</strong> providers.
                </p>
              )}
            </>
          )}

          {step === 'action' && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                {(selectedTypeId === 'yoe-tier-increase' || selectedTypeId === 'yoe-tier-base-salary') ? (
                  <>Define the tiers: years of experience range → base salary (or increase %). Providers in your target scope are assigned based on their YOE.</>
                ) : (
                  <>Specify what happens when the conditions are met.</>
                )}
              </p>
              {selectedTypeId === 'yoe-tier-increase' && modelConfig && modelConfig.type === 'YOE_TIER_TABLE' && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Tier increase % (YOE range → %)</h3>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="app-settings-table w-full border-collapse table-fixed" style={{ minWidth: 420 }}>
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
                        {(modelConfig.tierRows ?? []).map((row, i) => (
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
              {selectedTypeId === 'yoe-tier-base-salary' && modelConfig && modelConfig.type === 'YOE_TIER_BASE_SALARY' && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Tier base salary (YOE range → $)</h3>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="app-settings-table w-full border-collapse table-fixed" style={{ minWidth: 480 }}>
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
                        {(modelConfig.tierBaseSalaryRows ?? []).map((row, i) => (
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
              {selectedTypeId !== 'yoe-tier-increase' && selectedTypeId !== 'yoe-tier-base-salary' && (
                <>
                  {selectedType && (
                    <p className="text-xs text-slate-500 mb-2">Default for {selectedType.label}: {selectedType.defaultActions.map((a) => ACTION_LABELS[a.type] ?? a.type).join(', ')}</p>
                  )}
                  <div className="space-y-2">
                    {(actions.length > 0 ? actions : selectedType?.defaultActions ?? []).map((a, i) => (
                      <div key={i} className="flex gap-2 items-center border border-slate-200 rounded-lg p-2 bg-white">
                        <select
                          value={a.type}
                          onChange={(e) => (actions.length ? updateAction(i, { type: e.target.value as PolicyAction['type'] }) : setActions([{ ...a, type: e.target.value as PolicyAction['type'] }]))}
                          className="flex-1 text-sm border border-slate-300 rounded px-2 py-1.5 bg-white"
                        >
                          {Object.entries(ACTION_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        {['ADD_INCREASE_PERCENT', 'CAP_INCREASE_PERCENT', 'FLOOR_INCREASE_PERCENT', 'SET_BASE_INCREASE_PERCENT', 'FORCE_INCREASE_PERCENT'].includes(a.type) && (
                          <input
                            type="number"
                            value={a.value ?? 0}
                            onChange={(e) => (actions.length ? updateAction(i, { value: Number(e.target.value) }) : setActions([{ ...a, value: Number(e.target.value) }]))}
                            className="w-20 text-sm border border-slate-300 rounded px-2 py-1.5 text-right bg-white"
                            step={0.1}
                          />
                        )}
                        {actions.length > 0 && <button type="button" onClick={() => removeAction(i)} className="p-1 text-slate-400 hover:text-red-600">×</button>}
                      </div>
                    ))}
                    <button type="button" onClick={addAction} className="text-sm text-indigo-600 hover:underline">+ Add action</button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 'priority' && (
            <>
              <p className="text-sm text-slate-600 mb-4">Set how this policy interacts with others. Lower priority number runs first.</p>
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPriorityOption(opt.value);
                      setIsFallback(opt.isFallback);
                    }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${priorityOption === opt.value ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="font-medium text-slate-800">{opt.label}</div>
                    <div className="text-sm text-slate-600 mt-0.5">{opt.sentence}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <p className="text-sm text-slate-600 mb-4">Preview how this policy will change recommended increases.</p>
              <p className="font-medium text-slate-800 mb-2">Affected providers: {previewImpact.affected}</p>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="app-settings-table min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th className="text-right">Before</th>
                      <th className="text-right">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewImpact.changes.slice(0, 20).map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-800">{c.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.from.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.to.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewImpact.changes.length > 20 && <p className="px-3 py-2 text-xs text-slate-500">… and {previewImpact.changes.length - 20} more</p>}
              </div>
            </>
          )}

          {step === 'save' && (
            <>
              <p className="text-sm text-slate-600 mb-4">Name your policy and save.</p>
              {saveValidation.errors.length > 0 && (
                <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
                  <p className="font-medium mb-1">Please fix the following before saving:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {saveValidation.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {saveValidation.warnings.length > 0 && saveValidation.errors.length === 0 && (
                <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-800 text-sm">
                  <p className="font-medium mb-1">Warnings:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {saveValidation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="policy-wizard-save-name" className="block text-xs font-medium text-slate-600 mb-1">
                      Policy name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="policy-wizard-save-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg ${!(name?.trim()) ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300'}`}
                      placeholder="e.g. High Market Guardrail"
                      aria-invalid={!(name?.trim())}
                      aria-describedby={!(name?.trim()) ? 'save-name-required' : undefined}
                    />
                    {!(name?.trim()) && (
                      <p id="save-name-required" className="mt-1 text-xs text-amber-700">Policy name is required to save.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="policy-wizard-save-description" className="block text-xs font-medium text-slate-600 mb-1">
                      Description (optional)
                    </label>
                    <input
                      id="policy-wizard-save-description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="Brief description"
                    />
                  </div>
                </div>
                {draftPolicy && (
                  <div className="text-sm text-slate-600 pt-2">
                    <p><strong>Type:</strong> {draftPolicy.policyType}</p>
                    <p><strong>Stage:</strong> {POLICY_STAGE_LABELS[draftPolicy.stage]}</p>
                    <p><strong>Applies to:</strong> {matchingCount} providers</p>
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
              disabled={!saveStepValid}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              Save policy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
