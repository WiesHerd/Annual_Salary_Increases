import { describe, it, expect } from 'vitest';
import type { ExperienceBand } from '../../types/experience-band';
import type { ProviderRecord } from '../../types/provider';
import type { ExperienceBandSurveyContext } from '../../types/market-survey-config';
import {
  findMatchingExperienceBand,
  getExperienceBandAlignment,
  getExperienceBandAlignmentForProvider,
  getExperienceBandLabel,
  getTargetTccRange,
} from './recalculate-provider-row';

const BANDS: ExperienceBand[] = [
  { id: 'b1', label: '0-2 YOE', minYoe: 0, maxYoe: 2, targetTccPercentileLow: 25, targetTccPercentileHigh: 50 },
  { id: 'b2', label: '3-5 YOE', minYoe: 3, maxYoe: 5, targetTccPercentileLow: 50, targetTccPercentileHigh: 75 },
  { id: 'b3', label: '6-10 YOE', minYoe: 6, maxYoe: 10, targetTccPercentileLow: 50, targetTccPercentileHigh: 75 },
  { id: 'b4', label: '11+ YOE', minYoe: 11, maxYoe: 99, targetTccPercentileLow: 75, targetTccPercentileHigh: 90 },
];

describe('getExperienceBandAlignment', () => {
  it('returns undefined when bands are empty', () => {
    expect(getExperienceBandAlignment(5, 60, [])).toBeUndefined();
  });

  it('returns undefined when YOE is undefined or not finite', () => {
    expect(getExperienceBandAlignment(undefined, 60, BANDS)).toBeUndefined();
    expect(getExperienceBandAlignment(NaN, 60, BANDS)).toBeUndefined();
  });

  it('returns undefined when currentTccPercentile is undefined or not finite', () => {
    expect(getExperienceBandAlignment(5, undefined, BANDS)).toBeUndefined();
    expect(getExperienceBandAlignment(5, NaN, BANDS)).toBeUndefined();
  });

  it('returns undefined when YOE does not match any band', () => {
    expect(getExperienceBandAlignment(100, 60, BANDS)).toBeUndefined();
    expect(getExperienceBandAlignment(-1, 60, BANDS)).toBeUndefined();
  });

  it('returns "below" when current percentile is less than band low', () => {
    expect(getExperienceBandAlignment(1, 20, BANDS)).toBe('below'); // 0-2 band: target 25-50
    expect(getExperienceBandAlignment(1, 24.9, BANDS)).toBe('below');
    expect(getExperienceBandAlignment(5, 40, BANDS)).toBe('below'); // 3-5 band: target 50-75
    expect(getExperienceBandAlignment(11, 50, BANDS)).toBe('below'); // 11+ band: target 75-90
  });

  it('returns "in" when current percentile is within band range (inclusive)', () => {
    expect(getExperienceBandAlignment(1, 25, BANDS)).toBe('in');
    expect(getExperienceBandAlignment(1, 50, BANDS)).toBe('in');
    expect(getExperienceBandAlignment(1, 37, BANDS)).toBe('in');
    expect(getExperienceBandAlignment(5, 50, BANDS)).toBe('in');
    expect(getExperienceBandAlignment(5, 75, BANDS)).toBe('in');
    expect(getExperienceBandAlignment(11, 75, BANDS)).toBe('in');
    expect(getExperienceBandAlignment(11, 90, BANDS)).toBe('in');
  });

  it('returns "above" when current percentile is greater than band high', () => {
    expect(getExperienceBandAlignment(1, 51, BANDS)).toBe('above');
    expect(getExperienceBandAlignment(1, 90, BANDS)).toBe('above');
    expect(getExperienceBandAlignment(5, 76, BANDS)).toBe('above');
    expect(getExperienceBandAlignment(11, 91, BANDS)).toBe('above');
  });
});

