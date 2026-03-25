import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseMarketCsv, parsePaymentCsv } from './parse-file';
import { exportCompareScenariosToXlsx } from './compare-scenarios-export';
import type { MarketColumnMapping, PaymentColumnMapping } from '../types/upload';
import type { ProviderRecord } from '../types/provider';
import type { PolicyEvaluationResult } from '../types/compensation-policy';
import type { ScenarioDerivedResult, ScenarioRunResult } from '../types/scenario';

describe('parse-file (market + payments)', () => {
  it('treats blank percentile cells as missing (not 0) while keeping true 0', () => {
    const mapping: MarketColumnMapping = {
      specialty: 'specialty',
      TCC_25: 'TCC_25',
      TCC_50: 'TCC_50',
      TCC_75: 'TCC_75',
      TCC_90: 'TCC_90',
      WRVU_25: 'WRVU_25',
      WRVU_50: 'WRVU_50',
      WRVU_75: 'WRVU_75',
      WRVU_90: 'WRVU_90',
      CF_25: 'CF_25',
      CF_50: 'CF_50',
      CF_75: 'CF_75',
      CF_90: 'CF_90',
    };

    const csv = [
      'specialty,TCC_25,TCC_50,TCC_75,TCC_90,WRVU_25,WRVU_50,WRVU_75,WRVU_90,CF_25,CF_50,CF_75,CF_90',
      // TCC_25 is true 0; TCC_50 blank should not become 0.
      'Cardiology,0,,300,400,10,20,30,40,5,,7,8',
    ].join('\n');

    const result = parseMarketCsv(csv, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.tccPercentiles[25]).toBe(0);
    expect(row.tccPercentiles[50]).toBeUndefined();
    expect(row.wrvuPercentiles[25]).toBe(10);
    expect(row.cfPercentiles?.[50]).toBeUndefined();
  });

  it('treats common N/A / --- sentinel values as missing (not invalid)', () => {
    const mapping: MarketColumnMapping = {
      specialty: 'specialty',
      TCC_25: 'TCC_25',
      TCC_50: 'TCC_50',
      TCC_75: 'TCC_75',
      TCC_90: 'TCC_90',
      WRVU_25: 'WRVU_25',
      WRVU_50: 'WRVU_50',
      WRVU_75: 'WRVU_75',
      WRVU_90: 'WRVU_90',
      CF_25: 'CF_25',
      CF_50: 'CF_50',
      CF_75: 'CF_75',
      CF_90: 'CF_90',
    };

    const csv = [
      'specialty,TCC_25,TCC_50,TCC_75,TCC_90,WRVU_25,WRVU_50,WRVU_75,WRVU_90,CF_25,CF_50,CF_75,CF_90',
      // Use sentinel values for missing cells.
      'Cardiology,0,N/A,---,400,10,20,---,40,5,N/A,7,---',
    ].join('\n');

    const result = parseMarketCsv(csv, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const row = result.rows[0];
    expect(row.tccPercentiles[25]).toBe(0);
    expect(row.tccPercentiles[50]).toBeUndefined();
    expect(row.tccPercentiles[75]).toBeUndefined();
    expect(row.tccPercentiles[90]).toBe(400);

    expect(row.wrvuPercentiles[50]).toBe(20);
    expect(row.wrvuPercentiles[75]).toBeUndefined();

    expect(row.cfPercentiles?.[50]).toBeUndefined();
    expect(row.cfPercentiles?.[90]).toBeUndefined();
  });

  it('reports invalid numeric percentile cells and skips them', () => {
    const mapping: MarketColumnMapping = {
      specialty: 'specialty',
      TCC_25: 'TCC_25',
      TCC_50: 'TCC_50',
      TCC_75: 'TCC_75',
      TCC_90: 'TCC_90',
      WRVU_25: 'WRVU_25',
      WRVU_50: 'WRVU_50',
      WRVU_75: 'WRVU_75',
      WRVU_90: 'WRVU_90',
    };

    const csv = [
      'specialty,TCC_25,TCC_50,TCC_75,TCC_90,WRVU_25,WRVU_50,WRVU_75,WRVU_90',
      'Cardiology,100,200,abc,400,10,20,30,40',
    ].join('\n');

    const result = parseMarketCsv(csv, mapping);
    expect(result.errors.some((e) => e.includes('invalid TCC_75'))).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tccPercentiles[75]).toBeUndefined();
  });

  it('drops payment rows missing required fields (providerKey/date/amount)', () => {
    const mapping: PaymentColumnMapping = {
      providerKey: 'providerKey',
      amount: 'amount',
      date: 'date',
      category: 'category',
      cycleId: 'cycleId',
    };

    const csv = [
      'providerKey,amount,date,category,cycleId',
      // missing providerKey
      ',100,2020-01-01,cat1,2025',
      // missing amount
      'ABC,,2020-01-01,cat1,2025',
      // missing date
      'ABC,50,,cat1,2025',
      // valid row with true 0 amount
      'ABC,0,2020-01-01,cat1,2025',
    ].join('\n');

    const result = parsePaymentCsv(csv, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      providerKey: 'ABC',
      amount: 0,
      date: '2020-01-01',
      category: 'cat1',
      cycleId: '2025',
    });
    expect(result.errors).toHaveLength(3);
  });
});

