/**
 * Policy Help: detailed guide on how the Compensation Policy Engine works and how to build policies effectively.
 */

import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import { useTocScrollSpy } from '../../components/help/use-toc-scroll-spy';
import { mainDockedTocArticlePaddingClass, useMainDockedPanelStyle } from '../../hooks/use-main-docked-panel-style';
import { CONDITION_FACT_OPTIONS } from '../../lib/policy-engine/condition-builder';
import { PolicyConfigFlow } from './policy-config-flow';
import { PolicyEvaluationPipeline } from './policy-evaluation-pipeline';
import { useAppNavigation } from '../../context/app-navigation-context';

/** Manual-style chapters (order = table of contents). IDs are stable for scroll targets — not URL hash (app uses #view). */
const HELP_CHAPTERS = [
  { id: 'help-overview', title: 'Overview' },
  { id: 'help-evaluation-order', title: 'Evaluation order' },
  { id: 'help-policy-types', title: 'Policy types' },
  { id: 'help-targeting', title: 'Targeting' },
  { id: 'help-actions-conflict', title: 'Actions and conflict strategy' },
  { id: 'help-priority-fallback', title: 'Priority and fallback' },
  { id: 'help-best-practices', title: 'Best practices' },
  { id: 'help-where-next', title: 'Where to go next' },
] as const;

const CHAPTER_IDS = HELP_CHAPTERS.map((c) => c.id);

const CONFLICT_STRATEGIES: { strategy: string; when: string; stage: string }[] = [
  { strategy: 'Override and set the result', when: 'Guardrail to 0%, or force a specific %', stage: 'Exclusions / Overrides' },
  { strategy: 'Replace the base result', when: 'Custom model or merit matrix becomes the baseline', stage: 'Custom models / Merit matrix' },
  { strategy: 'Add to the current result', when: 'Modifier (+0.5% for high wRVU, etc.)', stage: 'Modifiers' },
  { strategy: 'Cap the result at a maximum', when: 'Limit how high the increase can go', stage: 'Caps / Floors' },
  { strategy: 'Set a minimum floor', when: 'Guarantee a minimum increase %', stage: 'Caps / Floors' },
  { strategy: 'Block automation (require manual review)', when: 'FMV or compliance — flag without auto-applying', stage: 'Exclusions' },
  { strategy: 'Apply only when no other policy has set a result', when: 'Single General Merit Matrix fallback', stage: 'Merit matrix' },
  { strategy: 'Annotate only (do not change the result)', when: 'Audit notes or labels only', stage: 'Any' },
];

const POLICY_TYPES: { name: string; stage: string; use: string }[] = [
  { name: 'General Merit Matrix', stage: 'Merit matrix', use: 'Default score → increase table; use one as fallback' },
  { name: 'Guardrail', stage: 'Exclusions', use: 'FMV / compliance stops (e.g. TCC above 75th → 0%)' },
  { name: 'Modifier', stage: 'Modifiers', use: 'Add or adjust % on top of base result' },
  { name: 'Cap / Floor', stage: 'Caps / Floors', use: 'Limit max or min increase %' },
  { name: 'Manual Review', stage: 'Exclusions', use: 'Flag for review without changing the %' },
  { name: 'Override', stage: 'Custom models', use: 'Force a specific increase for a group' },
  { name: 'YOE Tier (Increase %)', stage: 'Custom models', use: 'Band table by years of experience' },
  { name: 'YOE Tier (Base Salary)', stage: 'Custom models', use: 'Fixed base salary by YOE band' },
];

function GuideLinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-800 shadow-sm transition-colors hover:bg-indigo-50 hover:border-indigo-300"
    >
      {children}
    </button>
  );
}

