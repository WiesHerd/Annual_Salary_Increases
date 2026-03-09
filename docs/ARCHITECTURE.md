# Annual Provider Compensation Review — Application Architecture

This document defines the recommended architecture, structure, screens, data model, UI layout, phased build plan, and flexibility guidelines for the internal compensation planning platform. The app is **workflow-driven**, not a spreadsheet clone.

---

## 1. Recommended Application Architecture

### High-Level Principles

- **Domain-driven**: Core concepts (provider, cycle, plan, benchmark, budget) live in types and engines; UI only presents and edits.
- **Config over code**: Compensation rules, experience bands, merit matrix, plan assignment, and plan-specific logic are **configuration-driven**. Adding a new population or plan type should not require new UI branches.
- **Single source of truth**: One canonical **provider review record** per provider per cycle. Raw uploads are normalized into this shape; calculations read from it and write proposed values back.
- **Calculation outside UI**: All formulas (TCC, percentiles, merit default, budget impact) live in **lib/engines** and **lib/normalization**. Components call engine functions; they do not embed business logic.
- **Client-only (no backend)**: Data lives in browser memory and localStorage (or optional future backend). No server required for MVP.

### Architectural Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  UI Layer (React)                                                        │
│  features/*, components/* — screens, forms, tables, review workspace     │
├─────────────────────────────────────────────────────────────────────────┤
│  State & Hooks                                                           │
│  hooks/* — useAppState, useReviewWorkspace, useBudget, useConfig         │
├─────────────────────────────────────────────────────────────────────────┤
│  Domain Services                                                         │
│  lib/engines/* — calculation, merit, percentile, plan-specific logic    │
│  lib/normalization/* — raw → canonical record, FTE normalization        │
├─────────────────────────────────────────────────────────────────────────┤
│  Data & Persistence                                                      │
│  lib/storage*.ts — localStorage; types/* — entities and DTOs            │
├─────────────────────────────────────────────────────────────────────────┤
│  Ingestion                                                               │
│  lib/parse-file.ts, lib/*-parse.ts — CSV/XLSX, column mapping, validation│
└─────────────────────────────────────────────────────────────────────────┘
```

### Config-Driven Rules (Critical for Flexibility)

- **Plan assignment**: Rules (conditions on population, specialty, department, etc.) → plan type / plan template id. Stored in `PlanAssignmentRule[]`; evaluated in `lib/engines/plan-assignment.ts`.
- **Compensation plan templates**: Each template (e.g. "PCP Physician Tiered", "PCP APP Fixed Target + CF") has an id and a **template type** that points to the engine that knows how to compute proposed comp (tiers, CF, merit matrix, etc.). UI never branches on plan name; it asks the engine for "recommended increase" and "breakdown."
- **Experience bands**: Stored as config (min/max YOE, target TCC percentile low/high). One engine function: `getExperienceBand(yoe, bands)` and `getTargetPercentileRange(band)`.
- **Merit matrix**: Grid (TCC percentile band × performance band → increase %). Lookup in `lib/engines/merit-matrix.ts`.
- **Budget**: Single target pool per cycle; optional buckets by specialty/population. Engines compute total proposed increase and variance.

---

## 2. Recommended Folder Structure

Align with the existing `src/` layout and extend it:

```
src/
├── components/           # Shared UI
│   ├── layout.tsx        # Shell: sidebar, main content
│   ├── ui/               # Primitives (buttons, inputs, cards, modals)
│   ├── budget-header.tsx # Persistent budget summary (used in review)
│   ├── file-upload.tsx   # Drag-drop + validation + preview
│   ├── column-mapper.tsx # Map file columns → logical fields
│   └── data-table.tsx    # Reusable sortable/filterable table
│
├── features/
│   ├── dashboard/        # Cycle status, counts, budget summary
│   │   ├── dashboard-page.tsx
│   │   └── dashboard-cards.tsx
│   ├── uploads/          # Data ingestion (guided upload flow)
│   │   ├── uploads-page.tsx
│   │   ├── provider-upload.tsx
│   │   ├── market-upload.tsx
│   │   ├── wrvu-upload.tsx
│   │   ├── incentive-upload.tsx
│   │   ├── evaluation-upload.tsx
│   │   └── upload-preview-and-mapping.tsx
│   ├── data/             # Existing: provider/market/payments tables + mapping
│   │   ├── data-page.tsx
│   │   ├── provider-table.tsx
│   │   ├── market-table.tsx
│   │   └── ...
│   ├── review/           # Review workspace (core experience)
│   │   ├── review-workspace-page.tsx
│   │   ├── provider-list.tsx
│   │   ├── provider-detail-panel.tsx
│   │   ├── tcc-breakdown.tsx
│   │   ├── percentile-views.tsx
│   │   ├── experience-band-guidance.tsx
│   │   ├── override-controls.tsx
│   │   └── review-notes.tsx
│   ├── market-benchmarks/ # View/edit benchmark data and grouping
│   │   ├── benchmarks-page.tsx
│   │   └── benchmark-grouping.tsx
│   ├── budget/           # Budget view and settings
│   │   ├── budget-page.tsx
│   │   └── budget-settings.tsx
│   ├── configuration/   # Admin: plans, tiers, merit, experience bands
│   │   ├── config-page.tsx
│   │   ├── plan-templates.tsx
│   │   ├── experience-bands.tsx
│   │   ├── merit-matrix.tsx
│   │   └── plan-assignment-rules.tsx
│   └── export-audit/     # Export and audit trail
│       ├── export-page.tsx
│       └── audit-log.tsx
│
├── hooks/
│   ├── use-app-state.ts       # Existing: records, market, payments, upload handlers
│   ├── use-review-workspace.ts
│   ├── use-budget.ts
│   ├── use-config.ts
│   └── use-cycle.ts
│
├── lib/
│   ├── parse-file.ts          # Existing: CSV/XLSX, provider/market/payments
│   ├── provider-parse.ts
│   ├── storage.ts             # Existing: review records, market, payments
│   ├── storage-config.ts      # Config persistence
│   ├── normalization/
│   │   ├── to-review-record.ts  # Existing: parsed → ReviewRecord
│   │   ├── to-provider-review-record.ts  # Full ProviderReviewRecord from raw
│   │   ├── fte-normalization.ts  # wRVU/TCC at 1 FTE, clinical FTE
│   │   └── merge-uploads.ts     # Join provider + market + wRVU + incentive + eval
│   ├── engines/
│   │   ├── plan-assignment.ts   # Evaluate rules → plan
│   │   ├── merit-matrix.ts      # Lookup default increase
│   │   ├── percentiles.ts       # TCC/wRVU percentile from market
│   │   ├── experience-bands.ts  # YOE → band, target range
│   │   ├── tcc-calculator.ts    # Sum components → TCC
│   │   ├── plan-templates/      # One module per template type (optional)
│   │   │   ├── pcp-physician-tier.ts
│   │   │   ├── pcp-app-cf.ts
│   │   │   └── standard-merit.ts
│   │   └── budget.ts            # Total proposed, variance
│   └── export/
│       ├── provider-export.ts   # Final reviewed file (XLSX/CSV)
│       ├── summary-export.ts
│       └── audit-export.ts
│
├── types/
│   ├── index.ts
│   ├── provider.ts        # Existing: ProviderRecord (flat upload schema)
│   ├── review.ts          # Existing: ReviewRecord, ProviderId, MarketPosition
│   ├── provider-review-record.ts  # NEW: full canonical record for review (see §4)
│   ├── market.ts
│   ├── upload.ts
│   ├── enums.ts           # Population, CompensationPlanType, ReviewStatus, etc.
│   ├── benchmark.ts
│   ├── budget.ts
│   ├── plan-assignment.ts
│   ├── plan-template.ts   # NEW: template config (tiers, CF, merit ref)
│   ├── experience-band.ts # NEW: band def + target percentile range
│   └── cycle.ts           # NEW: cycle id, label, effective date, budget target
│
└── utils/
    ├── format.ts          # Currency, percent, date
    └── validation.ts
```

---

## 3. Main Screens and Responsibilities

| Screen | Responsibility |
|--------|----------------|
| **Dashboard** | Cycle selector; total providers; count by population; count needing review; budget target vs. total proposed (variance); average proposed increase %; counts below / in / above target experience band. Entry point for cycle health. |
| **Data Uploads** | Guided ingestion: provider data, market data, wRVUs, incentive components, evaluations, optional finance. Per-upload: drag-drop, cycle (where applicable), file type validation, preview, column mapping, replace/append, validation errors and warnings. |
| **Data Mapping / Validation** | Review column mapping and validation issues before finalizing import. Can live as a step inside Uploads or a separate "Review mapping" view. |
| **Review Workspace** | Primary work area. Filterable provider list (left or top); selected provider detail panel (right or below). Current vs proposed salary/TCC; editable proposed salary/override; market and productivity percentiles; experience band and target range; TCC breakdown; notes and rationale; instant recalculation. Persistent budget header. |
| **Market Benchmarks** | View and optionally edit market data (specialty × percentiles). Benchmark grouping logic for APPs or custom groups. Read-only or admin edit depending on product choice. |
| **Budget View** | Target increase budget; total proposed increase $ and %; variance; optional breakdown by specialty/population. Persistent budget header component can link here. |
| **Configuration** | Admin: compensation plan assignment rules; plan templates (PCP physician tiers, PCP APP target/CF, merit matrix ref); merit matrix; experience bands; benchmark grouping; budget target per cycle. |
| **Export / Audit** | Export final reviewed provider file (XLSX/CSV); summary file; audit trail of overrides and adjustments (who, when, what changed). |

---

## 4. Main Data Entities and Relationships

### Core Entities

- **Cycle**: One review cycle (e.g. FY2026). Fields: `id`, `label`, `effectiveDate`, `budgetTargetAmount?`, `budgetTargetPercent?`. Links all records and budget for that cycle.
- **Provider (identity)**: Stable id (e.g. `Employee_ID` or generated). Used across uploads to join.
- **ProviderRecord (flat)**: Existing upload-oriented flat schema (provider, employment, FTE, current/proposed comp, productivity, incentives, tier, merit, market columns, review status). Used as raw/normalized row from provider upload and after column mapping.
- **ProviderReviewRecord (canonical)**: **Single record per provider per cycle** used everywhere in the app. Combines:
  - Identity and org (from provider upload)
  - Experience and FTE (normalized)
  - Current salary and current TCC (and at 1 FTE)
  - Productivity inputs (raw + normalized by clinical FTE where appropriate)
  - Incentive components (teaching, chief, director, PSQ, other)
  - Benchmark mapping (market TCC/wRVU percentiles; can come from market file + specialty or benchmark group)
  - Compensation plan assignment (plan type + optional plan template id)
  - Evaluation score and merit default
  - Proposed increase (default and applied/override)
  - Proposed salary and proposed TCC
  - Review status, notes, rationale
  - Optional: audit timestamps

  Preserve both **raw** and **normalized** values where relevant (e.g. raw wRVU vs normalized wRVU for percentile).

- **MarketRow**: One row per specialty (or benchmark group) with TCC and wRVU percentile columns. Joined to provider by specialty or by configurable benchmark group.
- **PlanAssignmentRule**: Conditions (field, operator, value) → plan type / plan id. Evaluated in order of priority.
- **PlanTemplate**: Defines how proposed comp is calculated for a plan type (e.g. tier schedule, fixed target + CF, standard merit). Referenced by template id from assignment or from provider.
- **ExperienceBand**: minYoe, maxYoe, targetTccPercentileLow, targetTccPercentileHigh, label (e.g. Developing, Established, Advanced, Expert).
- **MeritMatrixConfig**: Grid of (TCC percentile band × performance band) → increase %. Optional default.
- **BudgetModel / BudgetPeriod**: Target pool for cycle; optional buckets by specialty/population. Used to compute variance.

### Relationships (Conceptual)

- One **Cycle** has many **ProviderReviewRecord** (one per provider).
- One **ProviderReviewRecord** references one **PlanTemplate** (or plan type only) and one **MarketRow** (or benchmark group) for percentiles.
- **PlanAssignmentRule** and **PlanTemplate** are global config; **ExperienceBand** and **MeritMatrixConfig** can be scoped by population/specialty in config.
- **ProviderReviewRecord** is built by merging: provider upload + market join + wRVU upload + incentive upload + evaluation upload, then normalization and engine calculations.

### Entity Relationship Summary

```
Cycle 1───* ProviderReviewRecord
ProviderReviewRecord *───1 MarketRow (by specialty or benchmark group)
ProviderReviewRecord *───1 PlanTemplate (or plan type)
PlanAssignmentRule, PlanTemplate, ExperienceBand, MeritMatrixConfig → global/config
ProviderReviewRecord = merge(Provider upload, Market join, wRVU, Incentive, Evaluation) + normalization + engines
```

### Suggested Type: ProviderReviewRecord

Extend or align with existing `ReviewRecord` and `ProviderRecord` so that:

- **ReviewRecord** remains the minimal canonical shape (providerId, name, specialty, population, planType, currentTcc, fte, cycleId, status, marketPosition, scenarioResults, etc.).
- **ProviderReviewRecord** (or an extended **ReviewRecord** with optional fields) adds: all FTE fields, raw and normalized productivity, full TCC breakdown (base, incentive, teaching, chief, etc.), evaluation score, default vs applied increase, proposed salary/TCC, experience band, target percentile range, notes, rationale. Use one canonical type for the review workspace so the calculation engines and UI both read/write the same shape.

---

## 5. Suggested UI Layout and Navigation

- **Shell**: Sidebar (collapsed optional) + main content. Sidebar shows cycle selector at top, then primary nav.
- **Primary navigation** (sidebar):
  - Dashboard
  - Data Uploads
  - Review Workspace
  - Market Benchmarks
  - Budget View
  - Configuration
  - Export / Audit

- **Review Workspace layout**:
  - **Top**: Persistent **budget header** (target, total proposed, variance; link to Budget View).
  - **Left** (or top on narrow): **Provider list** — filterable/sortable table or list (name, specialty, population, current TCC, proposed TCC, status, maybe “below/in/above target”). Single selection.
  - **Right** (or bottom): **Provider detail panel** — cards/sections:
    - Identity and plan type
    - Current vs proposed (salary, TCC, percent change)
    - Editable proposed salary / override with instant recalc
    - Market percentile view (current and proposed TCC percentile)
    - Productivity percentile view (wRVU percentile, alignment)
    - Experience band guidance (YOE, band, target range, below/in/above)
    - TCC breakdown (base, productivity incentive, teaching, chief, director, PSQ, other)
    - Notes and rationale
  - No spreadsheet grid; all edits in form-like controls or inline editable fields with clear labels.

- **Design**: Modern React internal tool — clean sidebar, crisp cards, high readability, elegant tables, minimal clutter, thoughtful spacing and typography. Responsive but desktop-optimized.

---

## 6. Phased Build Plan

### Phase 1 — Foundation (current + next steps)

- Cycle and budget types; cycle selector in shell.
- Consolidate provider ingestion: single **ProviderReviewRecord** (or extended ReviewRecord) built from provider upload + normalization; fix any ParsedProviderRow vs ProviderRecord mismatch.
- Persist and load **config** (plan assignment rules, experience bands, merit matrix, plan templates) via `lib/storage-config.ts`.
- **Dashboard** page: cycle, total providers, counts by population, placeholder budget line (target vs proposed).

### Phase 2 — Data ingestion and normalization

- **Uploads** page: provider, market, wRVUs, incentive, evaluation. Each with preview, column mapping, replace/append, validation.
- **Normalization** pipeline: merge uploads by provider key; FTE normalization (clinical FTE for wRVU, total FTE for TCC); produce one ProviderReviewRecord per provider per cycle.
- **Market join**: Match provider to market row (specialty or benchmark group); populate market percentiles on the record.

### Phase 3 — Calculation engines

- **Plan assignment** engine: evaluate rules → plan type / plan id.
- **Percentiles** engine: given market row, compute current/proposed TCC percentile and wRVU percentile.
- **Merit matrix** engine: lookup default increase from TCC percentile band + performance band.
- **Experience bands** engine: YOE → band, target TCC percentile range; flag below/in/above.
- **TCC calculator**: Sum base + incentives → current and proposed TCC.
- **Plan-specific engines** (stub or real): e.g. PCP physician tier (YOE → tier → salary), PCP APP (target + CF). Each returns recommended salary or increase and optional breakdown.
- **Budget** engine: total proposed increase $ and %, variance to target.

### Phase 4 — Review workspace

- **Review workspace** page: provider list (from state), selection, detail panel.
- **Budget header** component (target, proposed, variance).
- **Detail panel**: read-only current vs proposed; editable proposed salary; display percentiles, experience band, TCC breakdown; notes and rationale.
- **Instant recalc**: on change of proposed salary or override, run engines and update state (and budget header).

### Phase 5 — Experience bands and transparency

- **Experience band** display and config: show band, target range, below/in/above in detail panel; admin UI for band definitions.
- **TCC breakdown** component: list all components (base, productivity, teaching, chief, etc.) with labels and amounts.
- Contextual drivers: FTE, clinical FTE, % of year employed, raw vs normalized productivity, partial-year effects, plan type, tier/CF if applicable.

### Phase 6 — Configuration and budget UX

- **Configuration** page: plan assignment rules, plan templates (tiers, CF, merit ref), merit matrix editor, experience bands, benchmark grouping.
- **Budget** page: set target; view total proposed, variance, optional breakdown by specialty/population.
- Polish: validation, error states, loading states.

### Phase 7 — Export and audit

- **Export**: Final reviewed provider file (XLSX/CSV), summary export.
- **Audit**: Log overrides and key adjustments (non-PII); export audit trail.

---

## 7. Keeping the System Flexible and Not Hardcoded

### Rules to follow

1. **No plan-type or population branching in UI**: Do not `if (population === 'physician')` in components. Instead: "get recommended increase for this record" → engine uses `planType` and `planId` to dispatch to the right logic. Same for experience bands and merit: config drives behavior.
2. **New plan type = new config + engine**: Add a new plan template in config (e.g. "MHT market review") and implement a small engine function that, given a ProviderReviewRecord and market data, returns recommended increase and breakdown. Register that template type in one place (e.g. a registry or map by template id). UI stays unchanged.
3. **New population = config only when possible**: If the only difference is which plan assignment rules or merit matrix apply, add rules and matrix rows; no code change. If the population needs a new calculation flavor, add a new plan template and engine; still no UI branching.
4. **All numeric and band logic in lib/engines**: Percentiles, merit default, experience band, TCC sum, budget total — all in `lib/engines` or `lib/normalization`. UI only displays and captures overrides.
5. **Column mapping and validation in lib**: Parsing and mapping stay in `lib/parse-file.ts` and `lib/*-parse.ts`. Validation errors returned as lists; UI only displays them.
6. **Config in types and storage**: Plan templates, experience bands, merit matrix, plan assignment rules are typed (e.g. `PlanTemplate`, `ExperienceBand`, `MeritMatrixConfig`, `PlanAssignmentRule`) and persisted. Defaults can ship as JSON or seed data; admins edit via Configuration screen.
7. **Single canonical record shape**: One **ProviderReviewRecord** (or extended ReviewRecord) for the whole app. New fields (e.g. new incentive type) extend that type and the TCC calculator; engines and UI stay aligned.

### Extension points

- **Plan template registry**: Map `templateId` or `planType` to a function `(record, market, config) => { recommendedSalary?, recommendedIncreasePercent?, breakdown? }`. Adding a template = adding config + one function.
- **Experience bands**: Array of bands; engine returns band and target range. Add bands in config.
- **Merit matrix**: Grid in config; lookup by (TCC band, performance band). Add rows in config.
- **Benchmark grouping**: Optional mapping "APP specialty X → use market row Y" so APPs can share benchmarks; config-driven.

This keeps the system flexible for new populations, new plan types, and annual rule changes without touching the review workspace or dashboard UI.

---

*Document version: 1.0. Aligns with existing `src/` structure (types, features/data, lib, hooks) and extends it for the full annual compensation review workflow.*
