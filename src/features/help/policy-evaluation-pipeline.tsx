/**
 * Visual pipeline for policy engine stages (single source for help copy + diagram).
 */

import { POLICY_STAGE_LABELS, POLICY_STAGE_ORDER } from '../../types/compensation-policy';
import type { PolicyStage } from '../../types/compensation-policy';

/** One-line description per stage (matches POLICY_STAGE_ORDER). */
export const POLICY_STAGE_DESCRIPTIONS: Record<PolicyStage, string> = {
  EXCLUSION_GUARDRAIL:
    'Hard stops and guardrails first—e.g. exclude from standard processing, zero out increases, or flag manual review before other stages apply.',
  CUSTOM_MODEL:
    'Plan-specific models (e.g. YOE tier tables) that set or replace the base increase for providers who match.',
  MODIFIER:
    'Adjustments on top of the current result—typically additive (e.g. +% for high productivity) after a base is set.',
  GENERAL_MATRIX:
    'Default merit matrix from evaluation score and performance category—often used as a single fallback when no custom model applied.',
  CAP_FLOOR:
    'Final limits on the increase %—maximum caps and minimum floors so every result stays within policy bounds.',
};

function DownArrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  );
}

export function PolicyEvaluationPipeline() {
  const stages = [...POLICY_STAGE_ORDER];

  return (
    <figure className="my-5 overflow-hidden rounded-xl border-2 border-slate-800/90 shadow-lg shadow-slate-900/15">
      <figcaption className="bg-slate-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-100">
        Policy evaluation runs in this order (top to bottom)
      </figcaption>
      <ol
        className="m-0 list-none space-y-0 bg-slate-200/90 p-4"
        aria-label="Policy evaluation stages in order"
      >
        {stages.map((stage, index) => (
          <li key={stage} className="list-none">
            {index > 0 && <DownArrow />}
            <div className="flex gap-3 rounded-lg border border-slate-300 border-l-4 border-l-indigo-600 bg-white px-3 py-3 text-left shadow-sm">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white"
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
