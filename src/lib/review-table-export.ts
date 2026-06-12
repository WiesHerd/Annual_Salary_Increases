/**
 * Export merit review table rows using visible column definitions (WYSIWYG export).
 */

import Papa from 'papaparse';
import { loadXlsx } from './xlsx-loader';
import type { ProviderRecord } from '../types/provider';
import type { ExperienceBand } from '../types/experience-band';
import type { MarketRow } from '../types/market';
import type { ExperienceBandSurveyContext } from '../types/market-survey-config';
import type { PolicyEvaluationResult } from '../types/compensation-policy';
import type { CfBySpecialtyRow } from '../types/cf-by-specialty';
import {
  REVIEW_TABLE_COLUMNS,
  getReviewCellValue,
  formatReviewCellValue,
  type ReviewTableColumnId,
} from '../features/review/review-table-columns';

export interface ReviewTableExportOptions {
  records: ProviderRecord[];
  columnIds: ReviewTableColumnId[];
  experienceBands: ExperienceBand[];
  evaluationResults?: Map<string, PolicyEvaluationResult>;
  cfBySpecialty?: CfBySpecialtyRow[];
  getMarketRowForRecord?: (record: ProviderRecord) => MarketRow | undefined;
  experienceBandSurveyContext?: ExperienceBandSurveyContext;
}

function exportColumnIds(columnIds: ReviewTableColumnId[]): ReviewTableColumnId[] {
  return columnIds.filter((id) => id !== 'compareCheckbox');
}

function buildReviewTableRows(options: ReviewTableExportOptions): Record<string, string | number>[] {
  const columnIds = exportColumnIds(options.columnIds);
  const columns = columnIds
    .map((id) => REVIEW_TABLE_COLUMNS.find((c) => c.id === id))
    .filter((c): c is (typeof REVIEW_TABLE_COLUMNS)[number] => c != null);

  return options.records.map((record) => {
    const row: Record<string, string | number> = {};
    const marketRow = options.getMarketRowForRecord?.(record);
    const policyResult = options.evaluationResults?.get(record.Employee_ID);
    const bandOptions = {
      marketRow,
      experienceBandSurveyContext: options.experienceBandSurveyContext,
    };

    for (const col of columns) {
      const header = col.label.trim() || col.id;
      const value = getReviewCellValue(
        record,
        col.id,
        options.experienceBands,
        policyResult,
        options.cfBySpecialty,
        bandOptions
      );
      row[header] = formatReviewCellValue(value, col.format);
    }
    return row;
  });
}

export function exportReviewTableToCsv(options: ReviewTableExportOptions): string {
  return Papa.unparse(buildReviewTableRows(options));
}

export async function exportReviewTableToXlsx(options: ReviewTableExportOptions): Promise<ArrayBuffer> {
  const XLSX = await loadXlsx();
  const rows = buildReviewTableRows(options);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Merit Review');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
