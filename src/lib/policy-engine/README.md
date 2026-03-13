# Compensation Policy Engine

The policy engine computes **annual salary increase recommendations** using a staged, auditable pipeline. It is used by the Annual Salary Review table and supports general merit matrix, custom models (e.g. PCP YOE tiers), modifiers, guardrails, and caps/floors.

## Evaluation stages (order)

1. **EXCLUSION_GUARDRAIL** – Hard stops (e.g. TCC > 75th → 0%, manual review).
2. **CUSTOM_MODEL** – Replace default with a targeted model (e.g. PCP YOE tier table).
3. **MODIFIER** – Additive or other adjustments (e.g. wRVU > 60 → +1%).
4. **GENERAL_MATRIX** – Default merit matrix (evaluation score + performance category → %).
5. **CAP_FLOOR** – Final caps/floors (e.g. max 6%, min 2%).

Policies are sorted by stage, then by priority within stage. Each policy has a **target scope** (provider type, specialty, division, etc.) and optional **conditions** (JsonLogic). When a policy matches, its **actions** are applied (SET_BASE, ADD_INCREASE_PERCENT, CAP, FLOOR, FLAG_MANUAL_REVIEW, etc.). **Conflict strategy** and **stopProcessing** control how results are combined.

## Key modules

- **facts.ts** – Build flat facts from `ProviderRecord` for condition evaluation.
- **targeting.ts** – Match policy target scope to facts.
- **conditions.ts** – Evaluate JsonLogic condition tree (thin wrapper around `json-logic-js`).
- **stages.ts** – Stage order and sort helpers.
- **matrix-resolver.ts** – Look up default % from general merit matrix.
- **custom-model-resolver.ts** – Resolve base % and tier from custom models (e.g. YOE tier table).
- **evaluator.ts** – `evaluatePolicyForProvider(record, context)` and `evaluateAllRecords(records, context)`.

## Context

`PolicyEvaluationContext` includes:

- `policies` – Active policies (status active, effective dates).
- `customModels` – Custom compensation models.
- `tierTables` – Tier tables for YOE-based models.
- `meritMatrixRows` – General merit matrix (evaluation score + performance → %).
- `marketRow` – Optional market row for TCC percentile.

## Integration

- **Salary Review page** – Builds context from `usePolicyEngineState()` and `useParametersState()`, runs `evaluatePolicyForProvider` per record (with market row), stores results in a `Map`. Table columns and recalc use this map; policy source is clickable and deep-links to Control Panel → Policy engine → Rules.
- **recalculateProviderRow** – Accepts optional `policyResult`; uses `finalRecommendedIncreasePercent` as default when no user override and merges policy metadata onto the returned record.
- **Export** – `exportToCsv` / `exportToXlsx` accept optional `evaluationResults` map so exported rows include policy source, type, explanation, tier, manual review flag.

## Setting up tiered compensation (specialty/division + YOE tiers)

To target specific specialties or divisions with different base salaries or increase % by years of experience:

1. **Create policy** → Choose **YOE Tier (Base Salary)** or **YOE Tier (Increase %)**
2. **Target** – Select specialties (e.g. Cardiology) and/or divisions (e.g. PCP). Only matched providers receive the tiered model.
3. **Action** – Define tier rows: Min YOE, Max YOE, Label, and either Base Salary ($) or Increase %.
4. YOE boundaries must not overlap (e.g. 0–4, 4.01–8, 8.01–999). Use `find()` order: first matching row wins.

**Example:** Cardiology division → 0–4 YOE = $280k, 5–9 YOE = $320k, 10+ YOE = $360k.

You can also **Add from library** → use tiered templates (e.g. "Cardiology – Base salary by YOE tier") and edit them.

## Targeted scenarios: how policies work together

To avoid policies stepping over each other, use **stage order** and **surgical targeting**:

1. **FMV guardrail first (EXCLUSION_GUARDRAIL)**  
   If TCC percentile > 75th, force 0% and flag for manual review. This is a fair market value consideration and must take precedence over any other policy. Use template **"FMV cap – TCC above 75th percentile"** or **"High TCC guardrail"**. Both run in stage 1 with `stopProcessing: true` so no later logic overrides the 0%.

2. **Specialty-specific base increases (CUSTOM_MODEL)**  
   - **Cardiology 4%** – Template **"Cardiology – 4% fixed increase"** targets Cardiology / Cardiovascular Disease only; others fall through to merit matrix or other custom models.  
   - **General Pediatrics YOE tiers** – Template **"General Pediatrics – Increase % by YOE tier"** targets General Pediatrics and Pediatrics only. Other specialties are not affected.

3. **Caps and floors last (CAP_FLOOR)**  
   Apply max/min (e.g. cap 6%, floor 2%) after the base increase is set.

Add these policies via **Parameters → Policy engine → Rules** → **Add from library** (individual templates: FMV 75th guardrail, Cardiology 4% fixed, General Pediatrics YOE tiers, cap/floor). Run Salary Review to see who gets which policy; FMV will zero out anyone above 75th before any other policy applies.

## Adding a new policy type or action

1. **Policy type** – Add a display label in the Rule library; stage and conflict strategy already support all described behaviors.
2. **Action type** – Extend `PolicyActionType` in `src/types/compensation-policy.ts` and handle the new action in `evaluator.ts` inside `applyPolicyActions`.

## Storage

Policies, custom models, and tier tables are stored in localStorage via `policy-engine-storage.ts` and loaded/saved in `usePolicyEngineState()`.
