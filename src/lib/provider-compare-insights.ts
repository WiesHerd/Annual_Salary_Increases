/**
 * Plain-language bullets for the provider compare modal (meeting-friendly:
 * why base vs total cash can look "out of order", FTE effects, mix of pay).
 */

import type { ProviderRecord } from '../types/provider';

export function getTccAt1Fte(p: ProviderRecord): number | undefined {
  const stored = p.Proposed_TCC_at_1FTE ?? p.Current_TCC_at_1FTE;
  if (stored != null && Number.isFinite(stored)) return stored;
  const raw = p.Proposed_TCC ?? p.Current_TCC;
  const fte = p.Current_FTE ?? 1;
  if (raw != null && Number.isFinite(raw) && fte > 0) return raw / fte;
  return undefined;
}

/** Base salary normalized to 1.0 FTE when stored or derivable from raw base ÷ FTE. */
export function getSalaryAt1Fte(p: ProviderRecord): number | undefined {
  const stored = p.Proposed_Salary_at_1FTE ?? p.Current_Salary_at_1FTE;
  if (stored != null && Number.isFinite(stored)) return stored;
  const base = p.Proposed_Base_Salary ?? p.Current_Base_Salary;
  const fte = p.Current_FTE ?? 1;
  if (base != null && Number.isFinite(base) && fte > 0) return base / fte;
  return undefined;
}

export interface ProviderCompBreakdown {
  name: string;
  employeeId: string;
  base: number;
  prod: number;
  supp: number;
  tcc: number;
  fte: number;
  tccAt1: number | undefined;
  salaryAt1: number | undefined;
}

export function getProviderCompBreakdown(p: ProviderRecord): ProviderCompBreakdown {
  const base = p.Proposed_Base_Salary ?? p.Current_Base_Salary ?? 0;
  const cf = p.Proposed_CF ?? p.Current_CF ?? 0;
  const w = p.Prior_Year_WRVUs ?? p.Normalized_WRVUs ?? p.Adjusted_WRVUs ?? 0;
  const prod = cf * w;
  const supp =
    (p.Division_Chief_Pay ?? 0) +
    (p.Medical_Director_Pay ?? 0) +
    (p.Teaching_Pay ?? 0) +
    (p.PSQ_Pay ?? 0) +
    (p.Quality_Bonus ?? 0) +
    (p.Other_Recurring_Comp ?? 0);
  return {
    name: p.Provider_Name ?? p.Employee_ID,
    employeeId: p.Employee_ID,
    base,
    prod,
    supp,
    tcc: base + prod + supp,
    fte: p.Current_FTE ?? 1,
    tccAt1: getTccAt1Fte(p),
    salaryAt1: getSalaryAt1Fte(p),
  };
}

const MIN_MEANINGFUL_DOLLARS = 2_500;
const FTE_DIFF_EPS = 0.02;

function shortName(s: string): string {
  return s.length > 28 ? `${s.slice(0, 26)}…` : s;
}

function pairKey(idA: string, idB: string, kind: string): string {
  return `${[idA, idB].sort().join(':')}|${kind}`;
}

/**
 * Short bullets for the compare modal header. Assumes 2–4 providers (caller filters).
 */
