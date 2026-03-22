/**
 * Budget usage donut — same ECharts styling as Specialty map (ring, shadow, emphasis).
 * Optional “Budget” caption (`showCaption`); compact $ + usage % in the ring; optional status to the right.
 */

import { useMemo, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { formatCurrencyTwoDecimals } from './review-table-columns';
import { standardDonutPieSeriesBase } from '../../lib/echarts-donut-style';

const EMERALD = '#10b981';
const SLATE = '#e2e8f0';
const AMBER = '#f59e0b';
const RED = '#ef4444';

/** Short label (e.g. $2.4M). */
function formatUsdCompact(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '');
    return `${sign}$${s}M`;
  }
  if (abs >= 10_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}${formatCurrencyTwoDecimals(abs)}`;
}

const DEFAULT_TITLE =
  'Hover the chart for details. Compares total base pay changes for listed providers to the cycle budget.';

const DEFAULT_DONUT_PX = 96;

export function BudgetUsageDonut({
  percentOfBudget,
  budgetAmount,
  isWarning = false,
  statusLine,
  title = DEFAULT_TITLE,
  /** Show “Budget” caption above the ring (off in page header next to the title). */
  showCaption = true,
  /** Chart pixel width/height. */
  size = DEFAULT_DONUT_PX,
}: {
  percentOfBudget: number;
  budgetAmount?: number;
  /** True when usage is within budget but at/above the warning threshold. */
  isWarning?: boolean;
  statusLine?: ReactNode;
  title?: string;
  showCaption?: boolean;
  size?: number;
}) {
  const option = useMemo((): EChartsOption => {
    const pct = percentOfBudget;
    let data: { value: number; name: string; itemStyle: { color: string } }[];
    let usedColor = EMERALD;

    if (pct > 100) {
      data = [{ value: 100, name: 'Over budget', itemStyle: { color: RED } }];
    } else if (pct >= 0) {
      const used = Math.min(100, Math.max(0, pct));
      const rest = Math.max(0, 100 - used);
      usedColor = isWarning ? AMBER : EMERALD;
      data = [
        { value: used, name: 'Share of budget', itemStyle: { color: usedColor } },
        { value: rest, name: 'Remaining', itemStyle: { color: SLATE } },
      ];
    } else {
      data = [{ value: 100, name: 'Net decrease vs budget', itemStyle: { color: SLATE } }];
    }

    const multi = data.length > 1;

    return {
      animationDuration: 450,
      tooltip: {
        trigger: 'item',
        formatter: () => {
          const lines = [
            `<b>${percentOfBudget.toFixed(1)}%</b> of the cycle budget`,
            'Total base salary increases and decreases for the providers listed in the table (after filters) compared with this dollar target.',
          ];
          if (budgetAmount != null && Number.isFinite(budgetAmount)) {
            lines.splice(1, 0, `Budget: ${formatCurrencyTwoDecimals(budgetAmount)}`);
          }
          return lines.join('<br/>');
        },
      },
      series: [
        {
          ...standardDonutPieSeriesBase,
          padAngle: multi ? 2 : 0,
          minAngle: multi ? 2 : 0,
          data,
        },
      ],
    };
  }, [percentOfBudget, budgetAmount, isWarning]);

  const showBudgetLabel = budgetAmount != null && Number.isFinite(budgetAmount) && budgetAmount > 0;

  const accentLineClass =
    percentOfBudget > 100
      ? 'text-red-600'
      : isWarning
        ? 'text-amber-700'
        : percentOfBudget < 0
          ? 'text-sky-800'
          : 'text-emerald-700';

  const compactRing = size < 84;

  return (
    <div className="flex min-h-0 min-w-0 items-center gap-2" title={title}>
      <div
        className="flex shrink-0 flex-col items-center gap-0.5"
        style={{ width: size }}
      >
        {showCaption && (
          <span className="block w-full text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Budget
          </span>
        )}
        <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
          <ReactECharts option={option} style={{ width: '100%', height: '100%' }} notMerge opts={{ renderer: 'canvas' }} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center leading-none">
            {showBudgetLabel ? (
              <>
                <span
                  className={`font-bold tabular-nums tracking-tight text-slate-800 ${
                    compactRing ? 'text-[10px]' : 'text-xs'
                  }`}
                >
                  {formatUsdCompact(budgetAmount!)}
                </span>
                <span
                  className={`font-extrabold tabular-nums ${accentLineClass} ${
                    compactRing ? 'text-[8px]' : 'text-[9px]'
                  }`}
                >
                  {percentOfBudget.toFixed(1)}%
                </span>
              </>
            ) : (
              <span
                className={`font-semibold tabular-nums ${accentLineClass} ${
                  compactRing ? 'text-sm' : 'text-base'
                }`}
              >
                {percentOfBudget.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
      {statusLine != null && (
        <div className="flex max-w-[5.5rem] min-w-0 flex-col justify-center self-center">
          <div className="text-[10px] font-medium leading-snug text-slate-600">{statusLine}</div>
        </div>
      )}
    </div>
  );
}
