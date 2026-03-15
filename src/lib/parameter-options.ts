/**
 * Derive dropdown options for Parameters screens from uploaded provider and market data.
 * Used so APP Benchmark Mapping, Plan Assignment, PCP APP, and PCP Tier tabs can
 * constrain inputs to values that exist in data and avoid typos/no-match.
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';

const SURVEY_SOURCE_FIXED = ['MGMA', 'AMGA', 'SullivanCotter'];

/** Fallback provider types when no data is loaded—used so policy target scope always has dropdown options (no free text). */
export const DEFAULT_PROVIDER_TYPES = ['Physician', 'APP', 'NP', 'PA', 'Staff Physician', 'Division Chief', 'Mental Health Therapist'];

function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()))].sort();
}

export interface ParameterOptions {
  divisions: string[];
  departments: string[];
  jobCodes: string[];
  specialties: string[];
  benchmarkGroups: string[];
  providerTypes: string[];
  tierNames: string[];
  marketSpecialties: string[];
  surveySources: string[];
}

export function buildParameterOptions(records: ProviderRecord[], marketRows: MarketRow[]): ParameterOptions {
  const divisions = uniqueSorted(records.map((r) => r.Primary_Division));
  const departments = uniqueSorted(records.map((r) => r.Department));
  const jobCodes = uniqueSorted(records.map((r) => r.Job_Code));
  const specialties = uniqueSorted(records.map((r) => r.Specialty));
  const benchmarkGroupsFromProviders = uniqueSorted(records.map((r) => r.Benchmark_Group));
  const providerTypesFromData = uniqueSorted(records.map((r) => r.Provider_Type));
  const providerTypes = providerTypesFromData.length > 0 ? providerTypesFromData : DEFAULT_PROVIDER_TYPES;
  const tierNames = uniqueSorted(
    records.flatMap((r) => [r.Current_Tier, r.Proposed_Tier, r.Tier_Override].filter(Boolean) as string[])
  );
  const marketSpecialties = marketRows.map((r) => r.specialty.trim()).filter(Boolean);
  const marketLabels = uniqueSorted(marketRows.map((r) => r.label));
  const surveySources = uniqueSorted([...SURVEY_SOURCE_FIXED, ...marketLabels]);

  const benchmarkGroups = uniqueSorted([...benchmarkGroupsFromProviders, ...marketSpecialties]);

  return {
    divisions,
    departments,
    jobCodes,
    specialties,
    benchmarkGroups,
    providerTypes,
    tierNames,
    marketSpecialties,
    surveySources,
  };
}
