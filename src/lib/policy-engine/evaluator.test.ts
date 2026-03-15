/**
 * Unit tests for policy engine evaluator, stages, targeting, conditions, matrix and custom model resolvers.
 */

import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../../types/provider';
import type { AnnualIncreasePolicy, CustomCompensationModel } from '../../types/compensation-policy';
import type { MeritMatrixRow } from '../../types/merit-matrix-row';
import { buildFactsFromRecord } from './facts';
import { matchesTargetScope } from './targeting';
import { evaluateConditions } from './conditions';
import { getStageOrder, sortPoliciesByStageAndPriority } from './stages';
import { resolveGeneralMatrixIncrease } from './matrix-resolver';
import { resolveCustomModel } from './custom-model-resolver';
import { evaluatePolicyForProvider } from './evaluator';
import type { PolicyEvaluationContext } from './evaluator';

const baseRecord: ProviderRecord = {
  Employee_ID: 'E001',
  Provider_Name: 'Test Provider',
  Primary_Division: 'PCP',
  Specialty: 'General Pediatrics',
  Provider_Type: 'Physician',
  Population: 'Physician',
  Years_of_Experience: 6,
  Evaluation_Score: 4,
  Performance_Category: 'Meets',
  Current_Base_Salary: 200_000,
  Current_TCC_Percentile: 55,
  WRVU_Percentile: 62,
};

const meritMatrix: MeritMatrixRow[] = [
  { id: '1', evaluationScore: 5, performanceLabel: 'Exceeds', defaultIncreasePercent: 5, notes: '' },
  { id: '2', evaluationScore: 4, performanceLabel: 'Meets', defaultIncreasePercent: 4, notes: '' },
  { id: '3', evaluationScore: 3, performanceLabel: 'Below', defaultIncreasePercent: 2, notes: '' },
];

describe('policy-engine facts', () => {
  it('builds facts from record', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(facts.employeeId).toBe('E001');
    expect(facts.division).toBe('PCP');
    expect(facts.specialty).toBe('General Pediatrics');
    expect(facts.yoe).toBe(6);
    expect(facts.evaluationScore).toBe(4);
    expect(facts.performanceCategory).toBe('Meets');
    expect(facts.tccPercentile).toBe(55);
    expect(facts.wrvuPercentile).toBe(62);
  });
});

describe('policy-engine targeting', () => {
  it('matches empty scope (all)', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(matchesTargetScope({}, facts)).toBe(true);
  });

  it('matches scope by division', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(matchesTargetScope({ divisions: ['PCP'] }, facts)).toBe(true);
    expect(matchesTargetScope({ divisions: ['Other'] }, facts)).toBe(false);
  });

  it('excludes when in excludedProviderIds', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(matchesTargetScope({ excludedProviderIds: ['E001'] }, facts)).toBe(false);
  });

  it('matches when in providerIds', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(matchesTargetScope({ providerIds: ['E001'] }, facts)).toBe(true);
    expect(matchesTargetScope({ providerIds: ['E002'] }, facts)).toBe(false);
  });
});

describe('policy-engine conditions', () => {
  it('evaluates empty conditions as true', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(evaluateConditions(undefined, facts)).toBe(true);
    expect(evaluateConditions({}, facts)).toBe(true);
  });

  it('evaluates simple greater-than', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(evaluateConditions({ '>': [{ var: 'tccPercentile' }, 75] }, facts)).toBe(false);
    expect(evaluateConditions({ '>': [{ var: 'wrvuPercentile' }, 60] }, facts)).toBe(true);
  });

  it('evaluates and', () => {
    const facts = buildFactsFromRecord(baseRecord);
    const rule = { and: [{ '>': [{ var: 'yoe' }, 2] }, { '<': [{ var: 'yoe' }, 10] }] };
    expect(evaluateConditions(rule, facts)).toBe(true);
  });

  it('evaluates in operator', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(evaluateConditions({ in: [{ var: 'performanceCategory' }, ['Exceeds', 'Outstanding']] }, facts)).toBe(false);
    expect(evaluateConditions({ in: [{ var: 'performanceCategory' }, ['Meets', 'Exceeds']] }, facts)).toBe(true);
    expect(evaluateConditions({ in: [{ var: 'evaluationScore' }, [3, 4, 5]] }, facts)).toBe(true);
  });
});

describe('policy-engine stages', () => {
  it('returns correct stage order', () => {
    expect(getStageOrder('EXCLUSION_GUARDRAIL')).toBe(0);
    expect(getStageOrder('CUSTOM_MODEL')).toBe(1);
    expect(getStageOrder('CAP_FLOOR')).toBe(4);
  });

  it('sorts policies by stage then priority', () => {
    const policies: { stage: AnnualIncreasePolicy['stage']; priority: number; id: string }[] = [
      { id: 'a', stage: 'CAP_FLOOR', priority: 10 },
      { id: 'b', stage: 'EXCLUSION_GUARDRAIL', priority: 5 },
      { id: 'c', stage: 'EXCLUSION_GUARDRAIL', priority: 10 },
    ];
    const sorted = sortPoliciesByStageAndPriority(policies);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });
});

