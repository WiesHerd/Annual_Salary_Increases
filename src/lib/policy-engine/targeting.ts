/**
 * Match policy target scope against provider facts.
 */

import type { PolicyTargetScope } from '../../types/compensation-policy';
import type { PolicyFacts } from './facts';

function inList(value: string | undefined, list: string[] | undefined): boolean {
  if (!list || list.length === 0) return true;
  if (value == null || value === '') return false;
  const v = value.toString().trim().toLowerCase();
  return list.some((s) => s.toString().trim().toLowerCase() === v);
}

function inListPartial(value: string | undefined, list: string[] | undefined): boolean {
  if (!list || list.length === 0) return true;
  if (value == null || value === '') return false;
  const v = value.toString().trim().toLowerCase();
  return list.some((s) => v.includes(s.toString().trim().toLowerCase()) || s.toString().trim().toLowerCase().includes(v));
}

/**
 * Return true if the provider (facts) is in the policy target scope.
 * Empty scope = applies to all. Excluded list wins over included.
 */
export function matchesTargetScope(scope: PolicyTargetScope, facts: PolicyFacts): boolean {
  if (scope.excludedProviderIds?.length && scope.excludedProviderIds.includes(facts.employeeId)) return false;
  if (scope.providerIds?.length && !scope.providerIds.includes(facts.employeeId)) return false;

  if (scope.providerTypes?.length && !inList(facts.providerType, scope.providerTypes) && !inList(facts.providerTypeLower, scope.providerTypes)) return false;
  if (scope.specialties?.length && !inList(facts.specialty, scope.specialties) && !inList(facts.specialtyLower, scope.specialties) && !inListPartial(facts.specialty, scope.specialties)) return false;
  if (scope.subspecialties?.length && !inList(facts.subspecialty, scope.subspecialties)) return false;
  // Division: when provider has no division data, pass — specialty match is sufficient (avoids blocking when CSV lacks division column)
  if (scope.divisions?.length) {
    const hasDivision = facts.division != null && String(facts.division).trim() !== '';
    if (hasDivision && !inList(facts.division, scope.divisions) && !inList(facts.divisionLower, scope.divisions)) return false;
  }
  if (scope.departments?.length && !inList(facts.department, scope.departments)) return false;
  if (scope.locations?.length && !inList(facts.location, scope.locations)) return false;
  if (scope.compensationPlanTypes?.length && !inList(facts.compensationPlan, scope.compensationPlanTypes)) return false;
  // Tags not on ProviderRecord today; ignore tag filter until provider records support tags (do not exclude)

  if (scope.yoeMin != null && Number.isFinite(scope.yoeMin) && (facts.yoe == null || facts.yoe < scope.yoeMin)) return false;
  if (scope.yoeMax != null && Number.isFinite(scope.yoeMax) && (facts.yoe == null || facts.yoe > scope.yoeMax)) return false;
  if (scope.tccPercentileMin != null && Number.isFinite(scope.tccPercentileMin) && (facts.tccPercentile == null || facts.tccPercentile < scope.tccPercentileMin)) return false;
  if (scope.tccPercentileMax != null && Number.isFinite(scope.tccPercentileMax) && (facts.tccPercentile == null || facts.tccPercentile > scope.tccPercentileMax)) return false;
  if (scope.wrvuPercentileMin != null && Number.isFinite(scope.wrvuPercentileMin) && (facts.wrvuPercentile == null || facts.wrvuPercentile < scope.wrvuPercentileMin)) return false;
  if (scope.wrvuPercentileMax != null && Number.isFinite(scope.wrvuPercentileMax) && (facts.wrvuPercentile == null || facts.wrvuPercentile > scope.wrvuPercentileMax)) return false;

  return true;
}
