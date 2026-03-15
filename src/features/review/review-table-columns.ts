/**
 * Salary review table column config: decision-useful columns with editable flags.
 */

import type { ProviderRecord } from '../../types/provider';
import type { ExperienceBand } from '../../types/experience-band';
import type { PolicyEvaluationResult } from '../../types/compensation-policy';
import type { CfBySpecialtyRow } from '../../types/cf-by-specialty';
import { getEffectiveCfForProvider } from '../../lib/cf-resolver';
import {
  getExperienceBandAlignment,
  getExperienceBandLabel,
  getTargetTccRange,
} from '../../lib/calculations/recalculate-provider-row';
import { getEquityRecommendation } from '../../lib/calculations/equity-recommendation';
import { getReviewStatusLabel } from '../../types/enums';

export type ReviewTableColumnId =
  | 'compareCheckbox'
  | 'providerName'
  | 'division'
  | 'specialty'
  | 'population'
  | 'planType'
  | 'yoe'
  | 'experienceBand'
  | 'currentFte'
  | 'clinicalFte'
  | 'evaluationScore'
  | 'defaultIncreasePercent'
  | 'approvedIncreasePercent'
  | 'approvedIncreaseAmount'
  | 'currentBaseSalary'
  | 'proposedBaseSalary'
  | 'proposedBaseSalaryAt1Fte'
  | 'increaseDollars'
  | 'increasePercent'
  | 'currentTcc'
  | 'proposedTcc'
  | 'currentTccPercentile'
  | 'proposedTccPercentile'
  | 'targetTccRange'
  | 'bandAlignment'
  | 'equityRecommendation'
  | 'wrvuPercentile'
  | 'tccWrvuGap'
  | 'currentCf'
  | 'proposedCf'
  | 'currentTier'
  | 'proposedTier'
  | 'reviewStatus'
  | 'notesIndicator'
  | 'policySource'
  | 'policyOutcome'
  | 'tierAssigned'
  | 'manualReviewFlag';

export interface ReviewTableColumnDef {
  id: ReviewTableColumnId;
  label: string;
  align: 'left' | 'right';
  format: 'text' | 'number' | 'currency' | 'percent' | 'fte';
  editable?: boolean;
}

export const REVIEW_TABLE_COLUMNS: ReviewTableColumnDef[] = [
  { id: 'compareCheckbox', label: '', align: 'left', format: 'text' },
  { id: 'providerName', label: 'Provider Name', align: 'left', format: 'text' },
  { id: 'division', label: 'Division', align: 'left', format: 'text' },
  { id: 'specialty', label: 'Specialty', align: 'left', format: 'text' },
  { id: 'population', label: 'Provider Type', align: 'left', format: 'text' },
  { id: 'planType', label: 'Plan Type', align: 'left', format: 'text' },
  { id: 'yoe', label: 'YOE', align: 'right', format: 'number' },
  { id: 'experienceBand', label: 'Experience Band', align: 'left', format: 'text' },
  { id: 'currentFte', label: 'Current FTE', align: 'right', format: 'fte' },
  { id: 'clinicalFte', label: 'Clinical FTE', align: 'right', format: 'fte' },
  { id: 'evaluationScore', label: 'Evaluation Score', align: 'right', format: 'number' },
  { id: 'defaultIncreasePercent', label: 'Default Increase %', align: 'right', format: 'percent' },
  { id: 'approvedIncreasePercent', label: 'Approved Increase %', align: 'right', format: 'percent', editable: true },
  { id: 'approvedIncreaseAmount', label: 'Approved Increase $', align: 'right', format: 'currency', editable: true },
  { id: 'currentBaseSalary', label: 'Current Base Salary', align: 'right', format: 'currency' },
  { id: 'proposedBaseSalary', label: 'Proposed Base Salary', align: 'right', format: 'currency', editable: true },
  { id: 'proposedBaseSalaryAt1Fte', label: 'Proposed Base Salary (1.0 FTE)', align: 'right', format: 'currency' },
  { id: 'increaseDollars', label: 'Increase $', align: 'right', format: 'currency' },
  { id: 'increasePercent', label: 'Increase %', align: 'right', format: 'percent' },
  { id: 'currentTcc', label: 'Current TCC', align: 'right', format: 'currency' },
  { id: 'proposedTcc', label: 'Proposed TCC', align: 'right', format: 'currency' },
  { id: 'currentTccPercentile', label: 'Current TCC Percentile', align: 'right', format: 'percent' },
  { id: 'proposedTccPercentile', label: 'Proposed TCC Percentile', align: 'right', format: 'percent' },
  { id: 'targetTccRange', label: 'Target TCC Range', align: 'left', format: 'text' },
  { id: 'bandAlignment', label: 'Band alignment', align: 'left', format: 'text' },
  { id: 'equityRecommendation', label: 'Recommendation', align: 'left', format: 'text' },
  { id: 'wrvuPercentile', label: 'wRVU Percentile', align: 'right', format: 'percent' },
  { id: 'tccWrvuGap', label: 'TCC - wRVU Gap', align: 'right', format: 'currency' },
  { id: 'currentCf', label: 'Current CF', align: 'right', format: 'currency' },
  { id: 'proposedCf', label: 'Proposed CF', align: 'right', format: 'currency', editable: true },
  { id: 'currentTier', label: 'Current Tier', align: 'left', format: 'text' },
  { id: 'proposedTier', label: 'Proposed Tier', align: 'left', format: 'text', editable: true },
  { id: 'reviewStatus', label: 'Status', align: 'left', format: 'text', editable: true },
  { id: 'notesIndicator', label: 'Notes', align: 'left', format: 'text', editable: true },
  { id: 'policySource', label: 'Policy', align: 'left', format: 'text' },
  { id: 'policyOutcome', label: 'Outcome', align: 'left', format: 'text' },
  { id: 'tierAssigned', label: 'Tier assigned', align: 'left', format: 'text' },
  { id: 'manualReviewFlag', label: 'Manual review', align: 'left', format: 'text' },
];

