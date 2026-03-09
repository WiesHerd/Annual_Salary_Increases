/**
 * PCP APP fixed target / CF settings per division.
 */

export interface PcpAppRuleRow {
  id: string;
  division: string;
  fixedTarget: number;
  defaultCurrentCf: number;
  defaultProposedCf: number;
  allowOverride: boolean;
}
