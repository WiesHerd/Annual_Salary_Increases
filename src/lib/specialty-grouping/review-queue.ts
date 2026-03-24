/**
 * Review queue: low-confidence / unmatched specialties for admin workflow.
 */

import { migratedStorageGetItem, migratedStorageSetItem } from '../migrated-local-storage';
import type {
  SpecialtyGrouperResult,
  SpecialtyReviewQueueItem,
  SpecialtyGroupCanonical,
  UserLearnedSynonym,
} from './types';
import { appendUserLearnedSynonym, normalizeSynonymKey } from './user-synonym-storage';

const KEY = 'tcc-specialty-grouping-review-queue';

function newId(): string {
  return `sg-review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadReviewQueue(): SpecialtyReviewQueueItem[] {
  try {
    const raw = migratedStorageGetItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isReviewItem);
  } catch {
    return [];
  }
}

function isReviewItem(x: unknown): x is SpecialtyReviewQueueItem {
  if (x == null || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.originalSpecialty === 'string' &&
    typeof o.status === 'string' &&
    typeof o.createdAt === 'string'
  );
}

export function saveReviewQueue(items: SpecialtyReviewQueueItem[]): void {
  migratedStorageSetItem(KEY, JSON.stringify(items));
}

export function enqueueReviewFromResult(result: SpecialtyGrouperResult): SpecialtyReviewQueueItem {
  const cur = loadReviewQueue();
  const existing = cur.find((c) => c.status === 'pending' && c.normalizedInput === result.normalizedInput);
  if (existing) return existing;

  const item: SpecialtyReviewQueueItem = {
    id: newId(),
    originalSpecialty: result.originalSpecialty,
    normalizedInput: result.normalizedInput,
    suggestedSpecialtyGroup: result.assignedSpecialtyGroup,
    suggestedCanonicalSpecialty: result.assignedCanonicalSpecialty,
    confidenceScore: result.confidenceScore,
    matchMethod: result.matchMethod,
    reviewReason: result.reviewReason,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  saveReviewQueue([item, ...cur]);
  return item;
}

export function maybeEnqueueReview(result: SpecialtyGrouperResult, auto: boolean | undefined): void {
  if (!auto || !result.reviewFlag) return;
  enqueueReviewFromResult(result);
}

/** Approve suggestion: persist synonym and close queue item. */
export function approveReviewItem(
  itemId: string,
  canonicalSpecialty: string,
  specialtyGroup: SpecialtyGroupCanonical
): { queue: SpecialtyReviewQueueItem[]; synonyms: UserLearnedSynonym[] } {
  const cur = loadReviewQueue();
  const item = cur.find((c) => c.id === itemId);
  if (!item) {
    return { queue: cur, synonyms: [] };
  }
  const syn = normalizeSynonymKey(item.originalSpecialty);
  const learned = appendUserLearnedSynonym({
    synonymNormalized: syn,
    canonicalSpecialty,
    specialtyGroup,
    sourceReviewItemId: itemId,
    approvedAt: new Date().toISOString(),
  });
  const queue = cur.map((c) =>
    c.id === itemId ? { ...c, status: 'approved' as const } : c
  );
  saveReviewQueue(queue);
  return { queue, synonyms: learned };
}

/** Manually assign without suggested canonical — still learn synonym. */
export function approveReviewItemManual(
  itemId: string,
  specialtyGroup: SpecialtyGroupCanonical,
  canonicalSpecialty: string
): void {
  approveReviewItem(itemId, canonicalSpecialty, specialtyGroup);
}

export function rejectReviewItem(itemId: string): SpecialtyReviewQueueItem[] {
  const cur = loadReviewQueue();
  const queue = cur.map((c) => (c.id === itemId ? { ...c, status: 'rejected' as const } : c));
  saveReviewQueue(queue);
  return queue;
}

export function pendingReviewItems(): SpecialtyReviewQueueItem[] {
  return loadReviewQueue().filter((c) => c.status === 'pending');
}