const DEFAULT_VISIBLE_IDS = REVIEW_TABLE_COLUMNS.map((c) => c.id);

/** Default column width in pixels. Tighter defaults for dense, Silicon Valley–style tables. */
const DEFAULT_WIDTH_COMPARE_CHECKBOX = 40;
const DEFAULT_WIDTH_PROVIDER_NAME = 160;
const DEFAULT_WIDTH_OTHER = 100;
const DEFAULT_WIDTH_STATUS = 88;
/** Columns with longer labels or content get a bit more room. */
const WIDER_DEFAULT_IDS: ReviewTableColumnId[] = [
  'division',
  'specialty',
  'currentBaseSalary',
  'proposedBaseSalary',
  'proposedBaseSalaryAt1Fte',
  'approvedIncreasePercent',
  'approvedIncreaseAmount',
  'currentTccPercentile',
  'proposedTccPercentile',
  'targetTccRange',
  'bandAlignment',
  'equityRecommendation',
  'experienceBand',
  'evaluationScore',
  'defaultIncreasePercent',
];
const DEFAULT_WIDTH_WIDER = 120;
/** Extra-wide for columns with long labels (e.g. "Proposed Base Salary (1.0 FTE)"). */
const DEFAULT_WIDTH_EXTRA_WIDE = 140;
const EXTRA_WIDE_LABEL_IDS: ReviewTableColumnId[] = [
  'proposedBaseSalaryAt1Fte',
  'experienceBand',
  'evaluationScore',
  'targetTccRange',
];
/** Policy columns need more room for names like "High TCC guardrail", "Default merit matrix". */
const DEFAULT_WIDTH_POLICY = 160;
const POLICY_COLUMN_IDS: ReviewTableColumnId[] = [
  'policySource',
  'policyOutcome',
];

export function getDefaultVisibleColumnIds(): ReviewTableColumnId[] {
  return [...DEFAULT_VISIBLE_IDS];
}

/** Default column widths (px) for the salary review table. */
export function getDefaultColumnWidths(): Record<ReviewTableColumnId, number> {
  const out = {} as Record<ReviewTableColumnId, number>;
  for (const c of REVIEW_TABLE_COLUMNS) {
    if (c.id === 'compareCheckbox') out[c.id] = DEFAULT_WIDTH_COMPARE_CHECKBOX;
    else if (c.id === 'providerName') out[c.id] = DEFAULT_WIDTH_PROVIDER_NAME;
    else if (c.id === 'reviewStatus') out[c.id] = DEFAULT_WIDTH_STATUS;
    else if (POLICY_COLUMN_IDS.includes(c.id)) out[c.id] = DEFAULT_WIDTH_POLICY;
    else if (EXTRA_WIDE_LABEL_IDS.includes(c.id)) out[c.id] = DEFAULT_WIDTH_EXTRA_WIDE;
    else if (WIDER_DEFAULT_IDS.includes(c.id)) out[c.id] = DEFAULT_WIDTH_WIDER;
    else out[c.id] = DEFAULT_WIDTH_OTHER;
  }
  return out;
}

