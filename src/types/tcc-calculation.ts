/**
 * User-controlled definition of which roster fields roll up into Current TCC (survey-style total cash).
 */

/** Fields that can be toggled into the Current TCC sum (must match ProviderRecord keys). */
export const TCC_SUM_COMPONENT_KEYS = [
  'Current_Base_Salary',
  'Prior_Year_WRVU_Incentive',
  'Value_Based_Payment',
  'Shift_Incentive',
  'Division_Chief_Pay',
  'Medical_Director_Pay',
  'Teaching_Pay',
  'PSQ_Pay',
  'Quality_Bonus',
  'Other_Recurring_Comp',
  'TCC_Other_Clinical_1',
  'TCC_Other_Clinical_2',
  'TCC_Other_Clinical_3',
] as const;

export type TccSumComponentKey = (typeof TCC_SUM_COMPONENT_KEYS)[number];

export type TccCalculationSettings = {
  /** When true, that component is included in Current_TCC = sum(selected components). */
  componentIncluded: Record<TccSumComponentKey, boolean>;
};

export function defaultTccCalculationSettings(): TccCalculationSettings {
  return {
    componentIncluded: Object.fromEntries(TCC_SUM_COMPONENT_KEYS.map((k) => [k, true])) as Record<
      TccSumComponentKey,
      boolean
    >,
  };
}

/** Short labels for Parameters UI (order matches TCC_SUM_COMPONENT_KEYS). */
export const TCC_COMPONENT_LABELS: Record<TccSumComponentKey, string> = {
  Current_Base_Salary: 'Base salary',
  Prior_Year_WRVU_Incentive: 'wRVU / productivity incentive',
  Value_Based_Payment: 'Value-based payment',
  Shift_Incentive: 'Shift incentive',
  Division_Chief_Pay: 'Division chief pay',
  Medical_Director_Pay: 'Medical director pay',
  Teaching_Pay: 'Teaching pay',
  PSQ_Pay: 'PSQ pay',
  Quality_Bonus: 'Quality bonus',
  Other_Recurring_Comp: 'Other recurring comp',
  TCC_Other_Clinical_1: 'TCC other clinical (1)',
  TCC_Other_Clinical_2: 'TCC other clinical (2)',
  TCC_Other_Clinical_3: 'TCC other clinical (3)',
};
