/**
 * Experience vs. salary (at 1 FTE) chart data.
 * Pure data + grouping for the BI trend chart; no UI.
 */

import type { ProviderRecord } from '../types/provider';
import { getEffectiveYoe } from './effective-yoe';

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

/** ECharts scatter label placement to reduce on-screen name collisions. */
export type ScatterLabelPosition = 'right' | 'left' | 'top' | 'bottom';

export interface ScatterLabelLayout {
  position: ScatterLabelPosition;
  /** Pixel nudge [x, y] when many points fall in the same YOE/salary bucket. */
  offset: [number, number];
}

const SCATTER_LABEL_POSITIONS: ScatterLabelPosition[] = ['right', 'left', 'top', 'bottom'];

/**
 * Assign label position + offset per provider so nearby points do not all use the same side
 * (which stacks names on top of each other). Deterministic: same inputs → same layout.
 */
export function assignExperienceScatterLabelLayouts(
  points: ExperienceSalaryPoint[]
): Map<string, ScatterLabelLayout> {
  const cellCount = new Map<string, number>();
  const sorted = [...points].sort((a, b) => a.employeeId.localeCompare(b.employeeId, 'en'));
  const result = new Map<string, ScatterLabelLayout>();

  for (const p of sorted) {
    const yoeBin = Math.round(p.yoe * 2) / 2;
    const salaryBin = Math.round(p.salaryAt1Fte / 25_000) * 25_000;
    const cellKey = `${yoeBin}\0${salaryBin}`;
    const n = cellCount.get(cellKey) ?? 0;
    cellCount.set(cellKey, n + 1);

    const position = SCATTER_LABEL_POSITIONS[n % SCATTER_LABEL_POSITIONS.length];
    const stack = Math.floor(n / SCATTER_LABEL_POSITIONS.length);
    let offset: [number, number] = [0, 0];
    if (stack > 0) {
      if (position === 'right' || position === 'left') {
        offset = [0, stack * 14];
      } else {
        offset = [stack * 12, 0];
      }
    }
    result.set(p.employeeId, { position, offset });
  }

  return result;
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
    const yoe = getEffectiveYoe(r);
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