describe('policy-engine matrix-resolver', () => {
  it('resolves increase from merit matrix by score and category', () => {
    const facts = buildFactsFromRecord(baseRecord);
    const result = resolveGeneralMatrixIncrease(meritMatrix, facts);
    expect(result).toBeDefined();
    expect(result?.defaultIncreasePercent).toBe(4);
  });

  it('returns undefined when no match', () => {
    const facts = buildFactsFromRecord({ ...baseRecord, Evaluation_Score: 99, Performance_Category: 'Unknown' });
    const result = resolveGeneralMatrixIncrease(meritMatrix, facts);
    expect(result).toBeUndefined();
  });
});

describe('policy-engine custom-model-resolver', () => {
  const model: CustomCompensationModel = {
    id: 'm1',
    key: 'pcp-peds',
    name: 'PCP Peds YOE',
    type: 'YOE_TIER_TABLE',
    status: 'active',
    targetScope: { divisions: ['PCP'], specialties: ['General Pediatrics'] },
    tierRows: [
      { minYoe: 0, maxYoe: 2, label: 'Tier 1', increasePercent: 3.5 },
      { minYoe: 2.01, maxYoe: 5, label: 'Tier 2', increasePercent: 4 },
      { minYoe: 5.01, maxYoe: 999, label: 'Tier 3', increasePercent: 4.25 },
    ],
  };

  it('resolves tier and percent by YOE', () => {
    const facts = buildFactsFromRecord(baseRecord);
    const result = resolveCustomModel(model, facts, []);
    expect(result).toBeDefined();
    expect(result?.increasePercent).toBe(4.25);
    expect(result?.tierLabel).toBe('Tier 3');
  });

  it('returns undefined when scope does not match', () => {
    const facts = buildFactsFromRecord({ ...baseRecord, Primary_Division: 'Other' });
    const result = resolveCustomModel(model, facts, []);
    expect(result).toBeUndefined();
  });

  it('resolves YOE_TIER_BASE_SALARY with fixed base salary by tier', () => {
    const baseSalaryModel: CustomCompensationModel = {
      id: 'm2',
      key: 'pcp-base',
      name: 'PCP Base Salary Tier',
      type: 'YOE_TIER_BASE_SALARY',
      status: 'active',
      targetScope: { divisions: ['Primary Care'] },
      tierBaseSalaryRows: [
        { minYoe: 0, maxYoe: 4, label: '0–4 YOE', baseSalary: 175000 },
        { minYoe: 4.01, maxYoe: 8, label: '4–8 YOE', baseSalary: 190000 },
        { minYoe: 8.01, maxYoe: 999, label: '8+ YOE', baseSalary: 200000 },
      ],
    };
    const facts3 = buildFactsFromRecord({ ...baseRecord, Years_of_Experience: 3, Primary_Division: 'Primary Care' });
    const result3 = resolveCustomModel(baseSalaryModel, facts3, []);
    expect(result3?.baseSalary).toBe(175000);
    expect(result3?.tierLabel).toBe('0–4 YOE');
    expect(result3?.increasePercent).toBe(0);

    const facts6 = buildFactsFromRecord({ ...baseRecord, Years_of_Experience: 6, Primary_Division: 'Primary Care' });
    const result6 = resolveCustomModel(baseSalaryModel, facts6, []);
    expect(result6?.baseSalary).toBe(190000);
    expect(result6?.tierLabel).toBe('4–8 YOE');

    const facts10 = buildFactsFromRecord({ ...baseRecord, Years_of_Experience: 10, Primary_Division: 'Primary Care' });
    const result10 = resolveCustomModel(baseSalaryModel, facts10, []);
    expect(result10?.baseSalary).toBe(200000);
    expect(result10?.tierLabel).toBe('8+ YOE');
  });
});

