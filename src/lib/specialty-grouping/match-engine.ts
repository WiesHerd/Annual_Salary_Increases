/**
 * Layered matching pipeline + confidence / review flags.
 */

import type { InternalMatchCandidate, SpecialtyGrouperOptions, SpecialtyGrouperResult } from './types';
import { buildRegistry, type SpecialtyGroupingRegistry } from './registry';
import { normalizeAggressive, normalizeForComparison } from './normalize';
import { applyStructuralRules } from './rules';
import { confidenceForMethod, tokenMatchScore } from './scoring';
import { maybeEnqueueReview } from './review-queue';

const DEFAULT_REVIEW_THRESHOLD = 0.72;
const DEFAULT_MIN_TOKEN = 0.42;
const DEFAULT_STRONG_TOKEN = 0.68;

function toResult(
  original: string,
  normalizedInput: string,
  candidate: InternalMatchCandidate | null,
  tokenRatio: number | undefined,
  reviewThreshold: number
): SpecialtyGrouperResult {
  if (!candidate) {
    return {
      originalSpecialty: original,
      normalizedInput,
      assignedSpecialtyGroup: null,
      assignedCanonicalSpecialty: null,
      confidenceScore: 0,
      matchMethod: 'fallback',
      reviewFlag: true,
      reviewReason: 'No deterministic match; needs manual specialty group assignment.',
    };
  }

  const confidenceScore =
    candidate.method === 'token'
      ? confidenceForMethod('token', tokenRatio)
      : candidate.method === 'rule'
        ? candidate.baseConfidence
        : confidenceForMethod(candidate.method);

  const reviewFlag =
    confidenceScore < reviewThreshold ||
    (candidate.method === 'token' && (tokenRatio ?? 0) < 0.55);

  return {
    originalSpecialty: original,
    normalizedInput,
    assignedSpecialtyGroup: candidate.specialtyGroup,
    assignedCanonicalSpecialty: candidate.canonicalSpecialty,
    confidenceScore,
    matchMethod: candidate.method,
    reviewFlag,
    reviewReason: reviewFlag
      ? 'Confidence below threshold or weak token overlap; confirm specialty group.'
      : undefined,
  };
}

function layer1Exact(
  normalizedKey: string,
  reg: SpecialtyGroupingRegistry
): InternalMatchCandidate | null {
  const r = reg.canonicalKeyToRecord.get(normalizedKey);
  if (!r) return null;
  return {
    specialtyGroup: r.specialtyGroup,
    canonicalSpecialty: r.canonicalSpecialty,
    method: 'exact',
    baseConfidence: 1,
  };
}

function layer2Synonym(normKey: string, aggKey: string, reg: SpecialtyGroupingRegistry): InternalMatchCandidate | null {
  const r = reg.synonymToRecord.get(normKey) ?? reg.synonymToRecord.get(aggKey);
  if (!r) return null;
  return {
    specialtyGroup: r.specialtyGroup,
    canonicalSpecialty: r.canonicalSpecialty,
    method: 'synonym',
    baseConfidence: 0.95,
  };
}

function layer3Normalized(inputAgg: string, reg: SpecialtyGroupingRegistry): InternalMatchCandidate | null {
  if (!inputAgg) return null;
  for (const r of reg.records) {
    if (!r.activeFlag) continue;
    const cAgg = normalizeAggressive(r.canonicalSpecialty);
    if (cAgg && cAgg === inputAgg) {
      return { specialtyGroup: r.specialtyGroup, canonicalSpecialty: r.canonicalSpecialty, method: 'normalized', baseConfidence: 0.88 };
    }
    for (const syn of r.synonyms ?? []) {
      const sAgg = normalizeAggressive(syn);
      if (sAgg && sAgg === inputAgg) {
        return { specialtyGroup: r.specialtyGroup, canonicalSpecialty: r.canonicalSpecialty, method: 'normalized', baseConfidence: 0.88 };
      }
    }
  }
  return null;
}

