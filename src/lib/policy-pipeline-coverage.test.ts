import { describe, it, expect } from 'vitest';
import { computePolicyPipelineCoverage, policyPipelineSuggestedGapCount } from './policy-pipeline-coverage';
import type { AnnualIncreasePolicy } from '../types/compensation-policy';

function policy(stage: AnnualIncreasePolicy['stage'], status: AnnualIncreasePolicy['status'] = 'active'): AnnualIncreasePolicy {
  return {
    id: `p-${stage}`,
    key: `k-${stage}`,
    name: stage,
    status,
    stage,
    policyType: 'Test',
    priority: 50,
    targetScope: {},
    actions: [],
    conflictStrategy: 'ADDITIVE_MODIFIER',
  };
}

describe('computePolicyPipelineCoverage', () => {
  it('counts active policies per stage and flags recommended gaps', () => {
    const items = computePolicyPipelineCoverage([
      policy('EXCLUSION_GUARDRAIL'),
      policy('CUSTOM_MODEL'),
      policy('MODIFIER'),
      policy('MODIFIER'),
    ]);
    expect(items.find((i) => i.stage === 'MODIFIER')?.activeCount).toBe(2);
    expect(items.find((i) => i.stage === 'GENERAL_MATRIX')?.suggestedGap).toBe(true);
    expect(items.find((i) => i.stage === 'CAP_FLOOR')?.suggestedGap).toBe(true);
    expect(policyPipelineSuggestedGapCount(items)).toBe(2);
  });

  it('ignores inactive policies', () => {
    const items = computePolicyPipelineCoverage([policy('CAP_FLOOR', 'inactive')]);
    expect(items.find((i) => i.stage === 'CAP_FLOOR')?.activeCount).toBe(0);
  });
});
