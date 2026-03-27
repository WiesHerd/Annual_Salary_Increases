/**
 * Zod schemas for data restored from localStorage. Loose .passthrough() on records
 * keeps unknown fields while validating required keys.
 */

import { z } from 'zod';
import type { ProviderRecord } from '../../types/provider';
import type { MarketSurveySet } from '../../types/market-survey-config';
import type { EvaluationJoinRow, CustomDataset } from '../../types/upload';
import type { Cycle } from '../../types/cycle';

const providerRecordRow = z
  .object({
    Employee_ID: z.string().min(1),
  })
  .passthrough();

export function parseProviderRecordsFromStorage(data: unknown): ProviderRecord[] {
  const r = z.array(providerRecordRow).safeParse(data);
  if (!r.success) return [];
  return r.data as ProviderRecord[];
}

const marketRowSchema = z
  .object({
    specialty: z.string(),
  })
  .passthrough();

const marketSurveySetSchema = z.record(z.string(), z.array(marketRowSchema));

export function parseMarketSurveySetFromStorage(data: unknown): MarketSurveySet | null {
  const r = marketSurveySetSchema.safeParse(data);
  if (!r.success) return null;
  return r.data as unknown as MarketSurveySet;
}

const surveyMetadataSchema = z.record(z.string(), z.object({ label: z.string() }).passthrough());

export function parseSurveyMetadataFromStorage(data: unknown): Record<string, { label: string }> {
  const r = surveyMetadataSchema.safeParse(data);
  if (!r.success) return {};
  return r.data;
}

const evaluationRowSchema = z
  .object({
    Employee_ID: z.string().min(1),
  })
  .passthrough();

export function parseEvaluationRowsFromStorage(data: unknown): EvaluationJoinRow[] {
  const r = z.array(evaluationRowSchema).safeParse(data);
  if (!r.success) return [];
  return r.data as EvaluationJoinRow[];
}

const customDatasetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    joinKeyColumn: z.string().nullable(),
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

export function parseCustomDatasetsFromStorage(data: unknown): CustomDataset[] {
  const r = z.array(customDatasetSchema).safeParse(data);
  if (!r.success) return [];
  return r.data as CustomDataset[];
}

const cycleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
  })
  .passthrough();

export function parseCyclesFromStorage(data: unknown): Cycle[] | null {
  const r = z.array(cycleSchema).safeParse(data);
  if (!r.success) return null;
  return r.data as Cycle[];
}
