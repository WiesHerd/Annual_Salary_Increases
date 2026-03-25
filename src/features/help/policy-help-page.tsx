/**
 * Policy Help: detailed guide on how the Compensation Policy Engine works and how to build policies effectively.
 */

import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import { useTocScrollSpy } from '../../components/help/use-toc-scroll-spy';
import { mainDockedTocArticlePaddingClass, useMainDockedPanelStyle } from '../../hooks/use-main-docked-panel-style';
import { POLICY_STAGE_LABELS, POLICY_STAGE_ORDER } from '../../types/compensation-policy';
import type { PolicyStage } from '../../types/compensation-policy';
import { CONDITION_FACT_OPTIONS } from '../../lib/policy-engine/condition-builder';
import { PolicyConfigFlow } from './policy-config-flow';
import { PolicyEvaluationPipeline, POLICY_STAGE_DESCRIPTIONS } from './policy-evaluation-pipeline';

export interface PolicyHelpPageProps {
  /** Called when user clicks a link to go to Controls (Parameters). */
  onNavigateToParameters?: () => void;
}

const STAGE_ORDER: PolicyStage[] = [...POLICY_STAGE_ORDER];

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

export function PolicyHelpPage({ onNavigateToParameters }: PolicyHelpPageProps) {
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
            className="group rounded-xl border-2 border-slate-800/90 bg-white shadow-md lg:hidden open:shadow-lg"
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

      <div className="mb-10 border-l-4 border-indigo-600 pl-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Policy Engine help</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          How the Compensation Policy Engine works and how to build policies effectively for annual salary increases.
        </p>
        <p className="mt-3 text-xs text-slate-600">
          Skim the sections below, or use <span className="lg:hidden">the chapter list above</span>
          <span className="hidden lg:inline">the outline on the right</span> to jump.
        </p>
      </div>

      <Section id="help-overview" title="Overview">
        <p>
          The policy engine determines one recommended increase (or outcome) per provider. Policies run in a fixed
          order by <strong>stage</strong>, then by <strong>priority</strong> within each stage. When a policy matches
          a provider and applies (e.g. sets or modifies the increase), later policies may still run depending on
          conflict strategy and whether the policy has &quot;stop processing&quot; set. The final result is used in
          Salary Review and Compare Scenarios.
        </p>
        <PolicyConfigFlow />
      </Section>

      <Section id="help-evaluation-order" title="Evaluation order">
        <PolicyEvaluationPipeline />
        <p>
          Policies run in five stages, in this order. Within each stage, lower <strong>priority number</strong> runs
          first (e.g. priority 5 before 50).
        </p>
        <ol className="list-decimal list-inside space-y-1.5 mt-2">
          {STAGE_ORDER.map((stage) => (
            <li key={stage}>
              <strong>{POLICY_STAGE_LABELS[stage]}</strong> — {POLICY_STAGE_DESCRIPTIONS[stage]}
            </li>
          ))}
        </ol>
        <p className="mt-3">
          <strong>Fallback</strong> policies run only when no other policy has set a result yet. Use this for your
          default General Merit Matrix so it applies when no guardrail, custom model, or modifier has already
          determined the increase.
        </p>
      </Section>

      <Section id="help-policy-types" title="Policy types">
        <p>Choose the type when creating a policy. Each type maps to a stage and typical use.</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>General Merit Matrix</strong> — Default increase table from review scores. Use as a single
            fallback policy so everyone gets a matrix result when nothing else applies.
          </li>
          <li>
            <strong>Guardrail</strong> — Stops or overrides increases when conditions are met (e.g. TCC above 75th
            → 0% and flag for manual review). Use for FMV and compliance.
          </li>
          <li>
            <strong>Modifier</strong> — Adds or adjusts the increase (e.g. +0.5% for high wRVU). Runs after base
            result is set.
          </li>
          <li>
            <strong>Cap / Floor</strong> — Caps or sets a minimum on the increase percentage. Use after modifiers
            to keep results in range.
          </li>
          <li>
            <strong>Manual Review</strong> — Requires manual review when conditions are met; does not change the
            numeric result by itself.
          </li>
          <li>
            <strong>Override</strong> — Forces a specific increase for selected providers or conditions (e.g. 4% for
            a named group).
          </li>
          <li>
            <strong>YOE Tier (Increase %)</strong> — Assigns increase % by years of experience tier (custom model).
          </li>
          <li>
            <strong>YOE Tier (Base Salary)</strong> — Assigns a fixed base salary by YOE tier instead of a merit
            percent.
          </li>
        </ul>
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
          <ul className="list-disc list-inside space-y-1.5 text-slate-700">
            <li><strong>Override and set the result</strong> — Sets the increase to a specific value (e.g. guardrail to 0%, or override to 4%). Replaces whatever was there.</li>
            <li><strong>Replace the base result</strong> — This policy’s result becomes the new baseline (e.g. custom model or merit matrix output).</li>
            <li><strong>Add to the current result</strong> — Adds a percentage on top of the current result (e.g. +0.5% for high wRVU). Used for modifiers.</li>
            <li><strong>Cap the result at a maximum</strong> — Does not let the increase go above the specified maximum. Used in the Caps / Floors stage.</li>
            <li><strong>Set a minimum floor</strong> — Does not let the increase go below the specified minimum. Used in the Caps / Floors stage.</li>
            <li><strong>Block automation (require manual review)</strong> — Flags the provider for manual review; the system does not auto-apply. Use for FMV or compliance guardrails.</li>
            <li><strong>Apply only when no other policy has set a result</strong> — Runs only when no earlier policy has set a result. Use for your single General Merit Matrix fallback.</li>
            <li><strong>Annotate only (do not change the result)</strong> — Adds notes or context without changing the numeric increase. For audit or labeling.</li>
          </ul>
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
          <li>Put guardrails and exclusions first (they run in the Exclusions / Guardrails stage).</li>
          <li>Use <strong>Compare scenarios</strong> to run two policy configs (e.g. current vs merit-only) and see
            impact side-by-side; use <strong>Salary Review</strong> and the provider detail panel to see why a given
            provider got a specific recommendation.
          </li>
          <li>Start from <strong>Add from library</strong> templates and adjust targeting and conditions to fit
            your organization.
          </li>
          <li>Name policies clearly (e.g. &quot;FMV cap – TCC above 75th&quot;) so the evaluation path in Salary
            Review is easy to follow.
          </li>
        </ul>
      </Section>

      <Section id="help-where-next" title="Where to go next">
        <p className="mb-3">In <strong>Controls → Base increases → Policy library</strong> you can create new policies,
          add from library (templates), edit, duplicate, or archive. Policies are listed in evaluation order (stage,
          then priority).
        </p>
        <p className="mt-3 text-sm text-slate-700">
          Use <strong>Compare scenarios</strong> to test configs side-by-side; use <strong>Salary Review</strong> to run
          the full cycle and open a provider to see the policy explanation.
        </p>
        {onNavigateToParameters && (
          <p className="mt-4">
            <button
              type="button"
              onClick={onNavigateToParameters}
              className="rounded-md font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:bg-indigo-50 hover:text-indigo-900 px-1 -mx-1 py-0.5 transition-colors"
            >
              Go to Controls →
            </button>
          </p>
        )}
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