const COLUMN_WIDTH_MIN = 80;
const COLUMN_WIDTH_MAX = 400;

/**
 * Column widths scaled to fill a target width. Uses default widths as proportions;
 * visible columns are scaled so their total equals targetWidthPx.
 */
export function getColumnWidthsToFillArea(
  visibleColumnIds: ReviewTableColumnId[],
  targetWidthPx: number
): Record<ReviewTableColumnId, number> {
  const defaults = getDefaultColumnWidths();
  const visibleDefaults = visibleColumnIds.map((id) => ({ id, width: defaults[id] ?? 128 }));
  const defaultTotal = visibleDefaults.reduce((sum, { width }) => sum + width, 0);
  if (defaultTotal <= 0 || targetWidthPx <= 0) return defaults;

  const scale = targetWidthPx / defaultTotal;
  const widths: Record<ReviewTableColumnId, number> = { ...defaults };
  let allocated = 0;
  const rounded: { id: ReviewTableColumnId; w: number }[] = [];

  for (const { id, width } of visibleDefaults) {
    const raw = width * scale;
    const clamped = Math.max(COLUMN_WIDTH_MIN, Math.min(COLUMN_WIDTH_MAX, Math.round(raw)));
    rounded.push({ id, w: clamped });
    allocated += clamped;
    widths[id] = clamped;
  }

  const diff = targetWidthPx - allocated;
  if (diff !== 0 && rounded.length > 0) {
    const last = rounded[rounded.length - 1];
    const adjusted = Math.max(COLUMN_WIDTH_MIN, Math.min(COLUMN_WIDTH_MAX, widths[last.id] + diff));
    widths[last.id] = adjusted;
  }

  return widths;
}

/** Preset view IDs for one-click column sets. */
export type ReviewViewPresetId = 'meeting' | 'full' | 'comp' | 'policy';

/** Default display labels for preset view buttons. Can be overridden in storage. */
export const DEFAULT_PRESET_LABELS: Record<ReviewViewPresetId, string> = {
  meeting: 'Meeting',
  full: 'Full',
  comp: 'Comp',
  policy: 'Policy',
};

/** Default order of preset buttons. Can be overridden in storage. */
export const DEFAULT_PRESET_ORDER: ReviewViewPresetId[] = ['meeting', 'full', 'comp', 'policy'];

/** User-saved custom column view. */
export interface SavedCustomView {
  id: string;
  name: string;
  columnIds: ReviewTableColumnId[];
}

/** Column IDs for each preset. */
export const REVIEW_VIEW_PRESETS: Record<ReviewViewPresetId, ReviewTableColumnId[]> = {
  meeting: [
    'compareCheckbox',
    'providerName',
    'specialty',
    'currentBaseSalary',
    'proposedBaseSalary',
    'proposedBaseSalaryAt1Fte',
    'approvedIncreasePercent',
    'approvedIncreaseAmount',
    'increasePercent',
    'reviewStatus',
    'notesIndicator',
  ],
  full: [...DEFAULT_VISIBLE_IDS],
  comp: [
    'compareCheckbox',
    'providerName',
    'specialty',
    'currentBaseSalary',
    'proposedBaseSalary',
    'proposedBaseSalaryAt1Fte',
    'approvedIncreasePercent',
    'approvedIncreaseAmount',
    'increasePercent',
    'currentTcc',
    'proposedTcc',
    'currentTccPercentile',
    'proposedTccPercentile',
    'targetTccRange',
    'bandAlignment',
    'equityRecommendation',
    'wrvuPercentile',
    'currentCf',
    'proposedCf',
    'reviewStatus',
    'notesIndicator',
  ],
  policy: [
    'compareCheckbox',
    'providerName',
    'specialty',
    'population',
    'planType',
    'evaluationScore',
    'defaultIncreasePercent',
    'approvedIncreasePercent',
    'currentTccPercentile',
    'wrvuPercentile',
    'policySource',
    'policyOutcome',
    'tierAssigned',
    'manualReviewFlag',
    'reviewStatus',
  ],
};

