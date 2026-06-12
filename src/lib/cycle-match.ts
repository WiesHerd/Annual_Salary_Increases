/**
 * Match provider Cycle field values to configured review cycles.
 * Supports cycle id, label, and legacy tokens (e.g. FY2025 vs cycle-fy2025 / FY 2025).
 */

import type { ProviderRecord } from '../types/provider';
import type { Cycle } from '../types/cycle';

export function normalizeCycleToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

/** Tokens that identify a configured cycle (id, label, legacy variants). */
export function cycleMatchTokens(cycle: Cycle): Set<string> {
  const tokens = new Set<string>();
  const add = (raw?: string) => {
    if (raw?.trim()) tokens.add(normalizeCycleToken(raw));
  };
  add(cycle.id);
  add(cycle.label);
  if (cycle.id.startsWith('cycle-')) {
    const suffix = cycle.id.slice('cycle-'.length);
    add(suffix);
    add(suffix.replace(/-/g, ''));
  }
  return tokens;
}

/** Value to stamp on upload when the file row has no Cycle column. */
export function resolveCycleStampValue(cycleId: string, cycles: Cycle[]): string {
  const cycle = cycles.find((c) => c.id === cycleId);
  return cycle?.label?.trim() || cycleId;
}

export interface ProviderCycleMatchOptions {
  /** When true, providers with blank Cycle appear in every cycle view (default). */
  includeUnassigned?: boolean;
}

/**
 * Whether a provider belongs to the selected review cycle.
 * Blank Cycle is included when includeUnassigned is true (default).
 */
export function providerMatchesCycle(
  record: ProviderRecord,
  selectedCycleId: string,
  cycles: Cycle[],
  options: ProviderCycleMatchOptions = {}
): boolean {
  const includeUnassigned = options.includeUnassigned ?? true;
  const raw = record.Cycle?.trim();
  if (!raw) return includeUnassigned;

  const selected = cycles.find((c) => c.id === selectedCycleId);
  if (!selected) {
    return normalizeCycleToken(raw) === normalizeCycleToken(selectedCycleId);
  }
  return cycleMatchTokens(selected).has(normalizeCycleToken(raw));
}

/** Filter providers to those in the selected cycle (plus unassigned when enabled). */
export function filterProvidersForCycle(
  records: ProviderRecord[],
  selectedCycleId: string,
  cycles: Cycle[],
  options?: ProviderCycleMatchOptions
): ProviderRecord[] {
  if (!selectedCycleId.trim()) return records;
  return records.filter((r) => providerMatchesCycle(r, selectedCycleId, cycles, options));
}
