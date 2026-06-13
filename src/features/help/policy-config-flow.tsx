/**
 * Schematic: where in the app configuration and data feed merit review / compare.
 */

import type { ReactNode } from 'react';

function FlowArrow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center text-indigo-500 ${className}`}
      aria-hidden
    >
      <svg
        className="h-6 w-6 sm:hidden rotate-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <svg
        className="hidden h-6 w-6 sm:block"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </div>
  );
}

type FlowCardProps = { title: string; children: ReactNode };

function FlowCard({ title, children }: FlowCardProps) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-slate-200 border-l-4 border-l-indigo-600 bg-white px-3 py-3 shadow-sm">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1.5 text-xs leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

export function PolicyConfigFlow() {
  return (
    <figure className="my-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <figcaption className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
        Where things live in the app
      </figcaption>
      <ul
        className="m-0 flex min-w-0 list-none flex-col items-stretch gap-2 bg-slate-50/50 p-4 sm:flex-row sm:items-stretch sm:gap-3"
        aria-label="Configuration flow from data to outcomes"
      >
        <li className="min-w-0 flex flex-1 flex-col list-none sm:flex-row sm:items-center">
          <FlowCard title="Data">
            <strong>Import data</strong> and <strong>Data browser</strong>: provider roster, compensation and wRVUs;
            market survey; evaluations; incentives (TCC rollup). Feeds percentiles and facts policies use.
          </FlowCard>
        </li>
        <li className="flex list-none justify-center sm:contents" aria-hidden>
          <FlowArrow className="py-1 sm:py-0 sm:px-1" />
        </li>
        <li className="min-w-0 flex flex-1 flex-col list-none sm:flex-row sm:items-center">
          <FlowCard title="Controls">
            <strong>Cycle &amp; budget</strong>, <strong>Merit matrix</strong> / experience bands, mappings, and{' '}
            <strong>Policies → Policy library</strong> for engine rules.
          </FlowCard>
        </li>
        <li className="flex list-none justify-center sm:contents" aria-hidden>
          <FlowArrow className="py-1 sm:py-0 sm:px-1" />
        </li>
        <li className="min-w-0 flex flex-1 flex-col list-none sm:flex-row sm:items-center">
          <FlowCard title="Outcomes">
            <strong>Merit review</strong> shows recommended increases and overrides. <strong>Policy sandbox</strong>{' '}
            runs two configs side-by-side (optional what-if).
          </FlowCard>
        </li>
      </ul>
    </figure>
  );
}
