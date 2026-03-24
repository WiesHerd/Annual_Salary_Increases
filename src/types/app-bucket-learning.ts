/**
 * Learned APP market specialty → bucket assignments (survives new uploads / next cycle).
 */

export type AppBucketLearnedStoreV1 = {
  version: 1;
  /** Normalized market specialty string → last known bucket + label */
  bySpecialtyKey: Record<string, AppBucketLearnedEntry>;
};

export interface AppBucketLearnedEntry {
  /** Stable `AppCombinedGroupRow.id` so renames don’t break memory. */
  bucketId: string;
  /** Last specialty text from file when user saved (audit / export). */
  lastSpecialtyLabel: string;
  updatedAt: string;
}
