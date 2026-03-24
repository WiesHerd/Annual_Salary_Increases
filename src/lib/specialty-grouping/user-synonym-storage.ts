/**
 * Persist admin-approved synonyms (learning loop) without code deploys.
 */

import { migratedStorageGetItem, migratedStorageSetItem } from '../migrated-local-storage';
import type { UserLearnedSynonym } from './types';
import { normalizeForComparison } from './normalize';

const KEY = 'tcc-specialty-grouping-user-synonyms';

export function loadUserLearnedSynonyms(): UserLearnedSynonym[] {
  try {
    const raw = migratedStorageGetItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isUserLearnedSynonym);
  } catch {
    return [];
  }
}

function isUserLearnedSynonym(x: unknown): x is UserLearnedSynonym {
  if (x == null || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.synonymNormalized === 'string' &&
    typeof o.canonicalSpecialty === 'string' &&
    typeof o.specialtyGroup === 'string' &&
    typeof o.approvedAt === 'string'
  );
}

export function saveUserLearnedSynonyms(rows: UserLearnedSynonym[]): void {
  migratedStorageSetItem(KEY, JSON.stringify(rows));
}

export function appendUserLearnedSynonym(entry: UserLearnedSynonym): UserLearnedSynonym[] {
  const cur = loadUserLearnedSynonyms();
  const key = entry.synonymNormalized;
  const without = cur.filter((r) => r.synonymNormalized !== key);
  const next = [...without, entry];
  saveUserLearnedSynonyms(next);
  return next;
}

/** Normalized key used for synonym lookups. */
export function normalizeSynonymKey(phrase: string): string {
  return normalizeForComparison(phrase.trim());
}