describe('policy-engine evaluator', () => {
  const context: PolicyEvaluationContext = {
    policies: [
      {
        id: 'g1',
        key: 'guard',
        name: 'TCC > 75 guardrail',
        status: 'active',
        stage: 'EXCLUSION_GUARDRAIL',
        policyType: 'Guardrail',
        priority: 10,
        targetScope: {},
        conditions: { '>': [{ var: 'tccPercentile' }, 75] },
        actions: [{ type: 'ZERO_OUT_INCREASE' }, { type: 'FLAG_MANUAL_REVIEW', metadata: 'TCC above 75th' }],
        conflictStrategy: 'FORCE_RESULT',
        stopProcessing: true,
      } as AnnualIncreasePolicy,
      {
        id: 'm1',
        key: 'mod',
        name: 'wRVU modifier',
        status: 'active',
        stage: 'MODIFIER',
        policyType: 'Modifier',
        priority: 10,
        targetScope: {},
        conditions: { '>': [{ var: 'wrvuPercentile' }, 60] },
        actions: [{ type: 'ADD_INCREASE_PERCENT', value: 1 }],
        conflictStrategy: 'ADDITIVE_MODIFIER',
      } as AnnualIncreasePolicy,
      {
        id: 'c1',
        key: 'cap',
        name: 'Cap 6%',
        status: 'active',
        stage: 'CAP_FLOOR',
        policyType: 'Cap',
        priority: 10,
        targetScope: {},
        actions: [{ type: 'CAP_INCREASE_PERCENT', value: 6 }],
        conflictStrategy: 'CAP_RESULT',
      } as AnnualIncreasePolicy,
    ],
    customModels: [],
    tierTables: [],
    meritMatrixRows: meritMatrix,
  };

  it('applies general matrix when no guardrail or custom model', () => {
    const result = evaluatePolicyForProvider(baseRecord, context);
    expect(result.finalRecommendedIncreasePercent).toBe(5);
    expect(result.finalPolicySource).toBeDefined();
    expect(result.manualReview).toBe(false);
  });

  it('applies guardrail when TCC > 75 and zeros out', () => {
    const highTcc = { ...baseRecord, Current_TCC_Percentile: 80 };
    const result = evaluatePolicyForProvider(highTcc, context);
    expect(result.finalRecommendedIncreasePercent).toBe(0);
    expect(result.manualReview).toBe(true);
  });

  it('applies modifier then cap', () => {
    const result = evaluatePolicyForProvider(baseRecord, context);
    expect(result.finalRecommendedIncreasePercent).toBeLessThanOrEqual(6);
  });
});

