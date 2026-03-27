import { describe, expect, it } from 'vitest';
import {
  parseProviderRecordsFromStorage,
  parseCyclesFromStorage,
  parseMarketSurveySetFromStorage,
} from './persisted-data';

describe('parseProviderRecordsFromStorage', () => {
  it('accepts rows with Employee_ID and passes through extra fields', () => {
    const rows = parseProviderRecordsFromStorage([
      { Employee_ID: '1', Provider_Name: 'A', Current_TCC: 100 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.Employee_ID).toBe('1');
    expect(rows[0]?.Provider_Name).toBe('A');
  });

  it('drops rows missing Employee_ID', () => {
    expect(parseProviderRecordsFromStorage([{ Provider_Name: 'x' }])).toHaveLength(0);
    expect(parseProviderRecordsFromStorage('bad')).toHaveLength(0);
  });
});

describe('parseCyclesFromStorage', () => {
  it('validates id and label', () => {
    expect(parseCyclesFromStorage([{ id: 'FY26', label: 'FY2026' }])?.[0]?.id).toBe('FY26');
    expect(parseCyclesFromStorage([{ id: '', label: 'x' }])).toBeNull();
    expect(parseCyclesFromStorage(null)).toBeNull();
  });
});

describe('parseMarketSurveySetFromStorage', () => {
  it('accepts survey id to array of market rows with specialty', () => {
    const set = parseMarketSurveySetFromStorage({
      physicians: [{ specialty: 'Cardiology', tccPercentiles: { 50: 300 }, wrvuPercentiles: { 50: 4000 } }],
    });
    expect(set?.physicians).toHaveLength(1);
    expect(set?.physicians?.[0]?.specialty).toBe('Cardiology');
  });
});
