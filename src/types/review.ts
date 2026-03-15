/**
 * Canonical review record interfaces.
 * Single source of truth for a provider's comp review in a cycle.
 */

import type { Population, CompensationPlanType, ReviewStatus } from './enums';

/** Stable provider identity within the system. */
export interface ProviderId {
  /** Optional external/system id; may be from upload. */
  externalId?: string;
  /** Internal stable id (e.g. UUID) once normalized. */
  id: string;
}

/** Market positioning for TCC and/or wRVU. */
export interface MarketPosition {
  tccPercentile?: number;
  wrvuPercentile?: number;
  /** Which benchmark/survey and effective date. */
  benchmarkId?: string;
  asOfDate?: string; // ISO date
}

/** One scenario result attached to a review (e.g. recommended comp, risk). */
export interface ReviewScenarioResult {
  scenarioId: string;
  scenarioLabel?: string;
  /** Recommended TCC from model. */
  recommendedTcc?: number;
  /** Recommended wRVU target if applicable. */
  recommendedWrvu?: number;
  /** Risk or FMV flag from governance. */
  riskLevel?: string;
  fmvCheckSuggested?: boolean;
  /** Percentiles used for this result. */
  marketPosition?: MarketPosition;
}

/** Canonical review record: one row per provider per review cycle. */
export interface ReviewRecord {
  /** Provider identity. */
  providerId: ProviderId;
  /** Display name (e.g. from upload). */
  name?: string;
  /** Specialty code or label (e.g. for market match). */
  specialty: string;
  /** Provider type for plan assignment and reporting. */
  population: Population;
  /** Assigned compensation plan type. */
  planType: CompensationPlanType;
  /** Current TCC (total cash compensation). */
  currentTcc: number;
  /** Current wRVU (productivity), if applicable. */
  currentWrvu?: number;
  /** FTE (0–1 or equivalent). */
  fte: number;
  /** Review cycle identifier (e.g. "FY2025"). */
  cycleId: string;
  /** Status in the workflow. */
  status: ReviewStatus;
  /** Effective date of changes (ISO date). */
  effectiveDate?: string;
  /** Market positioning from benchmark match. */
  marketPosition?: MarketPosition;
  /** One or more scenario results (e.g. default, optimizer). */
  scenarioResults?: ReviewScenarioResult[];
  /** Optional metadata (non-PII); extensible. */
  metadata?: Record<string, unknown>;
  /** Timestamps for audit. */
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}
