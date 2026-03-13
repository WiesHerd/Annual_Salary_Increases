# Multi-Year / Year-over-Year (YoY) Design

## Summary

Support a **multi-year environment** where each fiscal year is **self-contained**: its own provider data, market, conversion factors, parameters, and logic. Each year is a **separate YoY process** with isolated workflow—no cross-year mixing.

---

## Current State vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| Provider records | Single flat array, cycleId ignored on upload | Per-year storage, upload scoped to selected year |
| Conversion factors | Global cfBySpecialty config (manual); record CF optional | CF from provider file on load; cfBySpecialty fallback per year |
| Market surveys | One set, keyed by surveyId | Per-year survey data (or survey + year) |
| Parameters | Global merit matrix, experience bands, policies | Per-year parameters |
| Cycle selector | UI only; data not filtered by cycle | Cycle = active year context; all reads/writes scoped |

---

## 1. Conversion Factors from Provider Load

### Goal
When loading provider data, CF columns in the file are parsed and stored on each `ProviderRecord`. No separate CF config required when the file includes them.

### Implementation

- **Provider column mapping**: Add explicit mappings in `buildDefaultProviderMapping()` for:
  - `Current_CF`: "Current CF", "Current_Conversion_Factor", "CF", "Conversion Factor"
  - `Proposed_CF`: "Proposed CF", "Proposed_Conversion_Factor"
- **Parse**: `parseProviderRow` already supports `Current_CF` and `Proposed_CF` via `NUMERIC_KEYS` and `PROVIDER_RECORD_KEYS`.
- **Fallback**: When record lacks CF, continue using `cfBySpecialty` (year-scoped) as today.
- **Import UI**: Ensure mapping UI exposes `Current_CF` / `Proposed_CF` for user mapping when headers don’t auto-match.

### CF Resolution Order
1. Record `Current_CF` / `Proposed_CF` (from file or prior load)
2. Year-scoped `cfBySpecialty` by specialty
3. Zero

---

## 2. Year-Scoped Storage Model

### Core principle
**Year = cycle id** (e.g. `FY2025`, `FY2026`). All data and config for a year live under that key.

### Storage keys (localStorage)

```
tcc-provider-records-by-year     → { [cycleId]: ProviderRecord[] }
tcc-market-surveys-by-year       → { [cycleId]: MarketSurveySet }
tcc-evaluations-by-year          → { [cycleId]: EvaluationJoinRow[] }
tcc-payments-by-year             → { [cycleId]: ParsedPaymentRow[] }  (or keep cycleId on rows)
tcc-parameters-by-year           → { [cycleId]: ParametersSnapshot }
  - meritMatrix, experienceBands, cfBySpecialty, pcpTierSettings, pcpAppRules,
    planAssignmentRules, budgetSettings, policyEngine (policies, customModels, tierTables)
tcc-survey-metadata-by-year      → { [cycleId]: SurveyMetadata }  (if needed)
```

### Migration
- If `tcc-provider-records-by-year` is empty but `tcc-provider-records` exists: migrate to `FY2025` (or `DEFAULT_CYCLE_ID`).
- Same for other keys.

### Parameters snapshot type
```ts
interface ParametersSnapshot {
  meritMatrix: MeritMatrixRow[];
  experienceBands: ExperienceBand[];
  cfBySpecialty: CfBySpecialtyRow[];
  pcpTierSettings: PcpPhysicianTierRow[];
  pcpAppRules: PcpAppRuleRow[];
  planAssignmentRules: PlanAssignmentRuleRow[];
  budgetSettings: BudgetSettingsRow[];
  policyEngine: { policies, customModels, tierTables };
}
```

---

## 3. Year-over-Year (YoY) Process Model

### Concept
Each year is a **distinct process**:
- FY2026: Load FY2026 providers, market, evaluations → configure FY2026 parameters → run review → export FY2026.
- FY2025: Same flow, fully separate data and config.

### Behaviors
- **Cycle selector** = active year. When changed, app switches context.
- **Import**: Provider/Market/Evaluation uploads target the **selected cycle**. Replace/add applies only to that year’s data.
- **Parameters**: Editing merit matrix, CF, policies, etc. affects **only the selected year**.
- **Salary review / Compare scenarios**: Operate on the **selected year’s** providers and parameters.
- **Export**: Exports the active year only.

### Optional: “Copy from prior year”
- Action: “Copy FY2025 parameters → FY2026” to seed a new year from the previous one.
- Provider data: Never auto-copied; each year’s data is loaded explicitly.

---

## 4. Data Flow (YoY)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Cycle selector (e.g. FY2026)                                            │
│  → selectedCycleId = active year                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Load (on mount / cycle change)                                         │
│  - providers = loadProviderRecordsByYear(selectedCycleId)                │
│  - market = loadMarketSurveysByYear(selectedCycleId)                     │
│  - evaluations = loadEvaluationsByYear(selectedCycleId)                  │
│  - payments = loadPaymentsByYear(selectedCycleId)  // or filter by cycle │
│  - parameters = loadParametersByYear(selectedCycleId)                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Upload (Provider / Market / Evaluation)                                 │
│  - Target: selectedCycleId                                               │
│  - add/replace updates only that year's data                             │
│  - CF columns in provider file → parsed → stored on records              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Salary review / Compare scenarios                                       │
│  - Use providers + parameters for selectedCycleId only                   │
│  - CF: record.Current_CF/Proposed_CF else parameters.cfBySpecialty        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. CF in Provider File (Column Mapping)

Suggested header patterns for auto-mapping:
- `Current_CF`, `Current CF`, `Conversion Factor`, `CF`, `Current Conversion Factor`
- `Proposed_CF`, `Proposed CF`, `Proposed Conversion Factor`

If the file has a single “CF” column, map it to `Current_CF`; `Proposed_CF` can fall back to `Current_CF` in resolution.

---

## 6. Phased Implementation

### Phase 1: CF from provider load (small)
- Add CF column mapping in `provider-parse.ts` (`buildDefaultProviderMapping`).
- Ensure `Current_CF` / `Proposed_CF` flow through parse → record.
- No storage/state changes.

### Phase 2: Year-scoped storage
- Introduce `*-by-year` storage functions.
- Migrate existing data into a default year (e.g. FY2025).
- Update `useAppState`, `useParametersState`, `usePolicyEngineState` to read/write by `selectedCycleId`.

### Phase 3: YoY UI and flows
- Scope all uploads to selected cycle.
- Scope Parameters page to selected cycle.
- Ensure Salary review and Compare scenarios use year-scoped data only.

### Phase 4: “Copy from prior year” (optional)
- Add “Copy parameters from prior year” for new cycles.

---

## 7. Open Questions

1. **Payments**: Currently `ParsedPaymentRow` has `cycleId`. Keep a single payments array filtered by cycle, or store payments per year?
2. **Market surveys**: Same survey structure for each year (e.g. MGMA FY2026 vs FY2025), or one survey set shared across years?
3. **Policy engine**: Policies/custom models often change year to year; per-year config fits. Confirm?
4. **Cycle creation**: When adding a new cycle (e.g. FY2027), start with empty data + optional copy from prior year?
