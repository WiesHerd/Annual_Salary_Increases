import { loadXlsx } from './xlsx-loader';
import type { PolicyEvaluationResult } from '../types/compensation-policy';
import type { ProviderRecord } from '../types/provider';
import {
  computeGovernanceMetrics,
  filterGovernanceRecords,
  isFmvRelated,
  isManualReviewRequired,
  isPolicyBlocked,
} from './governance-metrics';

function governanceRow(
  record: ProviderRecord,
  evaluation?: PolicyEvaluationResult
): Record<string, string | number> {
  const flags: string[] = [];
  if (isManualReviewRequired(record, evaluation)) flags.push('Manual review');
  if (isFmvRelated(record, evaluation)) flags.push('FMV');
  if (isPolicyBlocked(record, evaluation)) flags.push('Blocked');

  return {
    Employee_ID: record.Employee_ID,
    Provider_Name: record.Provider_Name ?? '',
    Specialty: record.Specialty ?? '',
    Division: record.Primary_Division ?? '',
    Current_Base_Salary: record.Current_Base_Salary ?? '',
    Proposed_Base_Salary: record.Proposed_Base_Salary ?? '',
    Approved_Increase_Percent: record.Approved_Increase_Percent ?? '',
    Current_TCC_Percentile: record.Current_TCC_Percentile ?? '',
    Proposed_TCC_Percentile: record.Proposed_TCC_Percentile ?? '',
    Policy_Source: record.Policy_Source_Name ?? evaluation?.finalPolicySource ?? '',
    Policy_Outcome: isPolicyBlocked(record, evaluation)
      ? 'Blocked'
      : evaluation || record.Policy_Applied
        ? 'Applied'
        : '',
    Governance_Flags: flags.join(', '),
    Policy_Summary: record.Policy_Explanation_Summary ?? evaluation?.explanation?.slice(0, 2).join('; ') ?? '',
    Review_Status: record.Review_Status ?? '',
  };
}

/** Committee-oriented export: summary sheet + governance detail sheet. */
export async function exportGovernanceCommitteeXlsx(
  records: ProviderRecord[],
  evaluationResults: Map<string, PolicyEvaluationResult>,
  cycleLabel?: string
): Promise<ArrayBuffer> {
  const XLSX = await loadXlsx();
  const metrics = computeGovernanceMetrics(records, evaluationResults);
  const governanceRecords = filterGovernanceRecords(records, evaluationResults);

  const summaryRows = [
    { Metric: 'Merit cycle', Value: cycleLabel ?? 'Current view' },
    { Metric: 'Providers in scope', Value: metrics.total },
    { Metric: 'Manual review required', Value: metrics.manualReview },
    { Metric: 'FMV-related policies', Value: metrics.fmvRelated },
    { Metric: 'Blocked by policy', Value: metrics.blocked },
    { Metric: 'Exported at', Value: new Date().toISOString() },
  ];

  const detailRows = governanceRecords.map((record) =>
    governanceRow(record, evaluationResults.get(record.Employee_ID))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(detailRows.length > 0 ? detailRows : [{ Note: 'No governance flags in this scope' }]),
    'Governance'
  );

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
