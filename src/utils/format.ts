/**
 * Shared number formatting for display: TCC/dollars, FTE, percentiles.
 */

/** Format as USD with $, commas, and 2 decimal places (e.g. $450,000.00). */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format FTE with exactly 2 decimal places (e.g. 1.00, 0.80). */
export function formatFte(value: number): string {
  return value.toFixed(2);
}
