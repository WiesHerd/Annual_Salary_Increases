/**
 * Export Compare Scenarios results to XLSX (wide format: both scenarios per row).
 */

import * as XLSX from 'xlsx';
import type { ProviderRecord } from '../types/provider';
import type { ScenarioRunResult } from '../types/scenario';

export function exportCompareScenariosToXlsx(
  records: ProviderRecord[],
  resultA: ScenarioRunResult,
  resultB: ScenarioRunResult
): ArrayBuffer {
  const rows = records.map((r) => {
    const evalA = resultA.evaluationResults.get(r.Employee_ID);
    const evalB = resultB.evaluationResults.get(r.Employee_ID);
    const derivedA = resultA.derivedResults.get(r.Employee_ID);
    const derivedB = resultB.derivedResults.get(r.Employee_ID);
    const pctA = evalA?.finalRecommendedIncreasePercent;
    const pctB = evalB?.finalRecommendedIncreasePercent;
    const dollarA = derivedA?.increaseDollars;
    const dollarB = derivedB?.increaseDollars;
    const proposedBaseA = derivedA?.proposedBase;
    const proposedBaseB = derivedB?.proposedBase;
    const deltaPct = pctA != null && pctB != null ? pctB - pctA : '';
    const deltaDollars = dollarA != null && dollarB != null ? dollarB - dollarA : '';
    return {
      Employee_ID: r.Employee_ID,
      Provider_Name: r.Provider_Name ?? '',
      Specialty: r.Specialty ?? '',
      Division: r.Primary_Division ?? '',
      Population: r.Population ?? '',
      'Scenario_A_Increase_Pct': pctA ?? '',
      'Scenario_A_Increase_Dollars': dollarA ?? '',
      'Scenario_A_Proposed_Base': proposedBaseA ?? '',
      'Scenario_A_Policy_Source': evalA?.finalPolicySource ?? '',
      'Scenario_B_Increase_Pct': pctB ?? '',
      'Scenario_B_Increase_Dollars': dollarB ?? '',
      'Scenario_B_Proposed_Base': proposedBaseB ?? '',
      'Scenario_B_Policy_Source': evalB?.finalPolicySource ?? '',
      Delta_Pct: deltaPct,
      Delta_Dollars: deltaDollars,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Compare Scenarios');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
