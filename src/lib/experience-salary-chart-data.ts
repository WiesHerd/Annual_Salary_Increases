/**
 * Experience vs. salary (at 1 FTE) chart data.
 * Pure data + grouping for the BI trend chart; no UI.
 */

import type { ProviderRecord } from '../types/provider';

export type ExperienceSalaryGroupBy = 'population' | 'specialty' | 'division' | 'none';

export interface ExperienceSalaryPoint {
  yoe: number;
  salaryAt1Fte: number;
  employeeId: string;
  providerName?: string;
  groupLabel?: string;
}

export interface ExperienceSalarySeries {
  name: string;
  points: ExperienceSalaryPoint[];
}

export interface ExperienceSalaryChartData {
  series: ExperienceSalarySeries[];
  /** Flat list of all valid points (e.g. for single-series or tooltips). */
  allPoints: ExperienceSalaryPoint[];
}

function getYoe(record: ProviderRecord): number | undefined {
  const yoe = record.Years_of_Experience ?? record.Total_YOE;
  return yoe != null && Number.isFinite(yoe) ? yoe : undefined;
}

/**
 * Base salary normalized to 1.0 FTE for trend comparison.
 * Prefer proposed; fallback to current when proposed is missing.
 */
function getSalaryAt1Fte(record: ProviderRecord): number | undefined {
  const fte = record.Current_FTE ?? 1;
  if (fte <= 0 || !Number.isFinite(fte)) return undefined;

  const proposedStored = record.Proposed_Salary_at_1FTE;
  if (proposedStored != null && Number.isFinite(proposedStored)) return proposedStored;

  const proposedRaw = record.Proposed_Base_Salary;
  if (proposedRaw != null && Number.isFinite(proposedRaw)) return proposedRaw / fte;

  const currentStored = record.Current_Salary_at_1FTE;
  if (currentStored != null && Number.isFinite(currentStored)) return currentStored;

  const currentRaw = record.Current_Base_Salary;
  if (currentRaw != null && Number.isFinite(currentRaw)) return currentRaw / fte;

  return undefined;
}

function getGroupValue(
  record: ProviderRecord,
  groupBy: ExperienceSalaryGroupBy
): string {
  if (groupBy === 'none') return '';
  if (groupBy === 'population') return (record.Population ?? '').trim() || '—';
  if (groupBy === 'specialty') return (record.Specialty ?? '').trim() || '—';
  if (groupBy === 'division') return (record.Primary_Division ?? '').trim() || '—';
  return '';
}

/**
 * Build chart data: one point per provider with valid YOE and salary at 1 FTE,
 * optionally grouped by population, specialty, or division.
 */
export function buildExperienceSalaryChartData(
  records: ProviderRecord[],
  groupBy: ExperienceSalaryGroupBy
): ExperienceSalaryChartData {
  const allPoints: ExperienceSalaryPoint[] = [];

  for (const r of records) {
    const yoe = getYoe(r);
    const salaryAt1Fte = getSalaryAt1Fte(r);
    if (yoe == null || salaryAt1Fte == null) continue;

    const groupLabel = getGroupValue(r, groupBy);
    allPoints.push({
      yoe,
      salaryAt1Fte,
      employeeId: r.Employee_ID,
      providerName: r.Provider_Name,
      groupLabel: groupBy !== 'none' ? groupLabel : undefined,
    });
  }

  if (groupBy === 'none') {
    return {
      series: [{ name: 'All', points: [...allPoints] }],
      allPoints,
    };
  }

  const byGroup = new Map<string, ExperienceSalaryPoint[]>();
  for (const p of allPoints) {
    const key = p.groupLabel ?? '—';
    let arr = byGroup.get(key);
    if (!arr) {
      arr = [];
      byGroup.set(key, arr);
    }
    arr.push(p);
  }

  const series: ExperienceSalarySeries[] = Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([name, points]) => ({ name, points }));

  return { series, allPoints };
}
