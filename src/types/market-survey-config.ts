/**
 * Multi-survey configuration: survey IDs, Provider_Type mapping, per-survey specialty mapping.
 */

import type { ProviderRecord } from './provider';
import type { AppCombinedGroupRow } from './app-combined-group';
import type { MarketRow } from './market';

/** Multiple market surveys keyed by survey ID. */
export type MarketSurveySet = Record<string, MarketRow[]>;

/** Survey ID to display label. Built-in surveys; custom labels from survey metadata. */
export const SURVEY_LABELS: Record<string, string> = {
  physicians: 'Physicians',
  'mental-health-therapists': 'Mental Health Therapists',
  apps: 'APPs',
};

/** Custom survey metadata (id -> { label }). */
export type SurveyMetadata = Record<string, { label: string }>;

/** Get display label for a survey ID; uses SURVEY_LABELS or custom metadata. */
export function getSurveyLabel(id: string, customMetadata?: SurveyMetadata): string {
  return SURVEY_LABELS[id] ?? customMetadata?.[id]?.label ?? id;
}

/** Default survey ID for unmapped Provider_Types. */
export const DEFAULT_SURVEY_ID = 'physicians';

/** Per-survey specialty mapping (survey map buckets / combined groups for that survey). */
export interface SurveySpecialtyMapping {
  appCombinedGroups: AppCombinedGroupRow[];
}

/** Per-survey mapping config. */
export type SurveySpecialtyMappingSet = Record<string, SurveySpecialtyMapping>;

/** Provider_Type → survey ID mapping. */
export type ProviderTypeToSurveyMapping = Record<string, string>;

/**
 * Surveys that should appear as Specialty map tabs: has at least one market row, or at least
 * one provider type is routed here. Does not invent built-in slots the org does not use.
 */
export function collectActiveSurveyIds(
  marketSurveys: MarketSurveySet,
  providerTypeToSurvey: ProviderTypeToSurveyMapping
): string[] {
  const ids = new Set<string>();
  for (const [key, rows] of Object.entries(marketSurveys)) {
    const k = key.trim();
    if (!k) continue;
    if ((rows?.length ?? 0) > 0) ids.add(k);
  }
  for (const sid of Object.values(providerTypeToSurvey)) {
    const s = String(sid ?? '').trim();
    if (s) ids.add(s);
  }
  return [...ids];
}

/**
 * Survey ids for pickers (Import, Parameters): every market slot key plus any survey id referenced
 * in routing (e.g. mapping points to a survey before a slot is created).
 */
export function collectSurveyPickerIds(
  marketSurveys: MarketSurveySet,
  providerTypeToSurvey: ProviderTypeToSurveyMapping
): string[] {
  const ids = new Set<string>();
  for (const key of Object.keys(marketSurveys)) {
    const k = key.trim();
    if (k) ids.add(k);
  }
  for (const sid of Object.values(providerTypeToSurvey)) {
    const s = String(sid ?? '').trim();
    if (s) ids.add(s);
  }
  return [...ids];
}

/** Stable ordering for UI segments (Import, Specialty map, Data → Market). */
export function sortSurveyIdsByLabel(ids: string[], surveyMetadata?: SurveyMetadata): string[] {
  return [...ids].sort((a, b) =>
    getSurveyLabel(a, surveyMetadata).localeCompare(getSurveyLabel(b, surveyMetadata), undefined, {
      sensitivity: 'base',
      numeric: true,
    })
  );
}

/**
 * Survey mapping + provider-type routing for experience-band cohort matching.
 * When set, a band's specialty scope can use survey map bucket names from Data → Specialty map.
 */
export type ExperienceBandSurveyContext = {
  surveyMappings: SurveySpecialtyMappingSet;
  providerTypeToSurvey: ProviderTypeToSurveyMapping;
};

/** Per-provider market lookup: (provider, specialtyKey) => MarketRow. Uses Provider_Type to pick survey. */
export type MarketResolver = (provider: ProviderRecord, key: string) => MarketRow | undefined;
