/**
 * Provider detail panel for Salary Review Workspace.
 * Shows TCC breakdown, productivity, normalization, supplemental pay, market benchmarks, TCC driver.
 */

import type { ProviderRecord } from '../../types/provider';
import type { TccComponent } from '../../types/provider-review-record';
import type { ExperienceBand } from '../../types/experience-band';
import {
  getExperienceBandAlignment,
  getExperienceBandLabel,
  getTargetTccRange,
  isLowFteForNormalization,
  FTE_NORMALIZATION_CAUTION_THRESHOLD,
} from '../../lib/calculations/recalculate-provider-row';
import { getEquityRecommendation } from '../../lib/calculations/equity-recommendation';

export interface ProviderDetailEnrichment {
  currentTccBreakdown?: TccComponent[];
  proposedTccBreakdown?: TccComponent[];
  driverSummary?: string;
}

interface ProviderDetailPanelProps {
  provider: ProviderRecord | null;
  enrichment?: ProviderDetailEnrichment | null;
  experienceBands?: ExperienceBand[];
  onClose?: () => void;
  onSelectPrev?: () => void;
  onSelectNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function ProviderDetailPanel({
  provider,
  enrichment,
  experienceBands = [],
  onClose,
  onSelectPrev,
  onSelectNext,
  hasPrev = false,
  hasNext = false,
}: ProviderDetailPanelProps) {
  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-500 p-6 text-center">
        <p className="font-medium">Select a provider</p>
        <p className="text-sm mt-1">Click a row in the table to view details</p>
      </div>
    );
  }

  const currentTcc = provider.Current_TCC ?? 0;
  const proposedTcc = provider.Proposed_TCC ?? 0;
  const supplemental =
    (provider.Division_Chief_Pay ?? 0) +
    (provider.Medical_Director_Pay ?? 0) +
    (provider.Teaching_Pay ?? 0) +
    (provider.PSQ_Pay ?? 0) +
    (provider.Quality_Bonus ?? 0) +
    (provider.Other_Recurring_Comp ?? 0);

  const hasMarketTcc =
    provider.Market_TCC_25 != null ||
    provider.Market_TCC_50 != null ||
    provider.Market_TCC_75 != null ||
    provider.Market_TCC_90 != null;
  const tccPercentile = provider.Proposed_TCC_Percentile ?? provider.Current_TCC_Percentile ?? undefined;
  const markerPosition = tccPercentile != null ? ((tccPercentile - 25) / 65) * 100 : 0;

  const yoe = provider.Years_of_Experience ?? provider.Total_YOE;
  const experienceBandLabel = experienceBands.length ? getExperienceBandLabel(yoe, experienceBands) : null;
  const targetTccRange = experienceBands.length ? getTargetTccRange(yoe, experienceBands) : null;
  const bandAlignment = experienceBands.length
    ? getExperienceBandAlignment(yoe, provider.Current_TCC_Percentile, experienceBands)
    : undefined;
  const alignmentLabel =
    bandAlignment === 'below'
      ? 'Current salary is below target'
      : bandAlignment === 'in'
        ? 'Current salary is in range'
        : bandAlignment === 'above'
          ? 'Current salary is above target'
          : null;
  const alignmentClass =
    bandAlignment === 'below'
      ? 'bg-amber-100 text-amber-900'
      : bandAlignment === 'in'
        ? 'bg-emerald-50 text-emerald-800'
        : bandAlignment === 'above'
          ? 'bg-sky-100 text-sky-900'
          : '';

  function formatOrdinal(n: number): string {
    if (n >= 11 && n <= 13) return `${n}th`;
    const last = n % 10;
    if (last === 1) return `${n}st`;
    if (last === 2) return `${n}nd`;
    if (last === 3) return `${n}rd`;
    return `${n}th`;
  }

  return (
    <div className="flex flex-col h-full border-l border-slate-200 bg-white">
      {/* Frozen header: provider name + close — always visible */}
      <div className="shrink-0 p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-white">
        <h3 className="font-semibold text-slate-800 min-w-0 break-words" title={provider.Provider_Name ?? provider.Employee_ID}>
          {provider.Provider_Name ?? provider.Employee_ID}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {/* Scrollable body only */}
      <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
        {/* TCC breakdown */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">TCC breakdown</h4>
          <div className="space-y-1.5 text-sm">
            {enrichment?.currentTccBreakdown?.length ? (
              <>
                <p className="font-medium text-slate-700">Current</p>
                {enrichment.currentTccBreakdown.map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-600">{c.label}</span>
                    <span className="tabular-nums">{c.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
                <p className="font-medium text-slate-700 mt-2">Proposed</p>
                {enrichment.proposedTccBreakdown?.map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-600">{c.label}</span>
                    <span className="tabular-nums">{c.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Current TCC</span>
                  <span className="tabular-nums">{currentTcc.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Proposed TCC</span>
                  <span className="tabular-nums">{proposedTcc.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                {supplemental > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Supplemental</span>
                    <span className="tabular-nums">{supplemental.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Productivity */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Productivity</h4>
          <div className="space-y-1.5 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Prior year wRVUs</span>
              <span className="tabular-nums">{provider.Prior_Year_WRVUs ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Normalized wRVUs</span>
              <span className="tabular-nums">{provider.Normalized_WRVUs ?? provider.Adjusted_WRVUs ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>wRVU percentile</span>
              <span className="tabular-nums">{provider.WRVU_Percentile != null ? `${Number(provider.WRVU_Percentile).toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Target wRVUs</span>
              <span className="tabular-nums">{provider.Current_Target_WRVUs ?? provider.Proposed_Target_WRVUs ?? '—'}</span>
            </div>
          </div>
        </section>

        {/* Experience band and alignment */}
        {(experienceBandLabel != null || targetTccRange != null || alignmentLabel != null) && (
          <section className="border-l-4 border-indigo-400 pl-3 -ml-0.5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Experience band</h4>
            <div className="space-y-1.5 text-sm text-slate-700">
              {experienceBandLabel != null && (
                <div className="flex justify-between">
                  <span>Experience band</span>
                  <span className="tabular-nums">{experienceBandLabel}</span>
                </div>
              )}
              {targetTccRange != null && (
                <div className="flex justify-between">
                  <span>Target TCC range</span>
                  <span className="tabular-nums">{targetTccRange}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Current TCC percentile</span>
                <span className="tabular-nums">
                  {provider.Current_TCC_Percentile != null
                    ? `${Number(provider.Current_TCC_Percentile).toFixed(2)}%`
                    : '—'}
                </span>
              </div>
              {alignmentLabel != null && (
                <div className={`mt-2 px-2 py-1.5 rounded-lg text-sm font-medium ${alignmentClass}`}>
                  {alignmentLabel}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Internal equity recommendation */}
        {experienceBands.length > 0 && (() => {
          const rec = getEquityRecommendation(provider, experienceBands);
          if (!rec) return null;
          return (
            <section className="border-l-4 border-indigo-400 pl-3 -ml-0.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Internal equity recommendation</h4>
              <div className="space-y-1.5 text-sm text-slate-700">
                <p className="font-medium text-slate-800">{rec.action}</p>
                {rec.detail != null && (
                  <p className="text-slate-600">{rec.detail}</p>
                )}
                {rec.suggestedTccAt1Fte != null && Number.isFinite(rec.suggestedTccAt1Fte) && (
                  <p className="text-slate-700">
                    Consider moving toward ~{rec.suggestedTccAt1Fte.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} at 1.0 FTE.
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">Comparisons use compensation at 1.0 FTE.</p>
              </div>
            </section>
          );
        })()}

        {/* Normalization */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Normalization</h4>
          <div className="space-y-1.5 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Percent of year employed</span>
              <span className="tabular-nums">{provider.Percent_of_Year_Employed != null ? `${(provider.Percent_of_Year_Employed * 100).toFixed(0)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Clinical FTE</span>
              <span className="tabular-nums">{provider.Clinical_FTE ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Administrative FTE</span>
              <span className="tabular-nums">{provider.Administrative_FTE ?? '—'}</span>
            </div>
            {isLowFteForNormalization(provider) && (
              <div className="mt-2 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                FTE &lt; {FTE_NORMALIZATION_CAUTION_THRESHOLD} — normalization to 1.0 FTE may be less reliable for market comparison.
              </div>
            )}
          </div>
        </section>

        {/* Supplemental pay */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Supplemental pay</h4>
          <div className="space-y-1.5 text-sm text-slate-700">
            {[
              ['Division Chief', provider.Division_Chief_Pay],
              ['Medical Director', provider.Medical_Director_Pay],
              ['Teaching', provider.Teaching_Pay],
              ['PSQ', provider.PSQ_Pay],
              ['Quality Bonus', provider.Quality_Bonus],
              ['Other recurring', provider.Other_Recurring_Comp],
            ].map(([label, val]) =>
              (val != null && Number(val) !== 0) ? (
                <div key={String(label)} className="flex justify-between">
                  <span>{label}</span>
                  <span className="tabular-nums">{Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              ) : null
            )}
            {supplemental === 0 && <p className="text-slate-500">None</p>}
          </div>
        </section>

        {/* Next steps — workflow guidance */}
        <section className="border-l-4 border-indigo-400 pl-3 -ml-0.5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Next steps</h4>
          <p className="text-sm text-slate-700">
            → Review individual provider drilldown and consult with division leadership.
          </p>
        </section>

        {/* Market positioning — TCC position bar */}
        {hasMarketTcc && (
          <section className="border-l-4 border-indigo-400 pl-3 -ml-0.5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Market TCC position</h4>
              {tccPercentile != null && (
                <span className="text-sm font-medium text-slate-700 tabular-nums">
                  {formatOrdinal(Math.round(tccPercentile))} percentile
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="relative h-5 w-full flex rounded overflow-hidden bg-slate-100">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-emerald-400/80" style={{ width: '33.33%' }} />
                  <div className="flex-1 bg-amber-400/80" style={{ width: '33.33%' }} />
                  <div className="flex-1 bg-rose-400/80" style={{ width: '33.34%' }} />
                </div>
                {tccPercentile != null && (
                  <div
                    className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-indigo-600 bg-white shadow-sm z-10"
                    style={{
                      left: `clamp(0%, ${Math.min(100, Math.max(0, markerPosition))}%, 100%)`,
                      transform: 'translate(-50%, -50%)',
                      top: '50%',
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span className="tabular-nums">${(provider.Market_TCC_25 ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className="tabular-nums">${(provider.Market_TCC_50 ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className="tabular-nums">${(provider.Market_TCC_75 ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className="tabular-nums">${(provider.Market_TCC_90 ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </section>
        )}

        {/* Market benchmarks */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Market benchmarks</h4>
          <div className="space-y-1.5 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>TCC 25th</span>
              <span className="tabular-nums">{provider.Market_TCC_25 != null ? provider.Market_TCC_25.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>TCC 50th</span>
              <span className="tabular-nums">{provider.Market_TCC_50 != null ? provider.Market_TCC_50.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>TCC 75th</span>
              <span className="tabular-nums">{provider.Market_TCC_75 != null ? provider.Market_TCC_75.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>TCC 90th</span>
              <span className="tabular-nums">{provider.Market_TCC_90 != null ? provider.Market_TCC_90.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
          </div>
        </section>

        {/* What's driving TCC */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What's driving TCC</h4>
          <p className="text-sm text-slate-700">
            {enrichment?.driverSummary ??
              `Base salary ${provider.Proposed_Base_Salary != null ? `$${provider.Proposed_Base_Salary.toLocaleString()}` : '—'} plus productivity (CF × wRVU) and supplemental pay.`}
          </p>
        </section>
      </div>
      {/* Frozen footer: Previous / Next — always visible */}
      {(onSelectPrev != null || onSelectNext != null) && (
        <div className="shrink-0 p-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSelectPrev}
            disabled={!hasPrev}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
            aria-label="Previous provider"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onSelectNext}
            disabled={!hasNext}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
            aria-label="Next provider"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
