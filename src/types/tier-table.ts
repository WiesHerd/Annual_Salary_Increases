/**
 * Tier table for custom compensation models (e.g. YOE-based increase tiers).
 * Used by custom models to assign base increase % by tier.
 */

export interface TierRow {
  /** Min YOE (inclusive). */
  minYoe: number;
  /** Max YOE (inclusive). Use a large number for "open-ended" (e.g. 999). */
  maxYoe: number;
  /** Display label (e.g. "Tier 1", "0-2 YOE"). */
  label: string;
  /** Default increase percent for this tier. */
  increasePercent: number;
  notes?: string;
}

export interface TierTable {
  id: string;
  name: string;
  version?: string;
  /** Tier rows ordered by minYoe (low to high). */
  tiers: TierRow[];
  active?: boolean;
}
