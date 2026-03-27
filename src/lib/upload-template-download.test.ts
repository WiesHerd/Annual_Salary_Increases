import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDefaultEvaluationMapping, buildDefaultMarketMapping } from './parse-file';
import { buildDefaultProviderMapping } from './provider-parse';
import {
  CUSTOM_PROVIDER_TEMPLATE_SAMPLE_ROW,
  CUSTOM_STANDALONE_TEMPLATE_SAMPLE_ROW,
  EVALUATION_UPLOAD_TEMPLATE_HEADERS,
  EVALUATION_UPLOAD_TEMPLATE_SAMPLE_ROW,
  MARKET_UPLOAD_TEMPLATE_HEADERS,
  MARKET_UPLOAD_TEMPLATE_SAMPLE_ROW,
  PROVIDER_UPLOAD_TEMPLATE_HEADERS,
  PROVIDER_UPLOAD_TEMPLATE_SAMPLE_ROW,
} from './upload-template-download';

function csvHeaderCells(relativePath: string): string[] {
  const path = resolve(process.cwd(), relativePath);
  const firstLine = readFileSync(path, 'utf8').trim().split(/\r?\n/)[0];
  return firstLine.split(',');
}

describe('Upload template sample rows align with headers', () => {
  it('each template has one sample row with the same column count as its header row', () => {
    expect(PROVIDER_UPLOAD_TEMPLATE_SAMPLE_ROW.length).toBe(PROVIDER_UPLOAD_TEMPLATE_HEADERS.length);
    expect(MARKET_UPLOAD_TEMPLATE_SAMPLE_ROW.length).toBe(MARKET_UPLOAD_TEMPLATE_HEADERS.length);
    expect(EVALUATION_UPLOAD_TEMPLATE_SAMPLE_ROW.length).toBe(EVALUATION_UPLOAD_TEMPLATE_HEADERS.length);
    expect(CUSTOM_PROVIDER_TEMPLATE_SAMPLE_ROW.length).toBe(3);
    expect(CUSTOM_STANDALONE_TEMPLATE_SAMPLE_ROW.length).toBe(3);
  });
});

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

  it('evaluation: employee id + score + category + default increase', () => {
    const headers = [...EVALUATION_UPLOAD_TEMPLATE_HEADERS];
    const m = buildDefaultEvaluationMapping(headers);
    expect(m.Employee_ID).toBe('Employee_ID');
    expect(m.Evaluation_Score).toBe('Evaluation_Score');
    expect(m.Performance_Category).toBe('Performance_Category');
    expect(m.Default_Increase_Percent).toBe('Default_Increase_Percent');
  });
});
