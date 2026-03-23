/**
 * Pure helpers for which providers belong on each Specialty map survey tab.
 * Must stay aligned with mergeMarketIntoProvidersMulti (getSurveyIdForProvider).
 */

import type { ProviderRecord } from '../types/provider';
import type { ProviderTypeToSurveyMapping } from '../types/market-survey-config';
import { getSurveyIdForProvider } from './joins';
import { partitionProvidersByMappingMode } from './specialty-auto-map';

export const SPECIALTY_MAP_APPS_TAB_SURVEY_ID = 'apps' as const;

/** Market survey id used for rows + combined groups for the selected top-level tab. */
export function resolveSpecialtyMapMarketSurveyId(selectedSurveyId: string): string {
  return selectedSurveyId === SPECIALTY_MAP_APPS_TAB_SURVEY_ID
    ? SPECIALTY_MAP_APPS_TAB_SURVEY_ID
    : selectedSurveyId;
}

/**
 * Providers shown for the selected Specialty map tab (before UI filters).
 * APP tab: types mapped to survey `apps`, APP partition only.
 */
export function getProvidersForSpecialtyMapTab(
  records: ProviderRecord[],
  selectedSurveyId: string,
  providerTypeToSurvey: ProviderTypeToSurveyMapping
): ProviderRecord[] {
  if (selectedSurveyId === SPECIALTY_MAP_APPS_TAB_SURVEY_ID) {
    const routedToApps = records.filter(
      (p) => getSurveyIdForProvider(p, providerTypeToSurvey) === SPECIALTY_MAP_APPS_TAB_SURVEY_ID
    );
    return partitionProvidersByMappingMode(routedToApps).apps;
  }
  return records.filter((p) => getSurveyIdForProvider(p, providerTypeToSurvey) === selectedSurveyId);
}
