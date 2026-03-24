/**
 * Build in-memory indexes from seed data and user-learned synonyms.
 */

import type { CanonicalSpecialtyRecord } from './types';
import type { UserLearnedSynonym } from './types';
import { SPECIALTY_GROUPING_SEED } from './seed-canonical';
import { normalizeAggressive, normalizeForComparison } from './normalize';

export interface SpecialtyGroupingRegistry {
  /** All active canonical rows (merged user rows appended as synthetic records). */
  records: CanonicalSpecialtyRecord[];
  /** Lowercase trimmed canonical specialty → record (first wins unless higher priority user row). */
  canonicalKeyToRecord: Map<string, CanonicalSpecialtyRecord>;
  /** Normalized synonym key → record */
  synonymToRecord: Map<string, CanonicalSpecialtyRecord>;
}

function recordKeyPriority(r: CanonicalSpecialtyRecord): number {
  return r.priority ?? 0;
}

function pickBetter(
  existing: CanonicalSpecialtyRecord | undefined,
  next: CanonicalSpecialtyRecord
): CanonicalSpecialtyRecord {
  if (!existing) return next;
  return recordKeyPriority(next) > recordKeyPriority(existing) ? next : existing;
}

/**
 * User-learned rows become synthetic canonical records so token layer can still use keywords.
 */
function synonymToSyntheticRecord(s: UserLearnedSynonym): CanonicalSpecialtyRecord {
  return {
    specialtyGroup: s.specialtyGroup,
    canonicalSpecialty: s.canonicalSpecialty,
    synonyms: [s.synonymNormalized],
    keywords: [],
    priority: 100,
    activeFlag: true,
    notes: `user-learned synonym (${s.approvedAt})`,
  };
}

export function buildRegistry(userSynonyms: UserLearnedSynonym[] = []): SpecialtyGroupingRegistry {
  const seed = SPECIALTY_GROUPING_SEED.filter((r) => r.activeFlag);
  const userRecords = userSynonyms.map(synonymToSyntheticRecord);
  const records = [...seed, ...userRecords];

  const canonicalKeyToRecord = new Map<string, CanonicalSpecialtyRecord>();
  const synonymToRecord = new Map<string, CanonicalSpecialtyRecord>();

  for (const r of records) {
    const ck = normalizeForComparison(r.canonicalSpecialty);
    if (ck) {
      canonicalKeyToRecord.set(ck, pickBetter(canonicalKeyToRecord.get(ck), r));
    }
    for (const syn of r.synonyms ?? []) {
      const sk = normalizeForComparison(syn);
      const skAgg = normalizeAggressive(syn);
      if (sk) synonymToRecord.set(sk, pickBetter(synonymToRecord.get(sk), r));
      if (skAgg && skAgg !== sk) synonymToRecord.set(skAgg, pickBetter(synonymToRecord.get(skAgg), r));
    }
  }

  return { records, canonicalKeyToRecord, synonymToRecord };
}