/** Get display value for a cell (read-only display). Optional policyResult for policy columns when record not yet merged. Optional cfBySpecialty for Current CF / Proposed CF when record lacks values. */
export function getReviewCellValue(
  record: ProviderRecord,
  columnId: ReviewTableColumnId,
  experienceBands: ExperienceBand[] = [],
  policyResult?: PolicyEvaluationResult,
  cfBySpecialty?: CfBySpecialtyRow[]
): string | number | undefined {
  const r = record;
  const yoe = r.Years_of_Experience ?? r.Total_YOE;
  switch (columnId) {
    case 'compareCheckbox':
      return '';
    case 'providerName':
      return r.Provider_Name ?? '—';
    case 'division':
      return r.Primary_Division ?? '—';
    case 'specialty':
      return r.Specialty ?? '—';
    case 'population':
      return r.Population ?? '—';
    case 'planType':
      return r.Compensation_Plan ?? '—';
    case 'yoe':
      return yoe ?? '—';
    case 'experienceBand':
      return getExperienceBandLabel(yoe, experienceBands);
    case 'currentFte':
      return r.Current_FTE ?? '—';
    case 'clinicalFte':
      return r.Clinical_FTE ?? '—';
    case 'evaluationScore':
      return r.Evaluation_Score ?? '—';
    case 'defaultIncreasePercent':
      return policyResult?.finalRecommendedIncreasePercent ?? r.Default_Increase_Percent ?? '—';
    case 'approvedIncreasePercent': {
      if (r.Approved_Increase_Percent != null && Number.isFinite(r.Approved_Increase_Percent)) return r.Approved_Increase_Percent;
      const curPct = r.Current_Base_Salary ?? 0;
      const propPct = r.Proposed_Base_Salary;
      return curPct > 0 && propPct != null && Number.isFinite(propPct) ? ((propPct - curPct) / curPct) * 100 : (r.Default_Increase_Percent ?? '—');
    }
    case 'approvedIncreaseAmount': {
      if (r.Approved_Increase_Amount != null && Number.isFinite(r.Approved_Increase_Amount)) return r.Approved_Increase_Amount;
      const curAmt = r.Current_Base_Salary ?? 0;
      const propAmt = r.Proposed_Base_Salary;
      return propAmt != null && Number.isFinite(propAmt) ? propAmt - curAmt : (r.Default_Increase_Percent != null ? (curAmt * r.Default_Increase_Percent) / 100 : '—');
    }
    case 'currentBaseSalary':
      return r.Current_Base_Salary ?? '—';
    case 'proposedBaseSalary':
      return r.Proposed_Base_Salary ?? '—';
    case 'proposedBaseSalaryAt1Fte': {
      const prop = r.Proposed_Base_Salary;
      const fte = r.Current_FTE ?? 1;
      if (prop == null || !Number.isFinite(prop) || fte <= 0) return '—';
      return prop / fte;
    }
    case 'increaseDollars': {
      const cur = r.Current_Base_Salary ?? 0;
      const prop = r.Proposed_Base_Salary ?? cur;
      return prop - cur;
    }
    case 'increasePercent': {
      const cur = r.Current_Base_Salary ?? 0;
      const prop = r.Proposed_Base_Salary ?? cur;
      return cur > 0 ? ((prop - cur) / cur) * 100 : 0;
    }
    case 'currentTcc':
      return r.Current_TCC ?? '—';
    case 'proposedTcc':
      return r.Proposed_TCC ?? '—';
    case 'currentTccPercentile':
      return r.Current_TCC_Percentile ?? '—';
    case 'proposedTccPercentile':
      return r.Proposed_TCC_Percentile ?? '—';
    case 'targetTccRange':
      return getTargetTccRange(yoe, experienceBands);
    case 'bandAlignment': {
      const alignment = getExperienceBandAlignment(yoe, r.Current_TCC_Percentile, experienceBands);
      if (alignment === 'below') return 'Below target';
      if (alignment === 'in') return 'In range';
      if (alignment === 'above') return 'Above target';
      return '—';
    }
    case 'equityRecommendation': {
      const rec = getEquityRecommendation(r, experienceBands);
      if (!rec) return '—';
      const suffix =
        rec.suggestedTccAt1Fte != null && Number.isFinite(rec.suggestedTccAt1Fte)
          ? ` ~${formatCurrencyTwoDecimals(rec.suggestedTccAt1Fte)} at 1.0 FTE`
          : '';
      return rec.action + suffix;
    }
    case 'wrvuPercentile':
      return r.WRVU_Percentile ?? '—';
    case 'tccWrvuGap':
      return r.TCC_WRVU_Gap ?? '—';
    case 'currentCf': {
      if (r.Current_CF != null && Number.isFinite(r.Current_CF)) return r.Current_CF;
      if (cfBySpecialty?.length) {
        const { currentCf } = getEffectiveCfForProvider(r, cfBySpecialty);
        return currentCf;
      }
      return '—';
    }
    case 'proposedCf': {
      if (r.Proposed_CF != null && Number.isFinite(r.Proposed_CF)) return r.Proposed_CF;
      if (cfBySpecialty?.length) {
        const { proposedCf } = getEffectiveCfForProvider(r, cfBySpecialty);
        return proposedCf;
      }
      return '—';
    }
    case 'currentTier':
      return r.Current_Tier ?? '—';
    case 'proposedTier':
      return r.Proposed_Tier ?? '—';
    case 'reviewStatus':
      return getReviewStatusLabel(r.Review_Status);
    case 'notesIndicator':
      return r.Notes != null && String(r.Notes).trim() !== '' ? '📝' : '';
    case 'policySource':
      return r.Policy_Source_Name ?? policyResult?.finalPolicySource ?? '—';
    case 'policyOutcome': {
      const blocked = policyResult?.blocked || r.Policy_Logic_Status === 'Blocked';
      const applied = policyResult != null || r.Policy_Applied === true;
      if (blocked) return 'Blocked';
      if (applied) return 'Applied';
      return '—';
    }
    case 'tierAssigned':
      return r.Policy_Tier_Assigned ?? policyResult?.tierAssigned ?? '—';
    case 'manualReviewFlag':
      return r.Manual_Review_Flag ?? policyResult?.manualReview ? 'Yes' : '—';
    default:
      return '—';
  }
}

