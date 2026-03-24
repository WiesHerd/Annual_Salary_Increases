/**
 * Domain types for deterministic specialty → specialty-group resolution.
 * All matching is auditable; optional AI reranking can sit on top (see README).
 */

/** Canonical specialty groups used in compensation modeling. */
export type SpecialtyGroupCanonical =
  | 'APPs - General'
  | 'Primary Care'
  | 'Medical'
  | 'Surgical'
  | 'Hospital Based'
  | 'Pediatric Medical'
  | 'Pediatric Surgical'
  | 'Pediatric Hospital Based';

/** How the assignment was produced (for audit logs and UI). */
export type SpecialtyMatchMethod =
  | 'exact'
  | 'synonym'
  | 'normalized'
  | 'token'
  | 'rule'
  | 'manual-review'
  | 'fallback';

/** Single row in the canonical mapping table (seed or exportable config). */
export interface CanonicalSpecialtyRecord {
  specialtyGroup: SpecialtyGroupCanonical;
  canonicalSpecialty: string;
  synonyms: string[];
  keywords?: string[];
  /** Higher wins when multiple rows compete on token scores (default 0). */
  priority?: number;
  activeFlag: boolean;
  notes?: string;
}

/** Result of resolving one incoming specialty label. */
export interface SpecialtyGrouperResult {
  originalSpecialty: string;
  normalizedInput: string;
  assignedSpecialtyGroup: SpecialtyGroupCanonical | null;
  assignedCanonicalSpecialty: string | null;
  confidenceScore: number;
  matchMethod: SpecialtyMatchMethod;
  reviewFlag: boolean;
  reviewReason?: string;
}

/** Admin review item when confidence is low or no match. */
export interface SpecialtyReviewQueueItem {
  id: string;
  originalSpecialty: string;
  normalizedInput: string;
  suggestedSpecialtyGroup: SpecialtyGroupCanonical | null;
  suggestedCanonicalSpecialty: string | null;
  confidenceScore: number;
  matchMethod: SpecialtyMatchMethod;
  reviewReason?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
}

/** Persisted synonym learned from an approved review (merged into L2/L3). */
export interface UserLearnedSynonym {
  /** Normalized form used for exact/synonym layer (see normalize.ts). */
  synonymNormalized: string;
  canonicalSpecialty: string;
  specialtyGroup: SpecialtyGroupCanonical;
  sourceReviewItemId?: string;
  approvedAt: string;
}

export interface SpecialtyGrouperOptions {
  /** Below this confidence, set reviewFlag (still may assign best guess). Default 0.72 */
  reviewConfidenceThreshold?: number;
  /** Below this token score, do not assign from token layer. Default 0.42 */
  minimumTokenAssignmentScore?: number;
  /** When true, enqueue to review store when reviewFlag. Default false (caller may enqueue). */
  autoEnqueueReview?: boolean;
  /** Optional merged registry; tests inject without localStorage. */
  userSynonyms?: UserLearnedSynonym[];
}

/** Internal: candidate before confidence / review wrapping */
export interface InternalMatchCandidate {
  specialtyGroup: SpecialtyGroupCanonical;
  canonicalSpecialty: string;
  method: SpecialtyMatchMethod;
  baseConfidence: number;
}
