/**
 * Preview how a policy affects providers (in-scope count + recommendation changes).
 */

import type { ProviderRecord } from '../types/provider';
import type { AnnualIncreasePolicy } from '../types/compensation-policy';
import type { MarketResolver } from '../types/market-survey-config';
import { buildFactsFromRecord } from './policy-engine/facts';
import { matchesTargetScope } from './policy-engine/targeting';
import { evaluatePolicyForProvider, type PolicyEvaluationContext } from './policy-engine/evaluator';

export interface PolicyImpactChange {
  name: string;
  employeeId: string;
  from: number;
  to: number;
}

export interface PolicyImpactPreview {
  inScope: number;
  affected: number;
  changes: PolicyImpactChange[];
  hasData: boolean;
}

function marketRowForRecord(record: ProviderRecord, marketResolver: MarketResolver) {
  const key = (record.Market_Specialty_Override ?? record.Specialty ?? record.Benchmark_Group ?? '').trim();
  return key ? marketResolver(record, key) : undefined;
}

function policiesWithPreviewPolicy(
  baseContext: Omit<PolicyEvaluationContext, 'marketRow'>,
  policy: AnnualIncreasePolicy,
  mode: 'add' | 'replace'
): AnnualIncreasePolicy[] {
  const active = baseContext.policies.filter((p) => p.status === 'active');
  const previewPolicy = { ...policy, status: 'active' as const };

  if (mode === 'add') {
    const withoutDraft = active.filter((p) => p.id !== policy.id && p.id !== 'draft-preview');
    return [...withoutDraft, { ...previewPolicy, id: policy.id || 'draft-preview' }];
  }

  const without = active.filter((p) => p.id !== policy.id);
  return [...without, previewPolicy];
}

export function computePolicyImpactPreview(
  policy: AnnualIncreasePolicy,
  records: ProviderRecord[],
  baseContext: Omit<PolicyEvaluationContext, 'marketRow'>,
  marketResolver: MarketResolver,
  mode: 'add' | 'replace' = 'replace'
): PolicyImpactPreview {
  if (!records.length) {
    return { inScope: 0, affected: 0, changes: [], hasData: false };
  }

  const withoutPolicy = {
    ...baseContext,
    policies: baseContext.policies.filter((p) => p.status === 'active' && p.id !== policy.id),
  };
  const withPolicy = {
    ...baseContext,
    policies: policiesWithPreviewPolicy(baseContext, policy, mode),
  };

  let inScope = 0;
  const changes: PolicyImpactChange[] = [];

  for (const record of records) {
    const marketRow = marketRowForRecord(record, marketResolver);
    const facts = buildFactsFromRecord(record, { marketRow });
    if (matchesTargetScope(policy.targetScope, facts)) inScope++;

    const before = evaluatePolicyForProvider(record, { ...withoutPolicy, marketRow });
    const after = evaluatePolicyForProvider(record, { ...withPolicy, marketRow });
    const beforePct =
      before.recommendedIncreaseDollars != null && (record.Current_Base_Salary ?? 0) > 0
        ? (before.recommendedIncreaseDollars / (record.Current_Base_Salary ?? 1)) * 100
        : before.finalRecommendedIncreasePercent;
    const afterPct =
      after.recommendedIncreaseDollars != null && (record.Current_Base_Salary ?? 0) > 0
        ? (after.recommendedIncreaseDollars / (record.Current_Base_Salary ?? 1)) * 100
        : after.finalRecommendedIncreasePercent;
    if (
      before.finalRecommendedIncreasePercent !== after.finalRecommendedIncreasePercent ||
      before.recommendedIncreaseDollars !== after.recommendedIncreaseDollars
    ) {
      changes.push({
        name: record.Provider_Name ?? record.Employee_ID,
        employeeId: record.Employee_ID,
        from: beforePct,
        to: afterPct,
      });
    }
  }

  return { inScope, affected: changes.length, changes, hasData: true };
}