export function buildProviderCompareInsights(providers: ProviderRecord[]): string[] {
  if (providers.length < 2) return [];

  const m = providers.map(getProviderCompBreakdown);
  const bullets: string[] = [];

  const fteSpread = Math.max(...m.map((x) => x.fte)) - Math.min(...m.map((x) => x.fte));
  if (fteSpread > FTE_DIFF_EPS) {
    const who = m.map((x) => `${x.name} ${x.fte.toFixed(2)} FTE`).join('; ');
    bullets.push(
      `FTE differs (${who}). Raw base and total cash are dollars at actual FTE—use Base at 1.0 FTE and TCC at 1.0 FTE in the table to compare pay on a full-time basis.`
    );
  }

  const n = m.length;
  const seen = new Set<string>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const A = m[i];
      const B = m[j];

      // Lower raw base but higher raw total cash (classic meeting confusion)
      if (A.base + MIN_MEANINGFUL_DOLLARS < B.base && A.tcc > B.tcc + MIN_MEANINGFUL_DOLLARS) {
        const key = pairKey(A.employeeId, B.employeeId, 'inv');
        if (!seen.has(key)) {
          seen.add(key);
          const an = shortName(A.name);
          const bn = shortName(B.name);
          const dProd = A.prod - B.prod;
          const dSupp = A.supp - B.supp;
          const dTcc = A.tcc - B.tcc;
          const dBase = A.base - B.base;
          const bits: string[] = [];
          if (dProd >= MIN_MEANINGFUL_DOLLARS) bits.push(`${formatUsd(dProd)} more productivity pay (CF × wRVUs)`);
          if (dSupp >= MIN_MEANINGFUL_DOLLARS) bits.push(`${formatUsd(dSupp)} more supplemental (stipends, quality, etc.)`);
          if (bits.length === 0) bits.push('higher productivity and/or supplemental pay');
          bullets.push(
            `${an}'s base is about ${formatUsd(-dBase)} below ${bn}'s, but total cash is about ${formatUsd(dTcc)} higher—mostly ${bits.join(' and ')}.`
          );
        }
      } else if (B.base + MIN_MEANINGFUL_DOLLARS < A.base && B.tcc > A.tcc + MIN_MEANINGFUL_DOLLARS) {
        const key = pairKey(A.employeeId, B.employeeId, 'inv');
        if (!seen.has(key)) {
          seen.add(key);
          const bn = shortName(B.name);
          const an = shortName(A.name);
          const dProd = B.prod - A.prod;
          const dSupp = B.supp - A.supp;
          const dTcc = B.tcc - A.tcc;
          const dBase = B.base - A.base;
          const bits: string[] = [];
          if (dProd >= MIN_MEANINGFUL_DOLLARS) bits.push(`${formatUsd(dProd)} more productivity pay (CF × wRVUs)`);
          if (dSupp >= MIN_MEANINGFUL_DOLLARS) bits.push(`${formatUsd(dSupp)} more supplemental (stipends, quality, etc.)`);
          if (bits.length === 0) bits.push('higher productivity and/or supplemental pay');
          bullets.push(
            `${bn}'s base is about ${formatUsd(-dBase)} below ${an}'s, but total cash is about ${formatUsd(dTcc)} higher—mostly ${bits.join(' and ')}.`
          );
        }
      }

      // Raw total cash ordering flips vs TCC at 1.0 FTE (part-time / normalization)
      if (
        A.tccAt1 != null &&
        B.tccAt1 != null &&
        A.tcc > B.tcc + MIN_MEANINGFUL_DOLLARS &&
        A.tccAt1 + MIN_MEANINGFUL_DOLLARS < B.tccAt1
      ) {
        const key = pairKey(A.employeeId, B.employeeId, 'flip');
        if (!seen.has(key)) {
          seen.add(key);
          const an = shortName(A.name);
          const bn = shortName(B.name);
          bullets.push(
            `${an} shows higher total cash at actual FTE than ${bn}, but at 1.0 FTE total cash is lower (${formatUsd(A.tccAt1)} vs ${formatUsd(B.tccAt1)})—check FTE before reading raw totals.`
          );
        }
      } else if (
        A.tccAt1 != null &&
        B.tccAt1 != null &&
        B.tcc > A.tcc + MIN_MEANINGFUL_DOLLARS &&
        B.tccAt1 + MIN_MEANINGFUL_DOLLARS < A.tccAt1
      ) {
        const key = pairKey(A.employeeId, B.employeeId, 'flip');
        if (!seen.has(key)) {
          seen.add(key);
          const bn = shortName(B.name);
          const an = shortName(A.name);
          bullets.push(
            `${bn} shows higher total cash at actual FTE than ${an}, but at 1.0 FTE total cash is lower (${formatUsd(B.tccAt1)} vs ${formatUsd(A.tccAt1)})—check FTE before reading raw totals.`
          );
        }
      }

      // Same story for base: raw base lower but salary-at-1-FTE not lower (or similar)
      if (
        fteSpread > FTE_DIFF_EPS &&
        A.salaryAt1 != null &&
        B.salaryAt1 != null &&
        A.base + MIN_MEANINGFUL_DOLLARS < B.base &&
        A.salaryAt1 >= B.salaryAt1 - MIN_MEANINGFUL_DOLLARS
      ) {
        const key = pairKey(A.employeeId, B.employeeId, 'base1');
        if (!seen.has(key)) {
          seen.add(key);
          const an = shortName(A.name);
          const bn = shortName(B.name);
          bullets.push(
            `${an}'s raw base is below ${bn}'s, but base at 1.0 FTE is similar or higher (${formatUsd(A.salaryAt1)} vs ${formatUsd(B.salaryAt1)})—often an FTE effect, not a lower pay rate.`
          );
        }
      } else if (
        fteSpread > FTE_DIFF_EPS &&
        A.salaryAt1 != null &&
        B.salaryAt1 != null &&
        B.base + MIN_MEANINGFUL_DOLLARS < A.base &&
        B.salaryAt1 >= A.salaryAt1 - MIN_MEANINGFUL_DOLLARS
      ) {
        const key = pairKey(A.employeeId, B.employeeId, 'base1');
        if (!seen.has(key)) {
          seen.add(key);
          const bn = shortName(B.name);
          const an = shortName(A.name);
          bullets.push(
            `${bn}'s raw base is below ${an}'s, but base at 1.0 FTE is similar or higher (${formatUsd(B.salaryAt1)} vs ${formatUsd(A.salaryAt1)})—often an FTE effect, not a lower pay rate.`
          );
        }
      }
    }
  }

  if (bullets.length === 0) {
    const withTcc1 = m
      .map((x, idx) => ({ idx, t: x.tccAt1 }))
      .filter((o): o is { idx: number; t: number } => o.t != null && Number.isFinite(o.t));
    if (withTcc1.length >= 2) {
      let max = withTcc1[0];
      let min = withTcc1[0];
      for (const o of withTcc1) {
        if (o.t > max.t) max = o;
        if (o.t < min.t) min = o;
      }
      if (max.idx !== min.idx) {
        const spread = max.t - min.t;
        if (spread >= MIN_MEANINGFUL_DOLLARS) {
          const hi = shortName(m[max.idx].name);
          const lo = shortName(m[min.idx].name);
          bullets.push(
            `At 1.0 FTE, total cash is highest for ${hi} (${formatUsd(max.t)}) and lowest for ${lo} (${formatUsd(min.t)}).`
          );
        }
      }
    }
  }

  if (bullets.length === 0) {
    bullets.push('Use the rows below to compare base, productivity, supplemental, and FTE-normalized totals.');
  }

  return bullets;
}

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}
