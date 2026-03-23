import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { getEffectiveYoe, isAdvancedPracticeProviderType } from './effective-yoe';

function rec(overrides: Partial<ProviderRecord>): ProviderRecord {
  return { Employee_ID: '1', ...overrides } as ProviderRecord;
}

describe('isAdvancedPracticeProviderType', () => {
  it('recognizes common APP types', () => {
    expect(isAdvancedPracticeProviderType('NP')).toBe(true);
    expect(isAdvancedPracticeProviderType('PA')).toBe(true);
    expect(isAdvancedPracticeProviderType('APP')).toBe(true);
    expect(isAdvancedPracticeProviderType('Physician')).toBe(false);
  });
});

describe('getEffectiveYoe', () => {
  it('prefers APP_YOE for APP provider types when set', () => {
    expect(
      getEffectiveYoe(
        rec({ Provider_Type: 'NP', APP_YOE: 2, Years_of_Experience: 10, Total_YOE: 10 })
      )
    ).toBe(2);
  });

  it('falls back to Years_of_Experience for APP when APP_YOE missing', () => {
    expect(getEffectiveYoe(rec({ Provider_Type: 'PA', Years_of_Experience: 7 }))).toBe(7);
  });

  it('ignores APP_YOE for physicians', () => {
    expect(
      getEffectiveYoe(
        rec({ Provider_Type: 'Physician', APP_YOE: 2, Years_of_Experience: 15 })
      )
    ).toBe(15);
  });

  it('uses Total_YOE when Years_of_Experience missing', () => {
    expect(getEffectiveYoe(rec({ Provider_Type: 'Physician', Total_YOE: 9 }))).toBe(9);
  });
});
