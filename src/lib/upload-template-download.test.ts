import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDefaultEvaluationMapping,
  buildDefaultMarketMapping,
  buildDefaultPaymentMapping,
} from './parse-file';
import { buildDefaultProviderMapping } from './provider-parse';
import {
  EVALUATION_UPLOAD_TEMPLATE_HEADERS,
  MARKET_UPLOAD_TEMPLATE_HEADERS,
  PAYMENTS_UPLOAD_TEMPLATE_HEADERS,
  PROVIDER_UPLOAD_TEMPLATE_HEADERS,
} from './upload-template-download';

function csvHeaderCells(relativePath: string): string[] {
  const path = resolve(process.cwd(), relativePath);
  const firstLine = readFileSync(path, 'utf8').trim().split(/\r?\n/)[0];
  return firstLine.split(',');
}

describe('Upload template headers vs public samples', () => {
  it('provider matches public/sample-providers.csv', () => {
    expect([...PROVIDER_UPLOAD_TEMPLATE_HEADERS]).toEqual(csvHeaderCells('public/sample-providers.csv'));
  });

  it('market matches public/sample-market.csv', () => {
    expect([...MARKET_UPLOAD_TEMPLATE_HEADERS]).toEqual(csvHeaderCells('public/sample-market.csv'));
  });

  it('evaluation matches public/sample-evaluations.csv', () => {
    expect([...EVALUATION_UPLOAD_TEMPLATE_HEADERS]).toEqual(csvHeaderCells('public/sample-evaluations.csv'));
  });

  it('payments matches public/sample-payments.csv', () => {
    expect([...PAYMENTS_UPLOAD_TEMPLATE_HEADERS]).toEqual(csvHeaderCells('public/sample-payments.csv'));
  });
});

describe('Default mapping covers each template column', () => {
  it('provider: required identity + comp + workflow columns map 1:1', () => {
    const headers = [...PROVIDER_UPLOAD_TEMPLATE_HEADERS];
    const m = buildDefaultProviderMapping(headers);
    for (const h of headers) {
      const key = h.trim().replace(/\s+/g, '_') as keyof typeof m;
      expect(m[key], `logical field ${String(key)}`).toBe(h);
    }
  });

  it('market: specialty + percentiles + incumbents + orgCount', () => {
    const headers = [...MARKET_UPLOAD_TEMPLATE_HEADERS];
    const m = buildDefaultMarketMapping(headers);
    expect(m.specialty).toBe('specialty');
    expect(m.TCC_25).toBe('TCC_25');
    expect(m.WRVU_50).toBe('WRVU_50');
    expect(m.CF_90).toBe('CF_90');
    expect(m.incumbents).toBe('incumbents');
    expect(m.orgCount).toBe('orgCount');
  });

  it('payments: provider key, amount, date, category, cycle', () => {
    const headers = [...PAYMENTS_UPLOAD_TEMPLATE_HEADERS];
    const m = buildDefaultPaymentMapping(headers);
    expect(m.providerKey).toBe('providerKey');
    expect(m.amount).toBe('amount');
    expect(m.date).toBe('date');
    expect(m.category).toBe('category');
    expect(m.cycleId).toBe('cycleId');
  });

  it('evaluation: employee id + score + category + default increase', () => {
    const headers = [...EVALUATION_UPLOAD_TEMPLATE_HEADERS];
    const m = buildDefaultEvaluationMapping(headers);
    expect(m.Employee_ID).toBe('Employee_ID');
    expect(m.Evaluation_Score).toBe('Evaluation_Score');
    expect(m.Performance_Category).toBe('Performance_Category');
    expect(m.Default_Increase_Percent).toBe('Default_Increase_Percent');
  });
});
