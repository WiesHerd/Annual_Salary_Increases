import { lazy, Suspense, type ComponentProps } from 'react';

const ExperienceSalaryTrendChartLazy = lazy(() =>
  import('./experience-salary-trend-chart').then((m) => ({ default: m.ExperienceSalaryTrendChart }))
);

export function LazyExperienceSalaryTrendChart(
  props: ComponentProps<typeof ExperienceSalaryTrendChartLazy>
) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
          Loading chart…
        </div>
      }
    >
      <ExperienceSalaryTrendChartLazy {...props} />
    </Suspense>
  );
}
