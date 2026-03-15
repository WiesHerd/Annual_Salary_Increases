/**
 * Plan assignment rule interfaces.
 * Configuration-driven rules to assign compensation plan type by provider attributes.
 */

import type { CompensationPlanType } from './enums';

/** Operator for a single condition (configuration-driven). */
export type RuleOperator =
  | 'equals'
  | 'in'
  | 'notIn'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'range'
  | string;

/** A single condition: field, operator, value(s). */
export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

/** One rule: priority, conditions (all must match), resulting plan. */
export interface PlanAssignmentRule {
  id: string;
  /** Lower number = higher priority; first match wins. */
  priority: number;
  conditions: RuleCondition[];
  planType: CompensationPlanType;
  /** Optional named plan id when multiple plans exist per type. */
  planId?: string;
}

/** Result of evaluating plan assignment for a provider. */
export interface PlanAssignmentResult {
  /** Provider key (e.g. providerId.id or externalId). */
  providerKey: string;
  planType: CompensationPlanType;
  planId?: string;
  /** Rule id that produced this result. */
  ruleId?: string;
}
