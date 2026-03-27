/**
 * Full provider compensation dataset schema.
 * Normalized record for one provider in a cycle; fields can be populated from
 * provider upload, market join, incentive upload, productivity upload, etc.
 */

export interface ProviderRecord {
  // ─── 1. Provider Identity ─────────────────────────────────────────────────
  Employee_ID: string;
  Provider_Name?: string;
  Primary_Division?: string;
  Department?: string;
  Location?: string;
  Job_Code?: string;
  Provider_Type?: string;
  Specialty?: string;
  Benchmark_Group?: string;
  /** Finer-grained clinical focus (e.g. subspecialty); distinct from benchmark/market grouping. */
  Subspecialty?: string;
  /** When set, used instead of Specialty/Benchmark_Group to match market survey row for TCC/wRVU percentiles. */
  Market_Specialty_Override?: string;
  Population?: string;
  Compensation_Plan?: string;
  Cycle?: string;

  // ─── 2. Employment / Experience ───────────────────────────────────────────
  Hire_Date?: string;
  Adjusted_Hire_Date?: string;
  Residency_Graduation_Date?: string;
  RN_Start_Date?: string;
  RN_End_Date?: string;
  Non_RN_Start_Date?: string;
  Years_of_Experience?: number;
  APP_YOE?: number;
  RN_YOE?: number;
  Total_YOE?: number;
  Percent_of_Year_Employed?: number;

  // ─── 3. FTE Structure ───────────────────────────────────────────────────
  Current_FTE?: number;
  Clinical_FTE?: number;
  Administrative_FTE?: number;
  Research_FTE?: number;
  Teaching_FTE?: number;

  // ─── 4. Current Compensation ─────────────────────────────────────────────
  Current_Base_Salary?: number;
  Current_Salary_at_1FTE?: number;
  Current_TCC?: number;
  Current_TCC_at_1FTE?: number;
  Current_CF?: number;
  Current_Target_WRVUs?: number;
  Current_Threshold?: number;
  Current_TCC_Percentile?: number;
  Current_Compa_Ratio?: number;

  // ─── 5. Proposed Compensation ───────────────────────────────────────────
  Proposed_Base_Salary?: number;
  Proposed_Salary_at_1FTE?: number;
  Proposed_CF?: number;
  Proposed_Target_WRVUs?: number;
  Proposed_Threshold?: number;
  Proposed_TCC?: number;
  Proposed_TCC_at_1FTE?: number;
  Proposed_TCC_Percentile?: number;
  Proposed_Compa_Ratio?: number;

  // ─── 6. Productivity ─────────────────────────────────────────────────────
  Prior_Year_WRVUs?: number;
  Adjusted_WRVUs?: number;
  Normalized_WRVUs?: number;
  WRVU_Percentile?: number;

  // ─── 7. TCC / incentive components (typical physician total cash vs market surveys) ──
  /** Annual wRVU- or productivity-tied incentive (actual $), distinct from CF×wRVU imputation. */
  Prior_Year_WRVU_Incentive?: number;
  /** Value-based / risk-sharing / APM-style payments often reported separately from quality bonus. */
  Value_Based_Payment?: number;
  /** Shift, weekend, or similar clinical premiums included in total cash for survey comparison. */
  Shift_Incentive?: number;
  Division_Chief_Pay?: number;
  Medical_Director_Pay?: number;
  Teaching_Pay?: number;
  PSQ_Pay?: number;
  Quality_Bonus?: number;
  Other_Recurring_Comp?: number;
  /** Map arbitrary extra clinical TCC lines (rename column in upload to match your org). */
  TCC_Other_Clinical_1?: number;
  TCC_Other_Clinical_2?: number;
  TCC_Other_Clinical_3?: number;

  // ─── 8. PCP Tier Fields ───────────────────────────────────────────────────
  Tier_System?: string;
  Current_Tier?: string;
  Proposed_Tier?: string;
  Tier_Override?: string;
  Tier_Base_Salary?: number;

  // ─── 9. PCP APP Plan Fields ───────────────────────────────────────────────
  Fixed_Productivity_Target?: number;
  CF_Override?: number;
  Target_Override?: number;

  // ─── 10. Merit / Evaluation ──────────────────────────────────────────────
  /** Numeric (e.g. 4.2) or alphanumeric (e.g. letter grades) from roster or evaluation upload. */
  Evaluation_Score?: string | number;
  Performance_Category?: string;
  Default_Increase_Percent?: number;
  Approved_Increase_Percent?: number;
  Approved_Increase_Amount?: number;
  Applied_Increase_Percent?: number;
  Merit_Increase_Amount?: number;
  Pay_Change_Indicator?: string;

  // ─── 11. Market Positioning (often joined from market file) ────────────────
  Market_TCC_25?: number;
  Market_TCC_50?: number;
  Market_TCC_75?: number;
  Market_TCC_90?: number;
  Market_WRVU_25?: number;
  Market_WRVU_50?: number;
  Market_WRVU_75?: number;
  Market_WRVU_90?: number;
  Estimated_TCC_from_WRVU_Percentile?: number;
  WRVU_to_TCC_Ratio?: number;
  TCC_WRVU_Gap?: number;
  Estimated_Pay_Gap?: number;

  // ─── 12. Review Workflow ───────────────────────────────────────────────────
  Review_Status?: string;
  Reviewer?: string;
  Review_Date?: string;
  Notes?: string;
  Adjustment_Rationale?: string;

  // ─── 13. Policy engine (row-level trace) ───────────────────────────────────
  /** Whether policy engine applied (vs manual/default only). */
  Policy_Applied?: boolean;
  /** Name of policy/model that determined the increase. */
  Policy_Source_Name?: string;
  /** Policy type (e.g. general matrix, custom model, guardrail). */
  Policy_Type?: string;
  /** Short status (e.g. "Custom model applied", "Guardrail: 0%"). */
  Policy_Logic_Status?: string;
  /** One-line explanation for table/export. */
  Policy_Explanation_Summary?: string;
  /** Rule/policy id for drill-down link. */
  Policy_Rule_Id?: string;
  /** Tier assigned by custom model (e.g. "Tier 2"). */
  Policy_Tier_Assigned?: string;
  /** Manual review required by policy. */
  Manual_Review_Flag?: boolean;
}

/** Column mapping keys for provider upload (logical field → source column name). */
export type ProviderColumnMappingKey = keyof ProviderRecord;
