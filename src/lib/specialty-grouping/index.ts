/**
 * Public API: deterministic specialty → specialty-group resolution with review + learning.
 */

export type {
  CanonicalSpecialtyRecord,
  SpecialtyGroupCanonical,
  SpecialtyMatchMethod,
  SpecialtyGrouperResult,
  SpecialtyGrouperOptions,
  SpecialtyReviewQueueItem,
  UserLearnedSynonym,
} from './types';

export { SPECIALTY_GROUPING_SEED } from './seed-canonical';
export {
  normalizeForComparison,
  normalizeAggressive,
  tokenizeNormalized,
  tokenWeight,
  NORMALIZE_STOP_WORDS,
  LOW_VALUE_TOKENS,
  SPECIALTY_KEY_TOKEN_WEIGHT,
} from './normalize';

export { buildRegistry, type SpecialtyGroupingRegistry } from './registry';
export { resolveSpecialtyGroup, resolveSpecialtyGroupBatch, manualReviewResult } from './match-engine';

export {
  loadReviewQueue,
  saveReviewQueue,
  enqueueReviewFromResult,
  pendingReviewItems,
  approveReviewItem,
  rejectReviewItem,
} from './review-queue';

export {
  loadUserLearnedSynonyms,
  saveUserLearnedSynonyms,
  appendUserLearnedSynonym,
  normalizeSynonymKey,
} from './user-synonym-storage';

export { tokenMatchScore, confidenceForMethod } from './scoring';
export { applyStructuralRules } from './rules';
