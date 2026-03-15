/**
 * Budget model interfaces.
 * Period, pool, and allocation by specialty or population.
 */

/** A single budget period (e.g. fiscal year or cycle). */
export interface BudgetPeriod {
  id: string;
  label: string;
  /** Optional date range (ISO). */
  startDate?: string;
  endDate?: string;
  /** Link to review cycle if applicable. */
  cycleId?: string;
  /** Total pool amount. */
  totalPool: number;
  currency?: string;
}

/** One allocation bucket (e.g. by specialty or population). */
export interface BudgetBucket {
  /** Key (e.g. specialty id or population). */
  key: string;
  allocatedAmount: number;
  /** Optional cap or rules reference. */
  cap?: number;
  rulesRef?: string;
}

/** Allocation of budget pool by specialty, population, or other dimension. */
export interface BudgetAllocation {
  buckets: BudgetBucket[];
  /** Optional: dimension used (e.g. "specialty", "population"). */
  dimension?: string;
}

/** Budget model: period plus allocation rules or buckets; optional merit vs base pool. */
export interface BudgetModel {
  id: string;
  period: BudgetPeriod;
  allocation: BudgetAllocation;
  /** Optional: link to merit/bonus pool vs base pool for extensibility. */
  poolType?: 'base' | 'merit' | 'bonus' | string;
}
