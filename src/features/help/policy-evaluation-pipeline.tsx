/**
 * Visual pipeline for policy engine stages (single source for help copy + diagram).
 */

import {
  POLICY_STAGE_LABELS,
  POLICY_STAGE_ORDER,
  POLICY_STAGE_DESCRIPTIONS,
} from '../../types/compensation-policy';
export { POLICY_STAGE_DESCRIPTIONS };

function DownArrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  );
}

export function PolicyEvaluationPipeline() {
  const stages = [...POLICY_STAGE_ORDER];

  return (
    <figure className="my-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <figcaption className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
        Policy evaluation runs in this order (top to bottom)
      </figcaption>
      <ol
        className="m-0 list-none space-y-0 bg-slate-50/50 p-4"
        aria-label="Policy evaluation stages in order"
      >
        {stages.map((stage, index) => (
          <li key={stage} className="list-none">
            {index > 0 && <DownArrow />}
            <div className="flex gap-3 rounded-lg border border-slate-200 border-l-4 border-l-indigo-600 bg-white px-3 py-3 text-left shadow-sm">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white"
                aria-hidden
              >
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">{POLICY_STAGE_LABELS[stage]}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{POLICY_STAGE_DESCRIPTIONS[stage]}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
