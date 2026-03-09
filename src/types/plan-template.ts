/**
 * Compensation plan template configuration.
 * Defines how proposed comp is calculated (tiers, CF, merit ref) without hardcoding in UI.
 */

import type { CompensationPlanType } from './enums';

/** Template type determines which engine computes recommended increase. */
export type PlanTemplateKind =
  | 'standard_merit'
  | 'pcp_physician_tier'
  | 'pcp_app_cf'
  | 'mht_market'
  | string;

export interface PlanTemplate {
  id: string;
  label: string;
  planType: CompensationPlanType;
  /** Which calculation logic to use. */
  kind: PlanTemplateKind;
  /** Optional ref to merit matrix id for default increase. */
  meritMatrixId?: string;
  /** Plan-specific config (e.g. tier schedule, fixed target, CF). Stored as JSON. */
  config?: Record<string, unknown>;
  /** Optional scope. */
  populationScope?: string[];
  specialtyScope?: string[];
}
