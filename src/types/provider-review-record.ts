/**
 * Full canonical provider review record for the review workspace.
 * One per provider per cycle. Built from merged uploads + normalization + engines.
 * Extends ReviewRecord with all fields needed for review, TCC breakdown, and explainability.
 */

import type { ReviewRecord } from './review';
import type { ExperienceBand } from './experience-band';

/** TCC component line item for transparency. */
export interface TccComponent {
  label: string;
  amount: number;
  /** Optional key for grouping (e.g. 'base' | 'productivity' | 'teaching'). */
  key?: string;
}

/** Experience band positioning for the provider. */
export interface ExperienceBandPosition {
  band: ExperienceBand;
  /** Current TCC percentile. */
  currentTccPercentile?: number;
  /** Proposed TCC percentile. */
  proposedTccPercentile?: number;
  /** 'below' | 'in' | 'above' target range. */
  positioning: 'below' | 'in' | 'above';
}

/**
 * Full provider review record used in review workspace and calculations.
 * Preserves raw and normalized values where relevant.
 */
export interface ProviderReviewRecord extends ReviewRecord {
  // ─── Experience & FTE (normalized) ─────────────────────────────────────
  yearsOfExperience?: number;
  clinicalFte?: number;
  percentOfYearEmployed?: number;

  // ─── Current compensation detail ──────────────────────────────────────
  currentBaseSalary?: number;
  currentSalaryAt1Fte?: number;
  currentTccAt1Fte?: number;
  /** Breakdown of current TCC. */
  currentTccBreakdown?: TccComponent[];

  // ─── Proposed compensation ─────────────────────────────────────────────
  proposedBaseSalary?: number;
  proposedSalaryAt1Fte?: number;
  proposedTccAt1Fte?: number;
  proposedTccBreakdown?: TccComponent[];

  // ─── Productivity (raw + normalized) ───────────────────────────────────
  priorYearWrvu?: number;
  normalizedWrvu?: number;
  wrvuPercentile?: number;

  // ─── Merit / evaluation ───────────────────────────────────────────────
  evaluationScore?: number;
  performanceCategory?: string;
  defaultIncreasePercent?: number;
  appliedIncreasePercent?: number;
  appliedIncreaseAmount?: number;

  // ─── Market & alignment ───────────────────────────────────────────────
  estimatedTccFromWrvuPercentile?: number;
  payGap?: number;
  tccWrvuGap?: number;

  // ─── Experience band guidance ──────────────────────────────────────────
  experienceBandPosition?: ExperienceBandPosition;

  // ─── Plan-specific (tier, CF, etc.) ───────────────────────────────────
  planTemplateId?: string;
  /** e.g. tier label, CF value — for display. */
  planContext?: Record<string, unknown>;

  // ─── Review workflow ──────────────────────────────────────────────────
  notes?: string;
  adjustmentRationale?: string;
  reviewer?: string;
  reviewDate?: string;
}
