/**
 * Resolve effective Current CF and Proposed CF for a provider.
 * Uses record values when set; otherwise falls back to specialty config.
 */

import type { ProviderRecord } from '../types/provider';
import type { CfBySpecialtyRow } from '../types/cf-by-specialty';

function normalizeSpecialty(s: string | undefined): string {
  return (s ?? '').trim();
}

/** Look up CF by specialty (exact match, case-sensitive). */
export function getCfForSpecialty(
  specialty: string,
  rows: CfBySpecialtyRow[]
): { currentCf: number; proposedCf: number } {
  const key = normalizeSpecialty(specialty);
  const row = key ? rows.find((r) => normalizeSpecialty(r.specialty) === key) : undefined;
  return {
    currentCf: row?.currentCf ?? 0,
    proposedCf: row?.proposedCf ?? row?.currentCf ?? 0,
  };
}

/** Get effective Current CF and Proposed CF for a provider. Record values override config. */
export function getEffectiveCfForProvider(
  record: ProviderRecord,
  rows: CfBySpecialtyRow[]
): { currentCf: number; proposedCf: number } {
  const fromRecord = {
    currentCf: record.Current_CF,
    proposedCf: record.Proposed_CF,
  };
  const fromConfig = getCfForSpecialty(
    record.Specialty ?? record.Market_Specialty_Override ?? record.Benchmark_Group ?? '',
    rows
  );
  return {
    currentCf: fromRecord.currentCf ?? fromConfig.currentCf ?? 0,
    proposedCf: fromRecord.proposedCf ?? fromRecord.currentCf ?? fromConfig.proposedCf ?? fromConfig.currentCf ?? 0,
  };
}