/** Format number as USD with $, commas, and 2 decimals (for display and editable currency inputs). */
export function formatCurrencyTwoDecimals(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parse user input for currency (strips $ and commas). Returns undefined if invalid or empty. */
export function parseCurrencyInput(str: string): number | undefined {
  const cleaned = str.replace(/[$,]/g, '').trim();
  if (cleaned === '') return undefined;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

/** Format number as percent with exactly 2 decimals (e.g. 3.5 → "3.50%"). */
export function formatPercentTwoDecimals(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Parse user input for percent (strips %). Returns undefined if invalid or empty. */
export function parsePercentInput(str: string): number | undefined {
  const cleaned = str.replace(/%/g, '').trim();
  if (cleaned === '') return undefined;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

export function formatReviewCellValue(
  value: string | number | undefined,
  format: 'text' | 'number' | 'currency' | 'percent' | 'fte'
): string {
  if (value == null || value === '') return '—';
  if (format === 'currency' && typeof value === 'number') {
    return formatCurrencyTwoDecimals(value);
  }
  if (format === 'percent' && typeof value === 'number') {
    return `${value.toFixed(2)}%`;
  }
  if (format === 'fte' && typeof value === 'number') {
    return value.toFixed(2);
  }
  if (format === 'number' && typeof value === 'number') {
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(value);
}

/** Sort order for band alignment: below=0, in=1, above=2, unknown=3. */
function getBandAlignmentSortOrder(alignment: string): number {
  if (alignment === 'Below target') return 0;
  if (alignment === 'In range') return 1;
  if (alignment === 'Above target') return 2;
  return 3;
}

/** Raw value for sorting (number or string). Optional policyResult for policy columns. Optional cfBySpecialty for CF columns. */
export function getReviewCellSortValue(
  record: ProviderRecord,
  columnId: ReviewTableColumnId,
  experienceBands: ExperienceBand[] = [],
  policyResult?: PolicyEvaluationResult,
  cfBySpecialty?: CfBySpecialtyRow[]
): number | string {
  if (columnId === 'compareCheckbox') return '';
  if (columnId === 'bandAlignment') {
    const v = getReviewCellValue(record, columnId, experienceBands, policyResult, cfBySpecialty);
    return getBandAlignmentSortOrder(String(v ?? ''));
  }
  if (columnId === 'equityRecommendation') {
    const yoe = record.Years_of_Experience ?? record.Total_YOE;
    const tccPercentile = record.Proposed_TCC_Percentile ?? record.Current_TCC_Percentile;
    const alignment = getExperienceBandAlignment(yoe, tccPercentile, experienceBands);
    if (alignment === 'below') return 0;
    if (alignment === 'in') return 1;
    if (alignment === 'above') return 2;
    return 3;
  }
  const v = getReviewCellValue(record, columnId, experienceBands, policyResult, cfBySpecialty);
  if (typeof v === 'number') return v;
  return String(v ?? '');
}
