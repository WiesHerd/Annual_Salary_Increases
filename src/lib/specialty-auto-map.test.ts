import { describe, it, expect } from 'vitest';
import {
  getMatchKey,
  suggestPhysicianMappings,
  suggestAppGroupMappings,
  partitionProvidersByMappingMode,
} from './specialty-auto-map';
import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { AppCombinedGroupRow } from '../types/app-combined-group';

function mkProvider(overrides: Partial<ProviderRecord> & { Employee_ID: string }): ProviderRecord {
  return overrides as ProviderRecord;
}

function mkMarket(specialty: string, tcc50 = 300000): MarketRow {
  return {
    specialty,
    tccPercentiles: { 25: tcc50 * 0.8, 50: tcc50, 75: tcc50 * 1.2, 90: tcc50 * 1.4 },
    wrvuPercentiles: { 25: 4000, 50: 5000, 75: 6000, 90: 7500 },
  };
}

describe('specialty-auto-map', () => {
  describe('getMatchKey', () => {
    it('prefers Market_Specialty_Override', () => {
      const p = mkProvider({
        Employee_ID: '1',
        Market_Specialty_Override: 'Cardiology',
        Specialty: 'IM',
        Benchmark_Group: 'Internal Medicine',
      });
      expect(getMatchKey(p)).toBe('Cardiology');
    });

    it('falls back to Specialty when Override empty', () => {
      const p = mkProvider({ Employee_ID: '1', Specialty: 'Cardiology', Benchmark_Group: 'Card' });
      expect(getMatchKey(p)).toBe('Cardiology');
    });

    it('falls back to Benchmark_Group when both empty', () => {
      const p = mkProvider({ Employee_ID: '1', Benchmark_Group: 'Medical Specialty Combined' });
      expect(getMatchKey(p)).toBe('Medical Specialty Combined');
    });
  });

  describe('suggestPhysicianMappings', () => {
    const marketRows: MarketRow[] = [
      mkMarket('Cardiology'),
      mkMarket('Internal Medicine'),
      mkMarket('Family Medicine'),
    ];

    it('returns empty when all providers already match', () => {
      const providers = [
        mkProvider({ Employee_ID: '1', Specialty: 'Cardiology' }),
        mkProvider({ Employee_ID: '2', Specialty: 'Internal Medicine' }),
      ];
      const result = suggestPhysicianMappings(providers, marketRows, undefined);
      expect(result).toHaveLength(0);
    });

    it('suggests fuzzy match for unmatched provider', () => {
      const providers = [mkProvider({ Employee_ID: '1', Specialty: 'Cardiolgy' })];
      const result = suggestPhysicianMappings(providers, marketRows, undefined, { minConfidence: 0.8 });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].suggestedMarketSpecialty).toBe('Cardiology');
      expect(result[0].confidence).toBeGreaterThan(0.8);
    });

    it('suggests for Internal Med -> Internal Medicine', () => {
      const providers = [mkProvider({ Employee_ID: '1', Specialty: 'Internal Med' })];
      const result = suggestPhysicianMappings(providers, marketRows, undefined, { minConfidence: 0.75 });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].suggestedMarketSpecialty).toBe('Internal Medicine');
    });

    it('respects minConfidence', () => {
      const providers = [mkProvider({ Employee_ID: '1', Specialty: 'XYZ' })];
      const result = suggestPhysicianMappings(providers, marketRows, undefined, { minConfidence: 0.95 });
      expect(result).toHaveLength(0);
    });

    it('includes combined group names as targets', () => {
      const groups: AppCombinedGroupRow[] = [
        { id: '1', combinedGroupName: 'Medical Specialty Combined', surveySpecialties: ['Internal Medicine'] },
      ];
      const providers = [mkProvider({ Employee_ID: '1', Specialty: 'Medical Specialty Combined' })];
      const result = suggestPhysicianMappings(providers, marketRows, groups);
      expect(result).toHaveLength(0);
      const providers2 = [mkProvider({ Employee_ID: '2', Specialty: 'Medical Specialty Comined' })];
      const result2 = suggestPhysicianMappings(providers2, marketRows, groups, { minConfidence: 0.75 });
      expect(result2.length).toBeGreaterThan(0);
      expect(result2[0].suggestedMarketSpecialty).toBe('Medical Specialty Combined');
    });
  });

  describe('suggestAppGroupMappings', () => {
    const marketRows: MarketRow[] = [
      mkMarket('Medical Inpatient'),
      mkMarket('Medical Outpatient'),
    ];
    const groups: AppCombinedGroupRow[] = [
      { id: '1', combinedGroupName: 'Medical Specialty Combined', surveySpecialties: ['Medical Inpatient', 'Medical Outpatient'] },
    ];

    it('suggests mapping for unmatched APP', () => {
      const providers = [mkProvider({ Employee_ID: '1', Provider_Type: 'APP', Specialty: 'Medical Specialty Comined' })];
      const result = suggestAppGroupMappings(providers, marketRows, groups, { minConfidence: 0.75 });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].suggestedTarget).toBe('Medical Specialty Combined');
      expect(result[0].suggestedTargetType).toBe('combined');
    });
  });

  describe('partitionProvidersByMappingMode', () => {
    it('splits physician and app types', () => {
      const providers = [
        mkProvider({ Employee_ID: '1', Provider_Type: 'Physician' }),
        mkProvider({ Employee_ID: '2', Provider_Type: 'APP' }),
        mkProvider({ Employee_ID: '3', Provider_Type: 'NP' }),
      ];
      const { physicians, apps } = partitionProvidersByMappingMode(providers);
      expect(physicians).toHaveLength(1);
      expect(physicians[0].Employee_ID).toBe('1');
      expect(apps).toHaveLength(2);
    });
  });
});
