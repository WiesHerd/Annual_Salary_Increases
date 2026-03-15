/**
 * PCP Physician tier row: YOE range + base salary by division.
 * Used for tier-based compensation configuration.
 */

export interface PcpPhysicianTierRow {
  id: string;
  tierName: string;
  minYoe: number;
  maxYoe: number;
  baseSalary: number;
  division: string;
  active: boolean;
}
