/**
 * Experience vs. base salary (at 1.0 FTE) scatter chart for BI trend validation.
 * Built with Apache ECharts for enterprise-grade rendering and interactivity.
 */

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  assignExperienceScatterLabelLayouts,
  buildExperienceSalaryChartData,
  type ExperienceSalaryGroupBy,
} from '../../lib/experience-salary-chart-data';
import type { ProviderRecord } from '../../types/provider';

// Deeper, dashboard-style palette
const SERIES_COLORS = [
  '#4338ca', // indigo-700
  '#047857', // emerald-700
  '#b91c1c', // red-700
  '#b45309', // amber-700
  '#6d28d9', // violet-700
  '#0f766e', // teal-700
];

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export interface ExperienceSalaryTrendChartProps {
  records: ProviderRecord[];
  groupBy: ExperienceSalaryGroupBy;
}

export function ExperienceSalaryTrendChart({
  records,
  groupBy,
}: ExperienceSalaryTrendChartProps) {
  const chartData = useMemo(
    () => buildExperienceSalaryChartData(records, groupBy),
    [records, groupBy]
  );

  const labelLayoutByEmployeeId = useMemo(
    () => assignExperienceScatterLabelLayouts(chartData.allPoints),
    [chartData.allPoints]
  );

  const hasData = chartData.allPoints.length > 0;

  const option = useMemo((): EChartsOption => {
    const series = chartData.series.map((s, idx) => ({
      name: s.name,
      type: 'scatter' as const,
      data: s.points.map((p) => {
        const layout = labelLayoutByEmployeeId.get(p.employeeId);
        return {
          value: [p.yoe, p.salaryAt1Fte] as [number, number],
          name: p.providerName?.trim() || p.employeeId || '—',
          groupLabel: p.groupLabel,
          label: layout
            ? {
                position: layout.position,
                offset: layout.offset,
              }
            : { position: 'right' as const },
        };
      }),
      symbolSize: 14,
      itemStyle: {
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffsetY: 2,
      },
      emphasis: {
        scale: 1.25,
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 14,
          shadowColor: 'rgba(0,0,0,0.18)',
        },
      },
      label: {
        show: true,
        position: 'right' as const,
        distance: 6,
        formatter: (params: unknown) => (params as { data?: { name?: string } })?.data?.name ?? '—',
        fontSize: 12,
        fontWeight: 500,
        color: '#334155',
      },
    }));

    return {
      backgroundColor: '#f8fafc',
      grid: {
        left: 108,
        right: 148,
        top: 28,
        bottom: 52,
        containLabel: false,
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        shadowColor: 'rgba(0,0,0,0.04)',
        shadowBlur: 8,
        shadowOffsetY: 2,
      },
      xAxis: {
        type: 'value',
        name: 'Years of experience',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { fontSize: 14, fontWeight: 600, color: '#334155' },
        axisLine: { lineStyle: { color: '#94a3b8', width: 1 } },
        axisTick: { show: true, lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569', fontSize: 12, fontWeight: 500 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 } },
      },
      yAxis: {
        type: 'value',
        name: 'Base salary at 1.0 FTE',
        nameLocation: 'middle',
        nameGap: 72,
        nameTextStyle: { fontSize: 14, fontWeight: 600, color: '#334155' },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#475569',
          fontSize: 12,
          fontWeight: 500,
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 } },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        padding: [14, 18],
        textStyle: { fontSize: 13, color: '#334155' },
        shadowBlur: 16,
        shadowColor: 'rgba(0,0,0,0.12)',
        formatter: (params: unknown) => {
          const p = params as { data?: { name?: string; value?: [number, number]; groupLabel?: string } };
          const d = p?.data;
          if (!d?.value || !Array.isArray(d.value)) return '';
          const [yoe, salary] = d.value;
          const lines = [
            `<div style="font-weight:600;color:#0f172a;font-size:14px">${d.name ?? '—'}</div>`,
            `<div style="margin-top:6px;color:#475569">YOE: ${yoe} · ${formatCurrency(salary)} at 1.0 FTE</div>`,
          ];
          if (d.groupLabel != null && d.groupLabel !== '') {
            lines.push(`<div style="margin-top:2px;font-size:11px;color:#64748b">${d.groupLabel}</div>`);
          }
          return lines.join('');
        },
      },
      series,
    };
  }, [chartData, labelLayoutByEmployeeId]);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 p-10 text-center min-h-[320px]">
        <p className="text-slate-600 font-medium">No data for trend</p>
        <p className="text-sm text-slate-500 mt-1">
          Adjust filters or ensure providers have years of experience and base salary (at 1.0 FTE).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800 mb-1 tracking-tight">
        Base salary at 1.0 FTE by years of experience
      </h3>
      <p className="text-sm text-slate-500 mb-4">Each point is one provider; compare trend across experience.</p>
      <div className="w-full h-[480px] min-h-0">
        <ReactECharts option={option} style={{ width: '100%', height: '100%' }} notMerge />
      </div>
      {chartData.series.length > 1 && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2" role="list" aria-label="Series legend">
          {chartData.series.map((series, idx) => (
            <div key={series.name} className="flex items-center gap-2" role="listitem">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                aria-hidden
              />
              <span className="text-sm font-medium text-slate-700">{series.name}</span>
              <span className="text-slate-400 text-xs">({series.points.length})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