describe('getExperienceBandLabel', () => {
  it('returns band label for YOE in range', () => {
    expect(getExperienceBandLabel(0, BANDS)).toBe('0-2 YOE');
    expect(getExperienceBandLabel(2, BANDS)).toBe('0-2 YOE');
    expect(getExperienceBandLabel(5, BANDS)).toBe('3-5 YOE');
    expect(getExperienceBandLabel(11, BANDS)).toBe('11+ YOE');
  });

  it('returns "—" when no band or invalid YOE', () => {
    expect(getExperienceBandLabel(undefined, BANDS)).toBe('—');
    expect(getExperienceBandLabel(100, BANDS)).toBe('—');
    expect(getExperienceBandLabel(5, [])).toBe('—');
  });
});

describe('getTargetTccRange', () => {
  it('returns target range string for YOE in band', () => {
    expect(getTargetTccRange(1, BANDS)).toBe('25–50');
    expect(getTargetTccRange(5, BANDS)).toBe('50–75');
    expect(getTargetTccRange(11, BANDS)).toBe('75–90');
  });

  it('returns "—" when no band or invalid YOE', () => {
    expect(getTargetTccRange(undefined, BANDS)).toBe('—');
    expect(getTargetTccRange(100, BANDS)).toBe('—');
    expect(getTargetTccRange(5, [])).toBe('—');
  });
});

describe('findMatchingExperienceBand', () => {
  it('respects provider type scope (narrower bands should be listed first)', () => {
    const bands: typeof BANDS = [
      {
        id: 'app',
        label: 'APP early',
        minYoe: 0,
        maxYoe: 5,
        targetTccPercentileLow: 40,
        targetTccPercentileHigh: 60,
        populationScope: ['NP', 'PA'],
      },
      ...BANDS,
    ];
    const np = {
      Employee_ID: '1',
      Provider_Type: 'NP',
      Years_of_Experience: 10,
      APP_YOE: 3,
    } as ProviderRecord;
    expect(findMatchingExperienceBand(np, bands)?.label).toBe('APP early');

    const md = {
      Employee_ID: '2',
      Provider_Type: 'Physician',
      Years_of_Experience: 3,
    } as ProviderRecord;
    expect(findMatchingExperienceBand(md, bands)?.label).toBe('3-5 YOE');
  });

  it('matches APP combined group name in specialty scope when provider specialty is in providerSpecialties', () => {
    const ctx: ExperienceBandSurveyContext = {
      surveyMappings: {
        apps: {
          appCombinedGroups: [
            {
              id: 'cg-1',
              combinedGroupName: 'Ambulatory APP',
              surveySpecialties: [],
              providerSpecialties: ['Family Practice NP'],
            },
          ],
        },
      },
      providerTypeToSurvey: { NP: 'apps' },
    };
    const bands: ExperienceBand[] = [
      {
        id: 'amb',
        label: 'Amb APP band',
        minYoe: 0,
        maxYoe: 10,
        targetTccPercentileLow: 25,
        targetTccPercentileHigh: 75,
        populationScope: ['NP'],
        specialtyScope: ['Ambulatory APP'],
      },
    ];
    const np: ProviderRecord = {
      Employee_ID: '1',
      Provider_Type: 'NP',
      Specialty: 'Family Practice NP',
      APP_YOE: 2,
    } as ProviderRecord;
    expect(findMatchingExperienceBand(np, bands, ctx)?.label).toBe('Amb APP band');
    expect(findMatchingExperienceBand(np, bands)).toBeUndefined();
  });
});

describe('getExperienceBandAlignmentForProvider', () => {
  it('uses dollar range when configured and TCC at 1 FTE present', () => {
    const bands = [
      {
        id: 'd',
        label: 'D',
        minYoe: 0,
        maxYoe: 10,
        targetTccPercentileLow: 25,
        targetTccPercentileHigh: 75,
        dollarRangeAnchorPercentile: 50,
        dollarRangeMinSpreadPercent: 10,
        dollarRangeMaxSpreadPercent: 10,
      },
    ];
    const record = {
      Employee_ID: '1',
      Provider_Type: 'Physician',
      Years_of_Experience: 2,
      Current_TCC_at_1FTE: 99_000,
      Proposed_TCC_Percentile: 50,
      Market_TCC_50: 100_000,
    } as ProviderRecord;
    expect(getExperienceBandAlignmentForProvider(record, 50, bands)).toBe('in');
  });
});
