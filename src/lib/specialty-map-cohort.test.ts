import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import type { ProviderTypeToSurveyMapping } from '../types/market-survey-config';
import {
  getProvidersForSpecialtyMapTab,
  resolveSpecialtyMapMarketSurveyId,
  SPECIALTY_MAP_APPS_TAB_SURVEY_ID,
} from './specialty-map-cohort';
import { getSurveyIdForProvider } from './joins';

function row(id: string, providerType: string): ProviderRecord {
  return {
    Employee_ID: id,
    Provider_Type: providerType,
  } as ProviderRecord;
}

describe('resolveSpecialtyMapMarketSurveyId', () => {
  it('uses apps survey id for APP tab', () => {
    expect(resolveSpecialtyMapMarketSurveyId('apps')).toBe('apps');
  });

  it('passes through other survey ids', () => {
    expect(resolveSpecialtyMapMarketSurveyId('physicians')).toBe('physicians');
    expect(resolveSpecialtyMapMarketSurveyId('mental-health-therapists')).toBe('mental-health-therapists');
  });
});

describe('getProvidersForSpecialtyMapTab', () => {
  const mapping: ProviderTypeToSurveyMapping = {
    Physician: 'physicians',
    NP: 'apps',
    PA: 'apps',
    'Mental Health Therapist': 'mental-health-therapists',
  };

  const records = [
    row('1', 'Physician'),
    row('2', 'NP'),
    row('3', 'PA'),
    row('4', 'Mental Health Therapist'),
  ];

  it('physicians tab lists only types mapped to physicians', () => {
    const got = getProvidersForSpecialtyMapTab(records, 'physicians', mapping);
    expect(got.map((p) => p.Employee_ID)).toEqual(['1']);
  });

  it('mental-health tab lists only MHT survey types', () => {
    const got = getProvidersForSpecialtyMapTab(records, 'mental-health-therapists', mapping);
    expect(got.map((p) => p.Employee_ID)).toEqual(['4']);
  });

  it('APP tab lists only APP-partition rows whose survey is apps', () => {
    const got = getProvidersForSpecialtyMapTab(records, SPECIALTY_MAP_APPS_TAB_SURVEY_ID, mapping);
    expect(got.map((p) => p.Employee_ID).sort()).toEqual(['2', '3']);
    for (const p of got) {
      expect(getSurveyIdForProvider(p, mapping)).toBe('apps');
    }
  });

  it('defaults unmapped types to physicians tab via DEFAULT_SURVEY_ID', () => {
    const withUnknown = [...records, row('5', 'New Role')];
    const phys = getProvidersForSpecialtyMapTab(withUnknown, 'physicians', mapping);
    expect(phys.some((p) => p.Employee_ID === '5')).toBe(true);
    const appsTab = getProvidersForSpecialtyMapTab(withUnknown, SPECIALTY_MAP_APPS_TAB_SURVEY_ID, mapping);
    expect(appsTab.some((p) => p.Employee_ID === '5')).toBe(false);
  });
});
