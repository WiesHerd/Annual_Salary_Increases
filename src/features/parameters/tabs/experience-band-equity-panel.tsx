import type { ExperienceBand } from '../../../types/experience-band';
import type { EquityTargetPoint } from '../../../types/experience-band';
import {
  EQUITY_JUDGE_ON_OPTIONS,
  EQUITY_TARGET_POINT_OPTIONS,
  bandHasDollarRangeConfig,
  describeEquityBandSettings,
} from '../../../lib/equity-settings';

const selectClass =
  'w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

const numberInputClass =
  'w-full min-w-0 px-2.5 py-2 text-sm border border-slate-300 rounded-lg text-right tabular-nums bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block';

interface ExperienceBandEquityPanelProps {
  band: ExperienceBand;
  onUpdate: (updates: Partial<ExperienceBand>) => void;
}

export function ExperienceBandEquityPanel({ band, onUpdate }: ExperienceBandEquityPanelProps) {
  const hasDollarRange = bandHasDollarRangeConfig(band);
  const enabled = band.equitySuggestionsEnabled ?? band.suggestBaseToHitTarget ?? band.suggestBaseToHitDollarRangeMidpoint ?? false;

  const availableTargets = EQUITY_TARGET_POINT_OPTIONS.filter(
    (o) => !o.requiresDollarRange || hasDollarRange
  );

  const targetPoint = band.equityTargetPoint ?? (band.suggestBaseToHitDollarRangeMidpoint && hasDollarRange ? 'dollarMidpoint' : 'percentileLow');

  const explainer = describeEquityBandSettings(band);

  const setEnabled = (on: boolean) => {
    onUpdate({
      equitySuggestionsEnabled: on,
      suggestBaseToHitTarget: on ? band.suggestBaseToHitTarget : false,
      suggestBaseToHitDollarRangeMidpoint: on ? band.suggestBaseToHitDollarRangeMidpoint : false,
    });
  };

  return (
    <div
      id={`equity-panel-${band.id}`}
      className="rounded-xl border border-indigo-200/80 bg-indigo-50/30 px-3 py-3 sm:px-4 shadow-sm space-y-4 scroll-mt-24"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Internal equity suggestions</p>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Drives merit review recommendations and the <span className="font-medium">Apply equity</span> action for
            providers below this band&apos;s target.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <span className="text-sm font-medium text-slate-800">Enabled</span>
        </label>
      </div>

      {enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div>
            <label htmlFor={`eq-target-${band.id}`} className={fieldLabelClass}>
              Target point
            </label>
            <select
              id={`eq-target-${band.id}`}
              value={targetPoint}
              onChange={(e) =>
                onUpdate({
                  equityTargetPoint: e.target.value as EquityTargetPoint,
                  equitySuggestionsEnabled: true,
                })
              }
              className={selectClass}
            >
              {availableTargets.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {EQUITY_TARGET_POINT_OPTIONS.find((o) => o.value === targetPoint)?.description}
            </p>
          </div>

          {targetPoint === 'percentileCustom' && (
            <div>
              <label htmlFor={`eq-custom-pct-${band.id}`} className={fieldLabelClass}>
                Custom percentile
              </label>
              <input
                id={`eq-custom-pct-${band.id}`}
                type="number"
                min={0}
                max={100}
                value={band.equityCustomPercentile ?? 50}
                onChange={(e) => onUpdate({ equityCustomPercentile: Number(e.target.value) || 0 })}
                className={numberInputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor={`eq-gap-${band.id}`} className={fieldLabelClass}>
              Gap to close (%)
            </label>
            <input
              id={`eq-gap-${band.id}`}
              type="number"
              min={0}
              max={100}
              value={band.equityGapClosePercent ?? 100}
              onChange={(e) => onUpdate({ equityGapClosePercent: Number(e.target.value) })}
              className={numberInputClass}
            />
            <p className="text-[11px] text-slate-500 mt-1">100 = full target; 50 = halfway to target.</p>
          </div>

          <div>
            <label htmlFor={`eq-judge-${band.id}`} className={fieldLabelClass}>
              Judge alignment on
            </label>
            <select
              id={`eq-judge-${band.id}`}
              value={band.equityJudgeOn ?? 'proposedOrCurrent'}
              onChange={(e) =>
                onUpdate({ equityJudgeOn: e.target.value as ExperienceBand['equityJudgeOn'] })
              }
              className={selectClass}
            >
              {EQUITY_JUDGE_ON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {hasDollarRange && (
            <div className="flex items-end">
              <label className="flex gap-2 cursor-pointer items-center pb-2">
                <input
                  type="checkbox"
                  checked={band.equityPreferDollarTarget ?? band.suggestBaseToHitDollarRangeMidpoint ?? false}
                  onChange={(e) => onUpdate({ equityPreferDollarTarget: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
                />
                <span className="text-sm text-slate-800">Prefer dollar range over percentile target</span>
              </label>
            </div>
          )}

          <div>
            <label htmlFor={`eq-max-pct-${band.id}`} className={fieldLabelClass}>
              Max increase % (optional)
            </label>
            <input
              id={`eq-max-pct-${band.id}`}
              type="number"
              min={0}
              step={0.1}
              value={band.equityMaxIncreasePercent ?? ''}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value;
                onUpdate({ equityMaxIncreasePercent: v === '' ? undefined : Number(v) });
              }}
              className={numberInputClass}
            />
          </div>

          <div>
            <label htmlFor={`eq-min-pct-${band.id}`} className={fieldLabelClass}>
              Min increase % (optional)
            </label>
            <input
              id={`eq-min-pct-${band.id}`}
              type="number"
              min={0}
              step={0.1}
              value={band.equityMinIncreasePercent ?? ''}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value;
                onUpdate({ equityMinIncreasePercent: v === '' ? undefined : Number(v) });
              }}
              className={numberInputClass}
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6">
            <label className="flex gap-2 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={band.equityHoldProductivityFixed !== false}
                onChange={(e) => onUpdate({ equityHoldProductivityFixed: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
              />
              <span className="text-sm text-slate-800">Hold productivity (CF × wRVU) fixed in back-solve</span>
            </label>
            <label className="flex gap-2 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={band.equityHoldSupplementalFixed !== false}
                onChange={(e) => onUpdate({ equityHoldSupplementalFixed: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
              />
              <span className="text-sm text-slate-800">Hold supplemental pay fixed in back-solve</span>
            </label>
          </div>
        </div>
      )}

      <div
        className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
          enabled ? 'border-indigo-200 bg-white text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
        role="note"
      >
        <span className="font-semibold text-slate-800">How this band will calculate: </span>
        {explainer}
      </div>
    </div>
  );
}
