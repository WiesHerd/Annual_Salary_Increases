# Calculations

Merit, budget, percentile, and TCC/wRVU calculations.

## FTE normalization for percentiles

Market survey benchmarks are typically stated at **1.0 FTE**. Percentiles must compare like-to-like.

- **TCC percentile** (see `recalculate-provider-row.ts`): Uses TCC at 1 FTE when available (`Proposed_TCC_at_1FTE` or `Current_TCC_at_1FTE`). If not provided, derives from raw TCC as `proposedTcc / (Current_FTE || 1)` so part-time providers are compared fairly to market TCC bands.

- **wRVU percentile** (see `lib/joins.ts` in `mergeMarketIntoProviders`): Uses FTE-normalized wRVU vs market `wrvuPercentiles`. Normalized wRVU is `Normalized_WRVUs` when present, otherwise `Prior_Year_WRVUs / (Current_FTE || 1)` (or `Adjusted_WRVUs`). Computed in the join and written to `WRVU_Percentile` when market data exists.
