/**
 * Benchmark and merit matrix config interfaces.
 * Data-only; matrices can be loaded from JSON/config.
 */

import type { BenchmarkSource, PercentileBand } from './enums';

/** Configuration for a benchmark (survey or internal) used for TCC/wRVU percentiles. */
export interface BenchmarkConfig {
  id: string;
  label: string;
  source: BenchmarkSource;
  /** Percentile columns: e.g. TCC_25, TCC_50, TCC_75, TCC_90 and/or WRVU_25–WRVU_90. */
  percentileColumns: Record<string, number>;
  /** Optional: limit to these specialties; empty or undefined = all. */
  specialtyScope?: string[];
  /** Optional filters for configuration-driven behavior. */
  filters?: Record<string, unknown>;
}

/** One cell in the merit matrix: TCC percentile band + performance band → increase. */
export interface MeritCell {
  /** Current TCC percentile band (e.g. 25, 50, 75, 90). */
  tccPercentileBand: PercentileBand;
  /** Performance rating band (e.g. "exceeds", "meets", "below"). */
  performanceBand: string;
  /** Merit increase as decimal (e.g. 0.03 = 3%). */
  increasePercent: number;
}

/** Merit matrix configuration: grid of TCC percentile × performance → increase %. */
export interface MeritMatrixConfig {
  id: string;
  label: string;
  /** Optional: limit to specialties or population. */
  specialtyScope?: string[];
  populationScope?: string[];
  /** Grid of cells; can be stored as flat list or 2D. */
  cells: MeritCell[];
  /** Optional default increase when no cell matches. */
  defaultIncreasePercent?: number;
}
