/**
 * Confidence scores and token similarity for Layer 4 + Layer 6.
 */

import type { CanonicalSpecialtyRecord, SpecialtyMatchMethod } from './types';
import { normalizeForComparison, tokenWeight, tokenizeNormalized } from './normalize';

const PRIORITY_BOOST_PER_POINT = 0.01;

/** Layer 1 — exact canonical label match. */
export const CONFIDENCE_EXACT = 1;

/** Layer 2 — exact synonym match. */
export const CONFIDENCE_SYNONYM = 0.95;

/** Layer 3 — normalized / aggressive normalized equality. */
export const CONFIDENCE_NORMALIZED = 0.88;

/** Layer 4 — upper bound; actual score scaled by token overlap. */
export const CONFIDENCE_TOKEN_CEILING = 0.82;

/** Layer 5 — rule hit; varies slightly by rule specificity in caller. */
export const CONFIDENCE_RULE_STRONG = 0.9;

export const CONFIDENCE_RULE_MEDIUM = 0.82;

/** Manual assignment from review UI. */
export const CONFIDENCE_MANUAL = 0.97;

/** Last-resort guess. */
export const CONFIDENCE_FALLBACK = 0.35;

export function confidenceForMethod(
  method: SpecialtyMatchMethod,
  tokenRatio?: number
): number {
  switch (method) {
    case 'exact':
      return CONFIDENCE_EXACT;
    case 'synonym':
      return CONFIDENCE_SYNONYM;
    case 'normalized':
      return CONFIDENCE_NORMALIZED;
    case 'token':
      return Math.min(
        CONFIDENCE_TOKEN_CEILING,
        CONFIDENCE_TOKEN_CEILING * (tokenRatio ?? 0.65) + 0.15
      );
    case 'rule':
      return CONFIDENCE_RULE_STRONG;
    case 'manual-review':
      return CONFIDENCE_MANUAL;
    case 'fallback':
      return CONFIDENCE_FALLBACK;
    default:
      return CONFIDENCE_FALLBACK;
  }
}

/**
 * Weighted coverage: how much of the input's weighted tokens appear in the record's text bundle.
 */
export function tokenMatchScore(
  inputRaw: string,
  record: CanonicalSpecialtyRecord
): { score: number; ratio: number } {
  const normInput = normalizeForComparison(inputRaw);
  const inputToks = tokenizeNormalized(normInput);
  if (inputToks.length === 0) return { score: 0, ratio: 0 };

  const bundle = [record.canonicalSpecialty, ...(record.synonyms ?? []), ...(record.keywords ?? [])]
    .map((s) => normalizeForComparison(s))
    .join(' ');

  let matchedWeight = 0;
  let totalWeight = 0;
  for (const t of inputToks) {
    const w = tokenWeight(t);
    totalWeight += w;
    if (tokenInBundle(bundle, t)) matchedWeight += w;
  }

  const priority = record.priority ?? 0;
  const boost = 1 + Math.min(0.08, priority * PRIORITY_BOOST_PER_POINT);
  const ratio = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  const score = Math.min(1, ratio * boost);
  return { score, ratio };
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenInBundle(bundle: string, t: string): boolean {
  if (t.length <= 2) return bundle.split(/[\s\-/]+/).includes(t);
  const re = new RegExp(`(^|[\\s\\-/])${escapeReg(t)}([\\s\\-/]|$)`);
  return re.test(bundle);
}
