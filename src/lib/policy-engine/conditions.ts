/**
 * Evaluate JsonLogic condition tree against facts.
 * Thin wrapper around json-logic-js so business logic is not coupled to the library.
 */

import type { ConditionTree } from '../../types/compensation-policy';
import type { PolicyFacts } from './facts';

// Default import for UMD bundle
import jsonLogic from 'json-logic-js';

/**
 * Convert PolicyFacts to a plain object suitable for JsonLogic var lookups.
 * JsonLogic uses { "var": "fieldName" } so keys must match fact keys.
 */
export function factsToData(facts: PolicyFacts): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(facts)) {
    if (v !== undefined) data[k] = v;
  }
  return data;
}

/**
 * Evaluate condition tree against facts. Returns true if conditions match (or tree is empty).
 */
export function evaluateConditions(conditions: ConditionTree | undefined, facts: PolicyFacts): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  try {
    const data = factsToData(facts);
    const result = jsonLogic.apply(conditions, data);
    return jsonLogic.truthy(result);
  } catch {
    return false;
  }
}
