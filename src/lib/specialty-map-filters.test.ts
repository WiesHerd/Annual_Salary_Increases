import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SPECIALTY_MAP_FILTERS,
  getSpecialtyMapPresetFilters,
  getActiveSpecialtyMapPresetId,
} from './specialty-map-filters';

describe('specialty map preset filters', () => {
  it('all preset resets to defaults', () => {
    expect(getSpecialtyMapPresetFilters('all')).toEqual(DEFAULT_SPECIALTY_MAP_FILTERS);
  });

  it('matched preset sets both mapped and override statuses', () => {
    expect(getSpecialtyMapPresetFilters('matched')).toEqual({
      statuses: ['mapped', 'override'],
      specialties: [],
      providerTypes: [],
      benchmarkGroups: [],
      matchedMarkets: [],
    });
  });

  it('getActiveSpecialtyMapPresetId detects chip state ignoring search', () => {
    expect(
      getActiveSpecialtyMapPresetId({
        ...DEFAULT_SPECIALTY_MAP_FILTERS,
        searchText: 'foo',
        statuses: [],
      })
    ).toBe('all');
    expect(
      getActiveSpecialtyMapPresetId({
        ...DEFAULT_SPECIALTY_MAP_FILTERS,
        statuses: ['needs-mapping'],
      })
    ).toBe('needs-mapping');
    expect(
      getActiveSpecialtyMapPresetId({
        ...DEFAULT_SPECIALTY_MAP_FILTERS,
        statuses: ['override', 'mapped'],
      })
    ).toBe('matched');
    expect(
      getActiveSpecialtyMapPresetId({
        ...DEFAULT_SPECIALTY_MAP_FILTERS,
        specialties: ['x'],
        statuses: ['mapped', 'override'],
      })
    ).toBeNull();
  });
});
