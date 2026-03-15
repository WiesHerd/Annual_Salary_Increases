/**
 * Upload source interfaces.
 * Raw rows, column mapping, and parsed results for provider/market/incentive/productivity uploads.
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

/** Maps logical payment fields to source column names. */
export interface PaymentColumnMapping {
  providerKey?: string;
  externalId?: string;
  amount: string;
  date: string;
  category?: string;
  cycleId?: string;
  [key: string]: string | undefined;
}

/** One parsed payment/transaction row. */
export interface ParsedPaymentRow {
  providerKey: string;
  amount: number;
  date: string;
  category?: string;
  cycleId?: string;
}

/** Result of a payments file upload. */
export interface PaymentUploadResult {
  rows: ParsedPaymentRow[];
  errors: string[];
  mapping: PaymentColumnMapping;
}

/** Row from an incentive upload; joins to ProviderRecord by Employee_ID. */
export interface IncentiveJoinRow {
  Employee_ID: string;
  Prior_Year_WRVU_Incentive?: number;
  Division_Chief_Pay?: number;
  Medical_Director_Pay?: number;
  Teaching_Pay?: number;
  PSQ_Pay?: number;
  Quality_Bonus?: number;
  Other_Recurring_Comp?: number;
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
  Evaluation_Score?: number;
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