function layer4Token(
  input: string,
  reg: SpecialtyGroupingRegistry,
  minTokenFloor: number
): { candidate: InternalMatchCandidate; ratio: number } | null {
  let best: { r: (typeof reg.records)[0]; score: number; ratio: number } | null = null;
  for (const r of reg.records) {
    if (!r.activeFlag) continue;
    const { score, ratio } = tokenMatchScore(input, r);
    if (!best || score > best.score || (score === best.score && (r.priority ?? 0) > (best.r.priority ?? 0))) {
      best = { r, score, ratio };
    }
  }
  if (!best || best.score < minTokenFloor) return null;
  return {
    candidate: {
      specialtyGroup: best.r.specialtyGroup,
      canonicalSpecialty: best.r.canonicalSpecialty,
      method: 'token',
      baseConfidence: best.score,
    },
    ratio: best.ratio,
  };
}

/**
 * Resolve a single specialty label to a specialty group using L1–L5 + confidence (L6).
 */
export function resolveSpecialtyGroup(
  rawInput: string,
  options: SpecialtyGrouperOptions = {},
  registryOverride?: SpecialtyGroupingRegistry
): SpecialtyGrouperResult {
  const original = rawInput ?? '';
  const normalizedInput = normalizeForComparison(original);
  const inputAgg = normalizeAggressive(original);

  const reviewThreshold = options.reviewConfidenceThreshold ?? DEFAULT_REVIEW_THRESHOLD;
  const minToken = options.minimumTokenAssignmentScore ?? DEFAULT_MIN_TOKEN;
  const strongToken = DEFAULT_STRONG_TOKEN;
  const reg = registryOverride ?? buildRegistry(options.userSynonyms ?? []);

  const l1 = layer1Exact(normalizedInput, reg);
  if (l1) {
    const res = toResult(original, normalizedInput, l1, undefined, reviewThreshold);
    maybeEnqueueReview(res, options.autoEnqueueReview);
    return res;
  }

  const l2 = layer2Synonym(normalizedInput, inputAgg, reg);
  if (l2) {
    const res = toResult(original, normalizedInput, l2, undefined, reviewThreshold);
    maybeEnqueueReview(res, options.autoEnqueueReview);
    return res;
  }

  const l3 = layer3Normalized(inputAgg, reg);
  if (l3) {
    const res = toResult(original, normalizedInput, l3, undefined, reviewThreshold);
    maybeEnqueueReview(res, options.autoEnqueueReview);
    return res;
  }

  const l5 = applyStructuralRules(original);
  if (l5) {
    const res = toResult(original, normalizedInput, l5, undefined, reviewThreshold);
    maybeEnqueueReview(res, options.autoEnqueueReview);
    return res;
  }

  const l4 = layer4Token(original, reg, minToken);
  if (l4 && l4.candidate.baseConfidence >= strongToken) {
    const res = toResult(original, normalizedInput, l4.candidate, l4.ratio, reviewThreshold);
    maybeEnqueueReview(res, options.autoEnqueueReview);
    return res;
  }

  if (l4 && l4.candidate.baseConfidence >= minToken) {
    const res = toResult(original, normalizedInput, l4.candidate, l4.ratio, reviewThreshold);
    maybeEnqueueReview(res, options.autoEnqueueReview);
    return res;
  }

  const res = toResult(original, normalizedInput, null, undefined, reviewThreshold);
  maybeEnqueueReview(res, options.autoEnqueueReview);
  return res;
}

/** Batch resolve (stable order). */
export function resolveSpecialtyGroupBatch(
  inputs: string[],
  options: SpecialtyGrouperOptions = {}
): SpecialtyGrouperResult[] {
  const reg = buildRegistry(options.userSynonyms ?? []);
  return inputs.map((s) => resolveSpecialtyGroup(s, { ...options, userSynonyms: options.userSynonyms }, reg));
}

/** Apply an admin manual assignment (e.g. from review UI). */
export function manualReviewResult(
  original: string,
  specialtyGroup: NonNullable<SpecialtyGrouperResult['assignedSpecialtyGroup']>,
  canonicalSpecialty: string
): SpecialtyGrouperResult {
  const normalizedInput = normalizeForComparison(original);
  return {
    originalSpecialty: original,
    normalizedInput,
    assignedSpecialtyGroup: specialtyGroup,
    assignedCanonicalSpecialty: canonicalSpecialty,
    confidenceScore: confidenceForMethod('manual-review'),
    matchMethod: 'manual-review',
    reviewFlag: false,
  };
}
