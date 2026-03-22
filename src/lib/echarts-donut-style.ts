/**
 * Shared ECharts pie/donut series defaults — Specialty map + Salary review budget
 * keep the same ring weight, shadows, and emphasis behavior.
 */

import type { PieSeriesOption } from 'echarts';

export const standardDonutPieSeriesBase: Pick<
  PieSeriesOption,
  | 'type'
  | 'radius'
  | 'center'
  | 'avoidLabelOverlap'
  | 'itemStyle'
  | 'label'
  | 'labelLine'
  | 'emphasis'
> = {
  type: 'pie',
  radius: ['50%', '80%'],
  center: ['50%', '50%'],
  avoidLabelOverlap: false,
  itemStyle: {
    borderRadius: 4,
    borderColor: '#fff',
    borderWidth: 2,
    shadowBlur: 8,
    shadowColor: 'rgba(0,0,0,0.08)',
  },
  label: { show: false },
  labelLine: { show: false },
  emphasis: {
    scale: true,
    scaleSize: 4,
    itemStyle: {
      shadowBlur: 12,
      shadowColor: 'rgba(0,0,0,0.15)',
    },
  },
};
