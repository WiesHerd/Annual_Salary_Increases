/**
 * Flattened plan assignment rule for Parameters UI grid.
 * One row = one rule; maps to PlanAssignmentRule when evaluating.
 */

import type { CompensationPlanType } from './enums';

export interface PlanAssignmentRuleRow {
  id: string;
  population?: string;
  division?: string;
  department?: string;
  jobCode?: string;
  benchmarkGroup?: string;
  assignedPlanType: CompensationPlanType;
  priority: number;
}
