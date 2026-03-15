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

/** Per-survey specialty mapping (APP combined groups for that survey). */
export interface SurveySpecialtyMapping {
  appCombinedGroups: AppCombinedGroupRow[];
}

/** Per-survey mapping config. */
export type SurveySpecialtyMappingSet = Record<string, SurveySpecialtyMapping>;

/** Provider_Type → survey ID mapping. */
export type ProviderTypeToSurveyMapping = Record<string, string>;

/** Per-provider market lookup: (provider, specialtyKey) => MarketRow. Uses Provider_Type to pick survey. */
export type MarketResolver = (provider: ProviderRecord, key: string) => MarketRow | undefined;
