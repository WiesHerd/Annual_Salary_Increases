/**
 * Conversion factor (CF) by specialty for wRVU-based compensation.
 * Used when providers do not have Current_CF/Proposed_CF on their record.
 */

export interface CfBySpecialtyRow {
  id: string;
  specialty: string;
  currentCf?: number;
  proposedCf?: number;
}
