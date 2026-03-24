/**
 * Layer 5 — deterministic overrides for pediatric/adult splits, hospital-based routing, APP roles.
 */

import type { InternalMatchCandidate, SpecialtyGroupCanonical } from './types';
import { CONFIDENCE_RULE_MEDIUM, CONFIDENCE_RULE_STRONG } from './scoring';
import { normalizeAggressive, normalizeForComparison } from './normalize';

function has(norm: string, needle: string): boolean {
  return norm.includes(needle);
}

function hasAny(norm: string, needles: string[]): boolean {
  return needles.some((n) => has(norm, n));
}

function isPediatric(norm: string): boolean {
  return (
    has(norm, 'pediatric') ||
    has(norm, 'pediatrics') ||
    /\bpeds\b/.test(norm) ||
    has(norm, 'paediatric')
  );
}

const ADULT_SURGICAL_HINTS = [
  'surgery',
  'surgical',
  'urology',
  'urologic',
  'orthopedic',
  'orthopaedic',
  'neurosurgery',
  'plastic',
  'vascular',
  'thoracic',
  'cardiothoracic',
  'ct surgery',
  'general surgery',
];

/** Try structural rules after L1–L3; supplements or corrects weak token matches. */
export function applyStructuralRules(originalInput: string): InternalMatchCandidate | null {
  const norm = normalizeForComparison(originalInput);
  const agg = normalizeAggressive(originalInput);
  const peds = isPediatric(norm);

  if (peds && has(norm, 'cardiology')) {
    return cand('Pediatric Medical', 'Pediatrics - Cardiology', CONFIDENCE_RULE_STRONG);
  }
  if (peds && has(norm, 'radiology')) {
    return cand('Pediatric Hospital Based', 'Pediatrics - Radiology', CONFIDENCE_RULE_STRONG);
  }
  if (peds && has(norm, 'emergency')) {
    return cand('Pediatric Hospital Based', 'Pediatrics - Emergency Medicine', CONFIDENCE_RULE_STRONG);
  }
  if (peds && has(norm, 'hospitalist')) {
    return cand('Pediatric Hospital Based', 'Pediatrics - Hospitalist', CONFIDENCE_RULE_STRONG);
  }
  if (
    peds &&
    hasAny(norm, [
      'neonatal',
      'neonatology',
      'nicu',
    ])
  ) {
    return cand('Pediatric Hospital Based', 'Neonatology', CONFIDENCE_RULE_STRONG);
  }
  if (peds && hasAny(norm, ADULT_SURGICAL_HINTS)) {
    return cand('Pediatric Surgical', 'Pediatrics - General Surgery', CONFIDENCE_RULE_MEDIUM);
  }

  if (!peds && has(norm, 'radiology')) {
    if (has(norm, 'interventional')) {
      return cand('Hospital Based', 'Radiology - Interventional', CONFIDENCE_RULE_STRONG);
    }
    return cand('Hospital Based', 'Radiology - Diagnostic', CONFIDENCE_RULE_MEDIUM);
  }
  if (!peds && has(norm, 'emergency')) {
    return cand('Hospital Based', 'Emergency Medicine', CONFIDENCE_RULE_STRONG);
  }
  if (!peds && has(norm, 'hospitalist')) {
    return cand('Hospital Based', 'Hospitalist - Internal Medicine', CONFIDENCE_RULE_STRONG);
  }
  if (!peds && /critical care|intensivist|\bicu\b/.test(norm)) {
    return cand('Hospital Based', 'Critical Care', CONFIDENCE_RULE_STRONG);
  }

  if (
    /\bcrna\b|certified registered nurse anesthetist|nurse anesthetist/.test(agg) ||
    /\bcnm\b|nurse midwife|midwife/.test(agg) ||
    /\bcaa\b|anesthesiologist assistant|anesthesia assistant/.test(agg)
  ) {
    const canonical =
      /\bcrna\b|nurse anesthetist/.test(agg)
        ? 'Certified Registered Nurse Anesthetist'
        : /\bcnm\b|midwife/.test(agg)
          ? 'Certified Nurse Midwife'
          : 'Anesthesiologist Assistant';
    return cand('APPs - General', canonical, CONFIDENCE_RULE_STRONG);
  }

  if (/\bfellow\b|\bfellowship\b/.test(norm) && !hasAny(norm, ADULT_SURGICAL_HINTS.concat(['cardiology', 'oncology']))) {
    return cand('APPs - General', 'Physician Assistant - General', CONFIDENCE_RULE_MEDIUM);
  }

  return null;
}

function cand(
  specialtyGroup: SpecialtyGroupCanonical,
  canonicalSpecialty: string,
  baseConfidence: number
): InternalMatchCandidate {
  return {
    specialtyGroup,
    canonicalSpecialty,
    method: 'rule',
    baseConfidence,
  };
}
