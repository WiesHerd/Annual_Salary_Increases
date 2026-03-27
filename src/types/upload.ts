/**
 * Upload source interfaces.
 * Raw rows, column mapping, and parsed results for provider/market/evaluation/custom uploads.
 */

import type { ProviderRecord } from './provider';

/** One raw row from CSV or XLSX before mapping (column name or index → value). */
export type RawRow = Record<string, string | number | undefined>;

/** Maps logical provider fields (ProviderRecord keys) to source column names. */
export interface ProviderColumnMapping {
  [key: string]: string | undefined;
}

/** Result of a provider file upload: full ProviderRecord rows, errors, and mapping. */
export interface ProviderUploadResult {
  rows: ProviderRecord[];
  errors: string[];
  mapping: ProviderColumnMapping;
}

/** Legacy alias: provider upload result (use ProviderUploadResult). */
export type UploadResult = ProviderUploadResult;

/** Maps logical market fields to source column names (specialty + TCC_25–TCC_90, WRVU_25–WRVU_90, CF_25–CF_90). */
export interface MarketColumnMapping {
  specialty: string;
  /** Optional label/source column */
  label?: string;
  /** Percentile column names, e.g. TCC_25, TCC_50, WRVU_25 … */
  [key: string]: string | undefined;
}

/** Result of a market file upload. */
export interface MarketUploadResult {
  rows: import('./market').MarketRow[];
  errors: string[];
  mapping: MarketColumnMapping;
}

/** Row shape for optional incentive joins by Employee_ID (legacy / programmatic merge). */
export interface IncentiveJoinRow {
  Employee_ID: string;
  Prior_Year_WRVU_Incentive?: number;
  Value_Based_Payment?: number;
  Shift_Incentive?: number;
  Division_Chief_Pay?: number;
  Medical_Director_Pay?: number;
  Teaching_Pay?: number;
  PSQ_Pay?: number;
  Quality_Bonus?: number;
  Other_Recurring_Comp?: number;
  TCC_Other_Clinical_1?: number;
  TCC_Other_Clinical_2?: number;
  TCC_Other_Clinical_3?: number;
}

/** Row from a productivity upload; joins to ProviderRecord by Employee_ID. */
export interface ProductivityJoinRow {
  Employee_ID: string;
  Prior_Year_WRVUs?: number;
  Adjusted_WRVUs?: number;
  Normalized_WRVUs?: number;
  WRVU_Percentile?: number;
}

/** Row from a provider evaluation upload; joins to ProviderRecord by Employee_ID. */
export interface EvaluationJoinRow {
  Employee_ID: string;
  Evaluation_Score?: string | number;
  Performance_Category?: string;
  Default_Increase_Percent?: number;
}

/** Column mapping for evaluation upload (Employee_ID required). */
export interface EvaluationColumnMapping {
  Employee_ID: string;
  Evaluation_Score?: string;
  Performance_Category?: string;
  Default_Increase_Percent?: string;
  [key: string]: string | undefined;
}

/** Result of an evaluation file upload. */
export interface EvaluationUploadResult {
  rows: EvaluationJoinRow[];
  errors: string[];
  mapping: EvaluationColumnMapping;
}

// ─── Custom data upload (dynamic, user-defined columns) ─────────────────────

/** One custom dataset: user-defined name, optional join key, generic rows. */
export interface CustomDataset {
  id: string;
  name: string;
  /** Source column name used to join to providers (e.g. Employee_ID). Null = display/export only without join. */
  joinKeyColumn: string | null;
  /** Column names (from file headers). */
  columns: string[];
  /** Generic row data. */
  rows: RawRow[];
}

/** Result of a custom file upload: raw rows, errors, and chosen options. */
export interface CustomUploadResult {
  rows: RawRow[];
  errors: string[];
  columns: string[];
  /** Column name chosen as join key (optional). */
  joinKeyColumn: string | null;
}
