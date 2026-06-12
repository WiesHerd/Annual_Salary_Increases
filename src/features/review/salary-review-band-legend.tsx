/**
 * Compact inline legend for experience-band row highlighting on the merit review grid.
 */

const BAND_LEGEND_ITEMS = [
  { key: 'below', label: 'Below target', swatch: 'border-amber-400 bg-amber-100' },
  { key: 'in', label: 'In range', swatch: 'border-emerald-400 bg-emerald-100' },
  { key: 'above', label: 'Above target', swatch: 'border-sky-400 bg-sky-100' },
] as const;

export function SalaryReviewBandLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2 border-b border-slate-100 bg-slate-50/60 text-xs text-slate-600"
      aria-label="Row color legend"
    >
      <span className="font-medium text-slate-500 shrink-0">Band alignment</span>
      {BAND_LEGEND_ITEMS.map(({ key, label, swatch }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 shrink-0 rounded border-2 ${swatch}`} aria-hidden />
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
