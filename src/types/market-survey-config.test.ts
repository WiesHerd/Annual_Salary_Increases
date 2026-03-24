import { describe, expect, it } from 'vitest';
import type { MarketSurveySet } from './market-survey-config';
import {
  collectActiveSurveyIds,
  collectSurveyPickerIds,
  sortSurveyIdsByLabel,
} from './market-survey-config';

describe('collectActiveSurveyIds', () => {
  it('includes surveys with market rows and survey ids from provider-type mapping', () => {
    const market: MarketSurveySet = {
      a: [{ specialty: 'X', tccPercentiles: { 50: 1 }, wrvuPercentiles: { 50: 1 } }],
      b: [],
    };
    const mapping = { Physician: 'a', NP: 'c' };
    const got = collectActiveSurveyIds(market, mapping).sort();
    expect(got).toEqual(['a', 'c']);
  });

  it('does not include empty market slots with no mapping', () => {
    const market: MarketSurveySet = { onlyEmpty: [] };
    expect(collectActiveSurveyIds(market, {})).toEqual([]);
  });
});

describe('collectSurveyPickerIds', () => {
  it('includes empty market keys and mapping-only ids', () => {
    const market: MarketSurveySet = { slot1: [] };
    const mapping = { x: 'ghost' };
    const got = collectSurveyPickerIds(market, mapping).sort();
    expect(got).toEqual(['ghost', 'slot1']);
  });
});

describe('sortSurveyIdsByLabel', () => {
  it('orders by display label', () => {
    expect(sortSurveyIdsByLabel(['b', 'a'], { b: { label: 'Zebra' }, a: { label: 'Apple' } })).toEqual(['a', 'b']);
  });
});
