/**
 * Policy Help: detailed guide on how the Compensation Policy Engine works and how to build policies effectively.
 */

import type { ReactNode } from 'react';
import { POLICY_STAGE_LABELS, POLICY_STAGE_ORDER, CONFLICT_STRATEGY_LABELS } from '../../types/compensation-policy';
import type { PolicyStage } from '../../types/compensation-policy';
import { CONDITION_FACT_OPTIONS } from '../../lib/policy-engine/condition-builder';

export interface PolicyHelpPageProps {
  /** Called when user clicks a link to go to Controls (Parameters). */
  onNavigateToParameters?: () => void;
}

const STAGE_ORDER: PolicyStage[] = [...POLICY_STAGE_ORDER];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">{title}</h2>
      <div className="text-sm text-slate-700 space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-medium text-slate-800 mb-2">{title}</h3>
      <div className="text-sm text-slate-700 space-y-2">{children}</div>
    </div>
  );
}

export function PolicyHelpPage({ onNavigateToParameters }: PolicyHelpPageProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Policy Engine help</h1>
        <p className="text-slate-600 mt-1">
          How the Compensation Policy Engine works and how to build policies effectively for annual salary increases.
        </p>
      </div>

      <Section title="Overview">
        <p>
          The policy engine determines one recommended increase (or outcome) per provider. Policies run in a fixed
          order by <strong>stage</strong>, then by <strong>priority</strong> within each stage. When a policy matches
          a provider and applies (e.g. sets or modifies the increase), later policies may still run depending on
          conflict strategy and whether the policy has &quot;stop processing&quot; set. The final result is used in
          Salary Review and Compare Scenarios.
        </p>
      </Section>

      <Section title="Evaluation order">
        <p>
          Policies run in five stages, in this order. Within each stage, lower <strong>priority number</strong> runs
          first (e.g. priority 5 before 50).
        </p>
        <ol className="list-decimal list-inside space-y-1.5 mt-2">
          {STAGE_ORDER.map((stage, i) => (
            <li key={stage}>
              <strong>{POLICY_STAGE_LABELS[stage]}</strong> — {i + 1}. Run first for exclusions and guardrails; last for
              caps and floors.
            </li>
          ))}
        </ol>
        <p className="mt-3">
          <strong>Fallback</strong> policies run only when no other policy has set a result yet. Use this for your
          default General Merit Matrix so it applies when no guardrail, custom model, or modifier has already
          determined the increase.
        </p>
      </Section>

      <Section title="Policy types">
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

      <Section title="Targeting">
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

      <Section title="Actions and conflict strategy">
        <p>
          Each policy has one or more <strong>actions</strong> (e.g. &quot;Force increase to 0%&quot;,
          &quot;Add 0.5%&quot;, &quot;Cap at 5%&quot;) and a <strong>conflict strategy</strong> that defines how it
          interacts with the current result:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          {Object.entries(CONFLICT_STRATEGY_LABELS).map(([key, label]) => (
            <li key={key}>
              <strong>{label}</strong> — {key.replace(/_/g, ' ').toLowerCase()}
            </li>
          ))}
        </ul>
        <p className="mt-3">
          <strong>Stop processing</strong>: when enabled, no later policies run for that provider after this one
          applies. Use for guardrails that must be the final word (e.g. FMV zero-out).
        </p>
      </Section>

      <Section title="Priority and fallback">
        <p>
          Within a stage, lower priority number runs first. Use <strong>Fallback</strong> for the policy that should
          apply only when no other policy has set a result—typically your single General Merit Matrix. Reserve
          high priority (e.g. 0–25) for guardrails and overrides that must run early; use medium (50) for
          modifiers and low (75–100) or fallback for defaults and caps.
        </p>
      </Section>

      <Section title="Best practices">
        <ul className="list-disc list-inside space-y-1.5">
          <li>Use <strong>one</strong> General Merit Matrix policy as fallback so everyone has a default result.</li>
          <li>Put guardrails and exclusions first (they run in the Exclusions / Guardrails stage).</li>
          <li>Use the <strong>Simulator</strong> (Controls → Compensation Policy Engine → Simulator) to test
            policies on sample providers before rolling out.
          </li>
          <li>Start from <strong>Add from library</strong> templates and adjust targeting and conditions to fit
            your organization.
          </li>
          <li>Name policies clearly (e.g. &quot;FMV cap – TCC above 75th&quot;) so the evaluation path in Salary
            Review is easy to follow.
          </li>
        </ul>
      </Section>

      <Section title="Where to go next">
        <p className="mb-3">From Controls → Compensation Policy Engine you can:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Dashboard</strong> — See active policies and evaluation pipeline order.
          </li>
          <li>
            <strong>Policy library</strong> — Create new policies, add from library (templates), edit, duplicate, or
            archive.
          </li>
          <li>
            <strong>Simulator</strong> — Run the engine on one provider to see which policies match and the final
            recommendation.
          </li>
        </ul>
        {onNavigateToParameters && (
          <p className="mt-4">
            <button
              type="button"
              onClick={onNavigateToParameters}
              className="text-indigo-600 font-medium hover:underline"
            >
              Go to Controls →
            </button>
          </p>
        )}
      </Section>
    </div>
  );
}
