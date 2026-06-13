import type { GovernanceFlagKind } from '../components/governance-flag';
import type { PolicyEvaluationResult } from '../types/compensation-policy';
import type { ProviderRecord } from '../types/provider';

export interface GovernanceMetrics {
  total: number;
  manualReview: number;
  blocked: number;
  fmvRelated: number;
}

export function isManualReviewRequired(
  record: ProviderRecord,
  evaluation?: PolicyEvaluationResult
): boolean {
  return Boolean(record.Manual_Review_Flag ?? evaluation?.manualReview);
}

export function isPolicyBlocked(
  record: ProviderRecord,
  evaluation?: PolicyEvaluationResult
): boolean {
  return Boolean(evaluation?.blocked || record.Policy_Logic_Status === 'Blocked');
}

export function isFmvRelated(
  record: ProviderRecord,
  evaluation?: PolicyEvaluationResult
): boolean {
  const haystack = [
    record.Policy_Source_Name,
    record.Policy_Explanation_Summary,
    record.Policy_Labels,
    record.Policy_Reason_Codes,
    evaluation?.finalPolicySource,
    ...(evaluation?.explanation ?? []),
    ...(evaluation?.policyLabels ?? []),
    ...(evaluation?.reasonCodes ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes('fmv') || haystack.includes('fair market');
}

export function computeGovernanceMetrics(
  records: ProviderRecord[],
  evaluationResults: Map<string, PolicyEvaluationResult>
): GovernanceMetrics {
  let manualReview = 0;
  let blocked = 0;
  let fmvRelated = 0;

  for (const record of records) {
    const evaluation = evaluationResults.get(record.Employee_ID);
    if (isManualReviewRequired(record, evaluation)) manualReview += 1;
    if (isPolicyBlocked(record, evaluation)) blocked += 1;
    if (isFmvRelated(record, evaluation)) fmvRelated += 1;
  }

  return { total: records.length, manualReview, blocked, fmvRelated };
}

export function getGovernanceFlagKinds(
  record: ProviderRecord,
  evaluation?: PolicyEvaluationResult
): GovernanceFlagKind[] {
  const flags: GovernanceFlagKind[] = [];
  if (isManualReviewRequired(record, evaluation)) flags.push('manual-review');
  if (isFmvRelated(record, evaluation)) flags.push('fmv');
  if (isPolicyBlocked(record, evaluation)) flags.push('blocked');
  return flags;
}

export function filterGovernanceRecords(
  records: ProviderRecord[],
  evaluationResults: Map<string, PolicyEvaluationResult>
): ProviderRecord[] {
  return records.filter((record) => {
    const evaluation = evaluationResults.get(record.Employee_ID);
    return (
      isManualReviewRequired(record, evaluation) ||
      isPolicyBlocked(record, evaluation) ||
      isFmvRelated(record, evaluation)
    );
  });
}
