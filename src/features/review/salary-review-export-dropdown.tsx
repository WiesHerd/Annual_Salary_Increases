/**
 * Merit review export menu — filtered, cycle, and all-provider scopes.
 */

import { useEffect, useState } from 'react';

export type ExportScope = 'filtered' | 'cycle' | 'all';

export interface SalaryReviewExportDropdownProps {
  filteredCount: number;
  cycleCount: number;
  allCount: number;
  onExportCsv: (scope: ExportScope, tableViewOnly: boolean) => void;
  onExportXlsx: (scope: ExportScope, tableViewOnly: boolean) => void | Promise<void>;
  onExportCommitteeXlsx?: (scope: ExportScope) => void | Promise<void>;
}

function ExportSection({
  title,
  onCsvTable,
  onXlsxTable,
  onCsvAll,
  onXlsxAll,
  roundedBottom,
}: {
  title: string;
  onCsvTable: () => void;
  onXlsxTable: () => void;
  onCsvAll: () => void;
  onXlsxAll: () => void;
  roundedBottom?: boolean;
}) {
  return (
    <>
      <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <button
        type="button"
        onClick={onCsvTable}
        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Table view · CSV
      </button>
      <button
        type="button"
        onClick={onXlsxTable}
        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Table view · Excel
      </button>
      <button
        type="button"
        onClick={onCsvAll}
        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        All fields · CSV
      </button>
      <button
        type="button"
        onClick={onXlsxAll}
        className={`w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors ${roundedBottom ? 'rounded-b-lg' : ''}`}
      >
        All fields · Excel
      </button>
    </>
  );
}

export function SalaryReviewExportDropdown({
  filteredCount,
  cycleCount,
  allCount,
  onExportCsv,
  onExportXlsx,
  onExportCommitteeXlsx,
}: SalaryReviewExportDropdownProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const run = (fn: () => void | Promise<void>) => {
    void fn();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="app-btn-secondary inline-flex items-center gap-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Export table"
      >
        Export
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close export menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[14rem] py-1 app-dropdown-panel" role="menu">
            {onExportCommitteeXlsx && (
              <>
                <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Committee
                </p>
                <button
                  type="button"
                  onClick={() => run(() => onExportCommitteeXlsx('filtered'))}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Governance summary · Excel ({filteredCount})
                </button>
                <button
                  type="button"
                  onClick={() => run(() => onExportCommitteeXlsx('cycle'))}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Governance summary · Excel ({cycleCount})
                </button>
                <div className="mx-2 my-1 h-px bg-slate-100" aria-hidden />
              </>
            )}
            <ExportSection
              title={`Filtered view (${filteredCount})`}
              onCsvTable={() => run(() => onExportCsv('filtered', true))}
              onXlsxTable={() => run(() => onExportXlsx('filtered', true))}
              onCsvAll={() => run(() => onExportCsv('filtered', false))}
              onXlsxAll={() => run(() => onExportXlsx('filtered', false))}
            />
            <div className="mx-2 my-1 h-px bg-slate-100" aria-hidden />
            <ExportSection
              title={`This cycle (${cycleCount})`}
              onCsvTable={() => run(() => onExportCsv('cycle', true))}
              onXlsxTable={() => run(() => onExportXlsx('cycle', true))}
              onCsvAll={() => run(() => onExportCsv('cycle', false))}
              onXlsxAll={() => run(() => onExportXlsx('cycle', false))}
            />
            <div className="mx-2 my-1 h-px bg-slate-100" aria-hidden />
            <ExportSection
              title={`All providers (${allCount})`}
              onCsvTable={() => run(() => onExportCsv('all', true))}
              onXlsxTable={() => run(() => onExportXlsx('all', true))}
              onCsvAll={() => run(() => onExportCsv('all', false))}
              onXlsxAll={() => run(() => onExportXlsx('all', false))}
              roundedBottom
            />
          </div>
        </>
      )}
    </div>
  );
}
