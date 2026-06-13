import { useCallback } from 'react';
import { exportToCsv, exportToXlsx } from '../../lib/batch-export';
import { exportGovernanceCommitteeXlsx } from '../../lib/governance-export';
import { exportReviewTableToCsv, exportReviewTableToXlsx } from '../../lib/review-table-export';
import type { ProviderRecord } from '../../types/provider';
import type { PolicyEvaluationResult } from '../../types/compensation-policy';
import type { CustomDataset } from '../../types';
import type { CustomStreamExportLookup } from '../../lib/batch-export';
import type { ReviewTableExportOptions } from '../../lib/review-table-export';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useSalaryReviewExport({
  records,
  cycleScopedRecords,
  filteredRecords,
  evaluationResults,
  customDatasets,
  customStreamLookups,
  reviewExportOptions,
  cycleLabel,
}: {
  records: ProviderRecord[];
  cycleScopedRecords: ProviderRecord[];
  filteredRecords: ProviderRecord[];
  evaluationResults: Map<string, PolicyEvaluationResult>;
  customDatasets: CustomDataset[];
  customStreamLookups: CustomStreamExportLookup[];
  reviewExportOptions: Omit<ReviewTableExportOptions, 'records'>;
  cycleLabel?: string;
}) {
  const handleExportCsv = useCallback(
    (scope: 'filtered' | 'cycle' | 'all', visibleColumnsOnly = false) => {
      const toExport =
        scope === 'all' ? records : scope === 'cycle' ? cycleScopedRecords : filteredRecords;
      const scopeSlug = scope === 'all' ? 'all' : scope === 'cycle' ? 'cycle' : 'filtered';
      const viewSlug = visibleColumnsOnly ? 'table-view' : 'full-fields';
      const csv = visibleColumnsOnly
        ? exportReviewTableToCsv({ records: toExport, ...reviewExportOptions })
        : exportToCsv(toExport, evaluationResults, customDatasets, customStreamLookups);
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `merit-review-${scopeSlug}-${viewSlug}.csv`);
    },
    [
      records,
      cycleScopedRecords,
      filteredRecords,
      reviewExportOptions,
      evaluationResults,
      customDatasets,
      customStreamLookups,
    ]
  );

  const handleExportXlsx = useCallback(
    async (scope: 'filtered' | 'cycle' | 'all', visibleColumnsOnly = false) => {
      const toExport =
        scope === 'all' ? records : scope === 'cycle' ? cycleScopedRecords : filteredRecords;
      const scopeSlug = scope === 'all' ? 'all' : scope === 'cycle' ? 'cycle' : 'filtered';
      const viewSlug = visibleColumnsOnly ? 'table-view' : 'full-fields';
      const buffer = visibleColumnsOnly
        ? await exportReviewTableToXlsx({ records: toExport, ...reviewExportOptions })
        : await exportToXlsx(toExport, evaluationResults, customDatasets, customStreamLookups);
      downloadBlob(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `merit-review-${scopeSlug}-${viewSlug}.xlsx`
      );
    },
    [
      records,
      cycleScopedRecords,
      filteredRecords,
      reviewExportOptions,
      evaluationResults,
      customDatasets,
      customStreamLookups,
    ]
  );

  const handleExportCommitteeXlsx = useCallback(
    async (scope: 'filtered' | 'cycle' | 'all') => {
      const toExport =
        scope === 'all' ? records : scope === 'cycle' ? cycleScopedRecords : filteredRecords;
      const scopeSlug = scope === 'all' ? 'all' : scope === 'cycle' ? 'cycle' : 'filtered';
      const buffer = await exportGovernanceCommitteeXlsx(toExport, evaluationResults, cycleLabel);
      downloadBlob(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `merit-review-committee-${scopeSlug}.xlsx`
      );
    },
    [records, cycleScopedRecords, filteredRecords, evaluationResults, cycleLabel]
  );

  return { handleExportCsv, handleExportXlsx, handleExportCommitteeXlsx };
}