describe('policy-engine scenarios', () => {
  it('Default Merit Matrix: no policies, matrix result by score', () => {
    const ctx: PolicyEvaluationContext = {
      policies: [],
      customModels: [],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const result = evaluatePolicyForProvider(baseRecord, ctx);
    expect(result.finalRecommendedIncreasePercent).toBe(4);
    expect(result.finalPolicySource).toMatch(/merit|matrix/i);
  });

  it('PCP Custom Model: custom model targeting PCP applies', () => {
    const model: CustomCompensationModel = {
      id: 'm1',
      key: 'pcp',
      name: 'PCP Model',
      type: 'YOE_TIER_TABLE',
      status: 'active',
      targetScope: { divisions: ['PCP'] },
      tierRows: [
        { minYoe: 0, maxYoe: 5, label: 'Early', increasePercent: 3 },
        { minYoe: 5.01, maxYoe: 999, label: 'Senior', increasePercent: 4.5 },
      ],
    };
    const ctx: PolicyEvaluationContext = {
      policies: [],
      customModels: [model],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const result = evaluatePolicyForProvider(baseRecord, ctx);
    expect(result.finalRecommendedIncreasePercent).toBe(4.5);
    expect(result.finalPolicySource).toBe('PCP Model');
    expect(result.tierAssigned).toBe('Senior');
  });

  it('wRVU Modifier: adds 0.5% when wRVU > 60', () => {
    const modifier: AnnualIncreasePolicy = {
      id: 'w1',
      key: 'wrvu',
      name: 'wRVU modifier',
      status: 'active',
      stage: 'MODIFIER',
      policyType: 'Modifier',
      priority: 10,
      targetScope: {},
      conditions: { '>': [{ var: 'wrvuPercentile' }, 60] },
      actions: [{ type: 'ADD_INCREASE_PERCENT', value: 0.5 }],
      conflictStrategy: 'ADDITIVE_MODIFIER',
    };
    const ctx: PolicyEvaluationContext = {
      policies: [modifier],
      customModels: [],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const result = evaluatePolicyForProvider(baseRecord, ctx);
    expect(result.finalRecommendedIncreasePercent).toBe(4.5);
  });

  it('TCC Guardrail: TCC > 75 forces 0%', () => {
    const guardrail: AnnualIncreasePolicy = {
      id: 't1',
      key: 'tcc',
      name: 'High Market Guardrail',
      status: 'active',
      stage: 'EXCLUSION_GUARDRAIL',
      policyType: 'Guardrail',
      priority: 10,
      targetScope: {},
      conditions: { '>': [{ var: 'tccPercentile' }, 75] },
      actions: [{ type: 'ZERO_OUT_INCREASE' }],
      conflictStrategy: 'FORCE_RESULT',
      stopProcessing: true,
    };
    const ctx: PolicyEvaluationContext = {
      policies: [guardrail],
      customModels: [],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const highTcc = { ...baseRecord, Current_TCC_Percentile: 78 };
    const result = evaluatePolicyForProvider(highTcc, ctx);
    expect(result.finalRecommendedIncreasePercent).toBe(0);
    expect(result.appliedPolicies.some((p) => p.name === 'High Market Guardrail')).toBe(true);
  });

  it('Selected Provider Override: providerIds force 3%', () => {
    const override: AnnualIncreasePolicy = {
      id: 'o1',
      key: 'override',
      name: 'Selected override',
      status: 'active',
      stage: 'EXCLUSION_GUARDRAIL',
      policyType: 'Override',
      priority: 0,
      targetScope: { providerIds: ['E001'] },
      actions: [{ type: 'FORCE_INCREASE_PERCENT', value: 3 }],
      conflictStrategy: 'FORCE_RESULT',
      stopProcessing: true,
    };
    const ctx: PolicyEvaluationContext = {
      policies: [override],
      customModels: [],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const result = evaluatePolicyForProvider(baseRecord, ctx);
    expect(result.finalRecommendedIncreasePercent).toBe(3);
    const other = { ...baseRecord, Employee_ID: 'E002' };
    const otherResult = evaluatePolicyForProvider(other, ctx);
    expect(otherResult.finalRecommendedIncreasePercent).toBe(4);
  });

  it('Manual Review Trigger: FLAG_MANUAL_REVIEW sets manualReview', () => {
    const manual: AnnualIncreasePolicy = {
      id: 'r1',
      key: 'review',
      name: 'Manual review rule',
      status: 'active',
      stage: 'EXCLUSION_GUARDRAIL',
      policyType: 'Manual Review',
      priority: 10,
      targetScope: {},
      conditions: { '>': [{ var: 'tccPercentile' }, 70] },
      actions: [{ type: 'FLAG_MANUAL_REVIEW', metadata: 'High TCC' }],
      conflictStrategy: 'ANNOTATE_ONLY',
    };
    const ctx: PolicyEvaluationContext = {
      policies: [manual],
      customModels: [],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const highTcc = { ...baseRecord, Current_TCC_Percentile: 72 };
    const result = evaluatePolicyForProvider(highTcc, ctx);
    expect(result.manualReview).toBe(true);
    expect(result.explanation.some((e) => e.includes('manual review'))).toBe(true);
  });

  it('Precedence: guardrail overrides modifier and matrix', () => {
    const guardrail: AnnualIncreasePolicy = {
      id: 'g1',
      key: 'g',
      name: 'TCC Guardrail',
      status: 'active',
      stage: 'EXCLUSION_GUARDRAIL',
      policyType: 'Guardrail',
      priority: 0,
      targetScope: {},
      conditions: { '>': [{ var: 'tccPercentile' }, 75] },
      actions: [{ type: 'ZERO_OUT_INCREASE' }],
      conflictStrategy: 'FORCE_RESULT',
      stopProcessing: true,
    };
    const modifier: AnnualIncreasePolicy = {
      id: 'm1',
      key: 'm',
      name: 'wRVU Modifier',
      status: 'active',
      stage: 'MODIFIER',
      policyType: 'Modifier',
      priority: 10,
      targetScope: {},
      conditions: { '>': [{ var: 'wrvuPercentile' }, 50] },
      actions: [{ type: 'ADD_INCREASE_PERCENT', value: 1 }],
      conflictStrategy: 'ADDITIVE_MODIFIER',
    };
    const ctx: PolicyEvaluationContext = {
      policies: [guardrail, modifier],
      customModels: [],
      tierTables: [],
      meritMatrixRows: meritMatrix,
    };
    const highTcc = { ...baseRecord, Current_TCC_Percentile: 80, WRVU_Percentile: 60 };
    const result = evaluatePolicyForProvider(highTcc, ctx);
    expect(result.finalRecommendedIncreasePercent).toBe(0);
    expect(result.appliedPolicies.some((p) => p.name === 'TCC Guardrail')).toBe(true);
  });
});

describe('policy-engine targeting ranges', () => {
  it('respects yoeMin and yoeMax in scope', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(matchesTargetScope({ yoeMin: 0, yoeMax: 10 }, facts)).toBe(true);
    expect(matchesTargetScope({ yoeMin: 10, yoeMax: 20 }, facts)).toBe(false);
    expect(matchesTargetScope({ yoeMin: 5, yoeMax: 7 }, facts)).toBe(true);
  });

  it('respects tccPercentileMin and tccPercentileMax in scope', () => {
    const facts = buildFactsFromRecord(baseRecord);
    expect(matchesTargetScope({ tccPercentileMin: 50, tccPercentileMax: 60 }, facts)).toBe(true);
    expect(matchesTargetScope({ tccPercentileMin: 70, tccPercentileMax: 90 }, facts)).toBe(false);
  });
});