describe('compare-scenarios export', () => {
  function makePolicyEvaluation(opts: Partial<PolicyEvaluationResult> & { providerId: string }): PolicyEvaluationResult {
    return {
      providerId: opts.providerId,
      matchedPolicies: [],
      appliedPolicies: [],
      skippedPolicies: [],
      overriddenPolicies: [],
      finalPolicySource: opts.finalPolicySource ?? 'policy-source',
      finalModelType: opts.finalModelType ?? 'model-type',
      finalRecommendedIncreasePercent: opts.finalRecommendedIncreasePercent ?? 5,
      proposedBaseSalary: opts.proposedBaseSalary,
      tierAssigned: opts.tierAssigned,
      manualReview: opts.manualReview ?? false,
      blocked: opts.blocked,
      explanation: opts.explanation ?? ['test'],
      warnings: opts.warnings,
    };
  }

  it('writes blanks instead of 0 when scenario results are missing for a provider id', () => {
    const records: ProviderRecord[] = [
      { Employee_ID: '1', Provider_Name: 'P1', Specialty: 'Spec', Primary_Division: 'Div', Population: 'Pop' },
      { Employee_ID: '2', Provider_Name: 'P2', Specialty: 'Spec', Primary_Division: 'Div', Population: 'Pop' },
    ];

    const eval1 = makePolicyEvaluation({ providerId: '1', finalRecommendedIncreasePercent: 10, finalPolicySource: 'A' });
    const eval2 = makePolicyEvaluation({ providerId: '1', finalRecommendedIncreasePercent: 20, finalPolicySource: 'B' });

    const derived1: ScenarioDerivedResult = { proposedBase: 100, proposedTcc: 200, increaseDollars: 25 };

    const resultA: ScenarioRunResult = {
      scenarioId: 'a',
      scenarioLabel: 'A',
      evaluationResults: new Map([['1', eval1]]),
      derivedResults: new Map([['1', derived1]]),
      summary: { totalIncreaseDollars: 25, providerCount: 2, zeroedCount: 0, manualReviewCount: 0 },
    };

    const resultB: ScenarioRunResult = {
      scenarioId: 'b',
      scenarioLabel: 'B',
      evaluationResults: new Map([['1', eval2]]),
      derivedResults: new Map([['1', derived1]]),
      summary: { totalIncreaseDollars: 25, providerCount: 2, zeroedCount: 0, manualReviewCount: 0 },
    };

    const buffer = exportCompareScenariosToXlsx(records, resultA, resultB);
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets['Compare Scenarios'];
    expect(ws).toBeTruthy();

    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: undefined });
    const row2 = json.find((r) => String(r.Employee_ID) === '2');
    expect(row2).toBeTruthy();

    const pctA = row2?.['Scenario_A_Increase_Pct'];
    const deltaPct = row2?.['Delta_Pct'];
    const isBlank = (v: unknown) => v === '' || v === null || v === undefined;

    expect(isBlank(pctA)).toBe(true);
    expect(isBlank(deltaPct)).toBe(true);
  });
});

