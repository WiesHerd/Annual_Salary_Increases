/**
 * Market survey data: one row per specialty with TCC/wRVU percentile columns.
 */

/** One market row: specialty plus percentile values (e.g. TCC_25, TCC_50, WRVU_25, CF_25, …). */
export interface MarketRow {
  specialty: string;
  /** TCC by percentile band, e.g. { 25: 280000, 50: 320000, 75: 380000, 90: 450000 } */
  tccPercentiles: Record<number, number>;
  /** wRVU by percentile band, e.g. { 25: 4000, 50: 5000, 75: 6000, 90: 7500 } */
  wrvuPercentiles: Record<number, number>;
  /** Conversion factor by percentile band, e.g. { 25: 55, 50: 60, 75: 65, 90: 72 } (dollars per wRVU). */
  cfPercentiles?: Record<number, number>;
  /** Optional label/source. */
  label?: string;
  /** Number of incumbents (Sullivan Cotter, Gallagher "Physicians", MGMA). */
  incumbents?: number;
  /** Number of organizations (Sullivan Cotter "Orgs", Gallagher "Practices"). */
  orgCount?: number;
}
