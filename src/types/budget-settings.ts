/**
 * Budget settings row for Parameters UI: cycle-level targets and thresholds.
 */

export interface BudgetSettingsRow {
  id: string;
  cycleId: string;
  cycleLabel?: string;
  budgetTargetAmount?: number;
  budgetTargetPercent?: number;
  /** Warning threshold as percent (e.g. 95 = warn at 95% of budget). */
  warningThresholdPercent?: number;
  /** Hard stop threshold as percent (e.g. 100 = block over 100%). */
  hardStopThresholdPercent?: number;
}
