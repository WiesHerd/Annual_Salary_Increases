import type { Cycle } from '../types/cycle';
import type { BudgetSettingsRow } from '../types/budget-settings';

/** Five calendar years in ms (approx.); used for “recent cycles” default view. */
const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;

/** Milliseconds since epoch, or NaN if missing / invalid. */
export function effectiveDateToTime(iso: string | undefined): number {
  if (iso == null || String(iso).trim() === '') return NaN;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Preferred cycle when none is selected or the stored id is invalid:
 * latest effectiveDate; ties favor the later array index. If no row has a valid date,
 * use the last row with a non-empty label, else the last row's id.
 */
export function getPreferredCycleId(cycles: readonly Cycle[]): string | undefined {
  if (cycles.length === 0) return undefined;
  let bestIdx = -1;
  let bestTime = -Infinity;
  for (let i = 0; i < cycles.length; i++) {
    const t = effectiveDateToTime(cycles[i].effectiveDate);
    if (!Number.isNaN(t) && (t > bestTime || (t === bestTime && i > bestIdx))) {
      bestTime = t;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return cycles[bestIdx].id;
  for (let i = cycles.length - 1; i >= 0; i--) {
    if ((cycles[i].label ?? '').trim() !== '') return cycles[i].id;
  }
  return cycles[cycles.length - 1]?.id;
}

/** Sort for display (e.g. dropdowns): newest effective date first; missing dates last; tie-break by array order (later wins). */
export function sortCyclesNewestFirst(cycles: readonly Cycle[]): Cycle[] {
  const indexed = cycles.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => {
    const ta = effectiveDateToTime(a.c.effectiveDate);
    const tb = effectiveDateToTime(b.c.effectiveDate);
    const aOk = !Number.isNaN(ta);
    const bOk = !Number.isNaN(tb);
    if (aOk && bOk && ta !== tb) return tb - ta;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    if (aOk && bOk) return b.i - a.i;
    return b.i - a.i;
  });
  return indexed.map((x) => x.c);
}

/** Compare effective dates for table sort: valid dates before empty; desc means larger (newer) first when dir is desc. */
export function compareCycleEffectiveDate(
  a: Cycle,
  b: Cycle,
  dir: 'asc' | 'desc'
): number {
  const ta = effectiveDateToTime(a.effectiveDate);
  const tb = effectiveDateToTime(b.effectiveDate);
  const aEmpty = Number.isNaN(ta);
  const bEmpty = Number.isNaN(tb);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const cmp = ta - tb;
  return dir === 'asc' ? cmp : -cmp;
}

export function compareCycleLabel(a: Cycle, b: Cycle, dir: 'asc' | 'desc'): number {
  const sa = (a.label ?? '').trim();
  const sb = (b.label ?? '').trim();
  const cmp = sa.localeCompare(sb, undefined, { sensitivity: 'base', numeric: true });
  return dir === 'asc' ? cmp : -cmp;
}

/**
 * Cutoff = (latest effectiveDate among cycles) − 5 years. Null if no cycle has a valid date
 * (caller should treat “recent” same as “all” in that case).
 */
export function getRecentCyclesCutoffMs(cycles: readonly Cycle[]): number | null {
  let maxT = -Infinity;
  for (const c of cycles) {
    const t = effectiveDateToTime(c.effectiveDate);
    if (!Number.isNaN(t)) maxT = Math.max(maxT, t);
  }
  if (maxT === -Infinity) return null;
  return maxT - FIVE_YEARS_MS;
}

/** Recent scope: include cycles on/after cutoff, or with no effective date yet (so new rows stay visible). */
export function cycleVisibleInTimeScope(
  c: Cycle,
  scope: 'all' | 'recent',
  cutoffMs: number | null
): boolean {
  if (scope === 'all' || cutoffMs == null) return true;
  const t = effectiveDateToTime(c.effectiveDate);
  if (Number.isNaN(t)) return true;
  return t >= cutoffMs;
}

/** Recent scope: include row if linked cycle is in window, or cycle missing (orphan rows stay visible). */
export function budgetRowVisibleInTimeScope(
  r: BudgetSettingsRow,
  cycles: readonly Cycle[],
  scope: 'all' | 'recent',
  cutoffMs: number | null
): boolean {
  if (scope === 'all' || cutoffMs == null) return true;
  const c = cycles.find((x) => x.id === r.cycleId);
  if (!c) return true;
  return cycleVisibleInTimeScope(c, 'recent', cutoffMs);
}