function scrollToChapter(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function HelpTocNav({
  activeId,
  className = '',
  onAfterNavigate,
}: {
  activeId: string;
  className?: string;
  /** e.g. close the mobile chapter drawer after jump */
  onAfterNavigate?: () => void;
}) {
  return (
    <nav className={className} aria-label="Policy help chapters">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">On this page</p>
      <ol className="mt-3 space-y-0.5">
        {HELP_CHAPTERS.map((ch, index) => {
          const isActive = activeId === ch.id;
          return (
            <li key={ch.id}>
              <button
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  scrollToChapter(ch.id);
                  onAfterNavigate?.();
                }}
                className={`w-full rounded-md py-1.5 pl-2 -ml-2 pr-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-indigo-50 font-semibold text-indigo-900 ring-1 ring-indigo-200/80'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="mr-1.5 font-medium tabular-nums text-slate-400" aria-hidden>
                  {index + 1}.
                </span>
                {ch.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-8">
      <h2 className="mb-4 border-b-2 border-slate-900/90 pb-2 text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-800">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

export function PolicyHelpPage() {
  const { openControls, navigateToView } = useAppNavigation();
  const sectionIds = useMemo(() => [...CHAPTER_IDS], []);
  const activeChapterId = useTocScrollSpy(sectionIds, {});
  const mobileTocRef = useRef<HTMLDetailsElement>(null);
  const { dockedStyle, isLg } = useMainDockedPanelStyle();

  return (
    <div className="relative w-full flex flex-col">
      <div className={`min-w-0 w-full ${mainDockedTocArticlePaddingClass}`}>
        <div className="sticky top-4 z-30 mb-6 bg-[#f8fafc]/95 pb-2 pt-1 backdrop-blur-sm lg:static lg:z-auto lg:mb-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <details
            ref={mobileTocRef}
            className="group rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden open:shadow-md"
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                On this page
                <svg
                  className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="border-t border-slate-200 px-4 py-3">
              <HelpTocNav
                activeId={activeChapterId}
                onAfterNavigate={() => mobileTocRef.current?.removeAttribute('open')}
              />
            </div>
          </details>
        </div>

      <div className="mb-8 border-l-4 border-indigo-600 pl-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Policy guide</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          How the compensation policy engine works and how to build effective rules for annual merit increases.
        </p>
        <p className="mt-3 text-xs text-slate-600">
          Skim the sections below, or use <span className="lg:hidden">the chapter list above</span>
          <span className="hidden lg:inline">the outline on the right</span> to jump.
        </p>
      </div>

      <div className="mb-10 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-4">
        <h2 className="text-sm font-semibold text-indigo-900">Quick start — first merit cycle</h2>
        <ol className="mt-2 list-decimal list-inside space-y-1.5 text-sm leading-relaxed text-slate-700">
          <li>
            <strong>Import data</strong> — provider roster, market survey, and evaluations.
          </li>
          <li>
            <strong>Controls</strong> — set review cycle, merit matrix, and type → market mappings.
          </li>
          <li>
            <strong>Policies</strong> — add one General Merit Matrix (fallback) plus guardrails or modifiers as needed.
          </li>
          <li>
            <strong>Merit review</strong> — run the cycle; use <strong>Policy sandbox</strong> to compare configs.
          </li>
        </ol>
      </div>

      <Section id="help-overview" title="Overview">
        <p>
          The policy engine determines one recommended increase (or outcome) per provider. Policies run in a fixed
          order by <strong>stage</strong>, then by <strong>priority</strong> within each stage. When a policy matches
          a provider and applies (e.g. sets or modifies the increase), later policies may still run depending on
          conflict strategy and whether the policy has &quot;stop processing&quot; set. The final result is used in
          Merit review and Policy Sandbox.
        </p>
        <PolicyConfigFlow />
      </Section>

      <Section id="help-evaluation-order" title="Evaluation order">
        <PolicyEvaluationPipeline />
        <p className="mt-3">
          Within each stage, lower <strong>priority number</strong> runs first (e.g. priority 5 before 50).{' '}
          <strong>Fallback</strong> policies run only when no other policy has set a result yet — typically your
          single General Merit Matrix.
        </p>
      </Section>

      <Section id="help-policy-types" title="Policy types">
        <p>Choose the type when creating a policy. Each type maps to a stage and typical use.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 font-semibold text-slate-700">Type</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Stage</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Typical use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {POLICY_TYPES.map((row) => (
                <tr key={row.name} className="text-slate-800">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                  <td className="px-3 py-2 text-slate-600">{row.stage}</td>
                  <td className="px-3 py-2 text-slate-700">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="help-targeting" title="Targeting">
        <SubSection title="Target scope">
          <p>
            Define <strong>who</strong> the policy applies to: specialty, division, department, provider type,
            locations, compensation plan type, YOE range, TCC/wRVU percentile range, or specific provider IDs.
            Leave a filter empty to mean &quot;all&quot; for that dimension. Combined filters are ANDed: e.g.
            specialty = Cardiology AND division = East matches only providers in both.
          </p>
        </SubSection>
        <SubSection title="Conditions">
          <p>
            Optional extra filters using provider facts. All conditions are combined with AND or OR (you choose).
            Available facts include:
          </p>
          <ul className="list-disc list-inside mt-1">
            {CONDITION_FACT_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <strong>{opt.label}</strong> ({opt.value})
              </li>
            ))}
          </ul>
          <p className="mt-2">
            For tiered policies (e.g. YOE tiers), leave conditions empty so the policy applies to all providers in
            the target scope; add conditions only when you need an extra filter.
          </p>
        </SubSection>
      </Section>

      <Section id="help-actions-conflict" title="Actions and conflict strategy">
        <p>
          Each policy has one or more <strong>actions</strong> (e.g. &quot;Force increase to 0%&quot;,
          &quot;Add 0.5%&quot;, &quot;Cap at 5%&quot;) and a <strong>conflict strategy</strong> that describes how it
          interacts with the current result.
        </p>
        <SubSection title="Conflict strategy options">
          <p className="mb-2">Choose the option that best matches what this policy does:</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-semibold text-slate-700">Strategy</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">When to use</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Typical stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {CONFLICT_STRATEGIES.map((row) => (
                  <tr key={row.strategy} className="text-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-900">{row.strategy}</td>
                    <td className="px-3 py-2 text-slate-700">{row.when}</td>
                    <td className="px-3 py-2 text-slate-600">{row.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
        <p className="mt-3">
          <strong>Stop processing</strong>: when enabled, no later policies run for that provider after this one
          applies. Use for guardrails that must be the final word (e.g. FMV zero-out).
        </p>
      </Section>

      <Section id="help-priority-fallback" title="Priority and fallback">
        <p>
          Within a stage, lower priority number runs first. Use <strong>Fallback</strong> for the policy that should
          apply only when no other policy has set a result—typically your single General Merit Matrix. Reserve
          high priority (e.g. 0–25) for guardrails and overrides that must run early; use medium (50) for
          modifiers and low (75–100) or fallback for defaults and caps.
        </p>
      </Section>

      <Section id="help-best-practices" title="Best practices">
        <ul className="list-disc list-inside space-y-1.5">
          <li>Use <strong>one</strong> General Merit Matrix policy as fallback so everyone has a default result.</li>
          <li>Put exclusions first (they run in the Exclusions stage before merit matrix and caps).</li>
          <li>Use <strong>Policy sandbox</strong> to run two policy configs (e.g. current vs merit-only) and see
            impact side-by-side; use <strong>Merit review</strong> and the provider detail panel to see why a given
            provider got a specific recommendation.
          </li>
          <li>Start from <strong>Add from library</strong> templates and adjust targeting and conditions to fit
            your organization.
          </li>
          <li>Name policies clearly (e.g. &quot;FMV cap – TCC above 75th&quot;) so the evaluation path in Merit
            review is easy to follow.
          </li>
        </ul>
      </Section>

      <Section id="help-where-next" title="Where to go next">
        <p className="mb-4 text-sm text-slate-700">
          Open the area you need — policies are listed in evaluation order (stage, then priority) in the Policy
          library.
        </p>
        <div className="flex flex-wrap gap-2">
          <GuideLinkButton onClick={() => openControls('policy-engine-rules')}>Policy library</GuideLinkButton>
          <GuideLinkButton onClick={() => navigateToView('salary-review')}>Merit review</GuideLinkButton>
          <GuideLinkButton onClick={() => navigateToView('compare')}>Policy sandbox</GuideLinkButton>
          <GuideLinkButton onClick={() => openControls('merit')}>Merit matrix</GuideLinkButton>
        </div>
      </Section>
      </div>

      {isLg && dockedStyle.position === 'fixed' ? (
        <div
          role="complementary"
          className="border-l border-slate-200 bg-[#f8fafc]/98 pl-4 pr-1 backdrop-blur-sm"
          style={dockedStyle}
          aria-label="Policy help outline"
        >
          <HelpTocNav activeId={activeChapterId} />
        </div>
      ) : null}
    </div>
  );
}
