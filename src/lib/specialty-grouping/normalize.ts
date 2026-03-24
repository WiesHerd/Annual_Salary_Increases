/**
 * Normalization helpers for Layer 3+ matching.
 * Keeps behavior deterministic and unit-testable.
 */

/** Filler tokens stripped only in "aggressive" normalize path (Layer 3). */
export const NORMALIZE_STOP_WORDS = new Set([
  'general',
  'all',
  'medicine',
  'medical',
  'provider',
  'physician',
  'the',
  'and',
  'of',
  'for',
]);

/**
 * Tokens that should contribute little to similarity scores (Layer 4).
 * Not removed from strings for display—only used in weighting.
 */
export const LOW_VALUE_TOKENS = new Set([
  ...NORMALIZE_STOP_WORDS,
  'doc',
  'dr',
  'md',
  'do',
  'np',
  'pa',
  'app',
  'advanced',
  'practice',
  'clinic',
  'care',
]);

/** Medically meaningful tokens get extra weight in Layer 4. */
export const SPECIALTY_KEY_TOKEN_WEIGHT: Record<string, number> = {
  cardiology: 1.4,
  cardiothoracic: 1.5,
  radiology: 1.35,
  interventional: 1.25,
  surgery: 1.35,
  surgical: 1.35,
  neurology: 1.35,
  neurosurgery: 1.45,
  emergency: 1.3,
  hospitalist: 1.45,
  orthopedic: 1.35,
  orthopaedic: 1.35,
  urology: 1.35,
  pulmonary: 1.3,
  critical: 1.25,
  care: 1.0,
  oncology: 1.35,
  hematology: 1.3,
  pediatrics: 1.45,
  pediatric: 1.45,
  peds: 1.35,
  neonatal: 1.4,
  neonatology: 1.4,
  obstetrics: 1.2,
  gynecology: 1.2,
  obgyn: 1.25,
  gastroenterology: 1.3,
  gi: 1.15,
  nephrology: 1.3,
  endocrinology: 1.3,
  rheumatology: 1.3,
  infectious: 1.25,
  dermatology: 1.25,
  ophthalmology: 1.25,
  otolaryngology: 1.25,
  ent: 1.15,
  anesthesiology: 1.35,
  anesthetist: 1.3,
  pathology: 1.25,
  psychiatry: 1.3,
  psychology: 1.1,
  plastic: 1.3,
  trauma: 1.25,
  transplant: 1.3,
  hospital: 1.15,
  based: 1.05,
  inpatient: 1.15,
  outpatient: 1.1,
  vascular: 1.3,
  thoracic: 1.35,
  colorectal: 1.35,
  bariatric: 1.25,
  sports: 1.1,
};

/**
 * Layer-3 string: lowercase, trim, collapse whitespace, unify common separators to space.
 * Does not remove punctuation entirely (hyphens often semantic).
 */
export function normalizeForComparison(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/[–—]/g, '-');
  s = s.replace(/\s*([-/&])\s*/g, ' $1 ');
  s = s.replace(/[^\w\s\-/&]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Aggressive normalization: also drops safe filler words for equality checks.
 */
export function normalizeAggressive(input: string): string {
  const base = normalizeForComparison(input);
  const parts = base.split(/[\s\-/&]+/).filter((t) => t.length > 0 && !NORMALIZE_STOP_WORDS.has(t));
  return parts.join(' ');
}

export function tokenizeNormalized(normalized: string): string[] {
  return normalized
    .split(/[\s\-/&,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function tokenWeight(token: string): number {
  if (LOW_VALUE_TOKENS.has(token)) return 0.35;
  const w = SPECIALTY_KEY_TOKEN_WEIGHT[token];
  return w ?? 1;
}
