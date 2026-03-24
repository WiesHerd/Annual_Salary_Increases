# Specialty grouping module

Deterministic pipeline that maps messy incoming specialty labels to **eight canonical specialty groups**, with auditable match methods, confidence scores, and a **review queue** that can **learn synonyms** into `localStorage` without redeploying code.

## Folder layout

```
src/lib/specialty-grouping/
  types.ts              — interfaces & unions
  seed-canonical.ts     — shipped canonical table (code or replace with JSON import)
  normalize.ts          — Layer-3/4 string + token normalization
  scoring.ts            — token similarity + confidence helpers
  rules.ts              — Layer-5 structural overrides (pediatric vs adult, hospital-based, APP)
  registry.ts           — merged seed + user-learned rows
  match-engine.ts       — L1→L6 pipeline
  user-synonym-storage.ts — persisted synonyms (`tcc-specialty-grouping-user-synonyms`)
  review-queue.ts       — queue + approve/reject (`tcc-specialty-grouping-review-queue`)
  index.ts              — barrel exports
  specialty-grouping.test.ts
```

## Review queue workflow

1. Run `resolveSpecialtyGroup(input, { autoEnqueueReview: true })` (or manually call `enqueueReviewFromResult` when `reviewFlag` is true).
2. Admins inspect `pendingReviewItems()` (or full `loadReviewQueue()`).
3. **Approve** with `approveReviewItem(id, canonicalSpecialty, specialtyGroup)` — writes a **user-learned synonym** (normalized phrase → canonical + group) and marks the item approved.
4. Subsequent resolves load synonyms via `loadUserLearnedSynonyms()` merged into `buildRegistry()`.

Rejected items stay in storage with `status: 'rejected'` for audit; adjust if you prefer pruning.

## Future: embeddings / AI reranking (audit-safe)

- Keep this module as the **deterministic baseline** and log `matchMethod`, `confidenceScore`, and normalized input.
- Add an optional **candidate generator** step: retrieve top‑K canonical rows by embedding similarity, then **re-score** with a small cross-encoder or LLM **only as a tie-break** among candidates already passing a minimum lexical score.
- Store `aiSuggestion`, `aiScore`, and `deterministicWinner` side-by-side; default assignment remains deterministic unless policy explicitly prefers AI above a calibrated threshold.
- Never silently replace a flagged (`reviewFlag`) deterministic result without admin or policy approval.
