/**
 * Shared layout and control styling for Parameters sub-tabs.
 * Aligns table-based screens with Guardrails (experience bands): same primary CTA,
 * field focus rings, soft “card” table shell, and intro callouts.
 */

/** Primary action — matches Guardrails “Add band”. */
export const parametersPrimaryButtonClass =
  'shrink-0 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm';

/** Standard text/number/date inputs inside settings tables. */
export const parametersFieldInputClass =
  'min-w-0 px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

/** Selects in settings tables (same chrome as inputs). */
export const parametersFieldSelectClass = `${parametersFieldInputClass} bg-white`;

/** Wraps overflow-x-auto tables — rounded “card” without the guardrail left stripe. */
export const parametersTablePanelClass =
  'overflow-x-auto rounded-2xl border border-slate-300/90 bg-white shadow-md shadow-slate-900/[0.06]';

/** Context line at top of a tab (indigo accent). */
export const parametersIntroCalloutClass =
  'mb-6 max-w-2xl border-l-[4px] border-indigo-500 pl-4 text-sm leading-snug text-slate-600';

export const parametersSectionHeadingClass = 'text-lg font-semibold text-slate-800';

export const parametersSectionDescriptionClass = 'text-sm text-slate-600 mt-1 leading-relaxed';

/** Empty list placeholder — matches Guardrails “no bands” panel. */
export const parametersEmptyRowsPanelClass =
  'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 px-6 py-14 text-center';
