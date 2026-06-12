/**

 * Configuration progress for Controls (not a "ready for merit review" gate).

 */



import type { MeritMatrixRow } from '../types/merit-matrix-row';

import type { Cycle } from '../types/cycle';

import type { AnnualIncreasePolicy } from '../types/compensation-policy';

import type { ControlsTabId } from './controls-tab-url';



export type ControlsReadinessId = 'data' | 'cycle' | 'matrix' | 'mappings' | 'policies';



export interface ControlsReadinessItem {

  id: ControlsReadinessId;

  label: string;

  ready: boolean;

  detail: string;

  tabId: ControlsTabId | null;

}



export interface ControlsReadinessInput {

  recordsCount: number;

  cycles: Cycle[];

  meritMatrix: MeritMatrixRow[];

  policies: AnnualIncreasePolicy[];

  mappingCount: number;

}



export function computeControlsReadiness(input: ControlsReadinessInput): ControlsReadinessItem[] {

  const { recordsCount, cycles, meritMatrix, policies, mappingCount } = input;

  const activePolicies = policies.filter((p) => p.status === 'active');

  const matrixReady = meritMatrix.some(

    (row) =>

      (row.defaultIncreasePercent != null && row.defaultIncreasePercent > 0) ||

      (row.performanceLabel?.trim()?.length ?? 0) > 0

  );



  return [

    {

      id: 'data',

      label: 'Data',

      ready: recordsCount > 0,

      detail: recordsCount > 0 ? `${recordsCount} provider${recordsCount === 1 ? '' : 's'}` : 'Import roster',

      tabId: null,

    },

    {

      id: 'cycle',

      label: 'Cycle',

      ready: cycles.length > 0,

      detail: cycles.length > 0 ? `${cycles.length} cycle${cycles.length === 1 ? '' : 's'}` : 'Add review cycle',

      tabId: 'review-cycles',

    },

    {

      id: 'matrix',

      label: 'Matrix',

      ready: matrixReady,

      detail: matrixReady ? `${meritMatrix.length} row${meritMatrix.length === 1 ? '' : 's'}` : 'Configure merit matrix',

      tabId: 'merit',

    },

    {

      id: 'mappings',

      label: 'Mappings',

      ready: mappingCount > 0,

      detail: mappingCount > 0 ? `${mappingCount} type route${mappingCount === 1 ? '' : 's'}` : 'Type → market',

      tabId: 'provider-type-survey',

    },

    {

      id: 'policies',

      label: 'Policies',

      ready: activePolicies.length > 0,

      detail:

        activePolicies.length > 0

          ? `${activePolicies.length} active`

          : policies.length > 0

            ? `${policies.length} inactive`

            : 'Add policy rules',

      tabId: 'policy-engine-rules',

    },

  ];

}



export function controlsReadinessComplete(items: ControlsReadinessItem[]): boolean {

  return items.every((item) => item.ready);

}



export function controlsReadinessProgress(items: ControlsReadinessItem[]): { complete: number; total: number } {

  const complete = items.filter((item) => item.ready).length;

  return { complete, total: items.length };

}


