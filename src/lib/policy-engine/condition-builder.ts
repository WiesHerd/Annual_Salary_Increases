/**
 * Helpers to build and parse simple JsonLogic conditions for the rule editor.
 * Supports one simple condition (fact + operator + value) that maps to JsonLogic.
 */

import type { ConditionTree } from '../../types/compensation-policy';

export interface SimpleCondition {
  factKey: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'in';
  value: number | string;
  /** For "in" operator: list of allowed values (strings or numbers as strings). */
  valueList?: string[];
}

export const CONDITION_FACT_OPTIONS: { value: string; label: string; type: 'number' | 'string' }[] = [
  { value: 'tccPercentile', label: 'TCC percentile', type: 'number' },
  { value: 'wrvuPercentile', label: 'wRVU percentile', type: 'number' },
  { value: 'yoe', label: 'Years of experience', type: 'number' },
  { value: 'totalYoe', label: 'Total YOE', type: 'number' },
  { value: 'evaluationScore', label: 'Evaluation score', type: 'number' },
  { value: 'currentBaseSalary', label: 'Current base salary', type: 'number' },
  { value: 'currentTcc', label: 'Current TCC', type: 'number' },
  { value: 'currentFte', label: 'Current FTE', type: 'number' },
  { value: 'specialty', label: 'Specialty', type: 'string' },
  { value: 'division', label: 'Division', type: 'string' },
  { value: 'providerType', label: 'Provider type', type: 'string' },
  { value: 'performanceCategory', label: 'Performance category', type: 'string' },
  { value: 'compensationPlan', label: 'Compensation plan', type: 'string' },
  { value: 'department', label: 'Department', type: 'string' },
  { value: 'location', label: 'Location', type: 'string' },
  { value: 'population', label: 'Population', type: 'string' },
];

const NUMERIC_OPERATORS: { value: SimpleCondition['operator']; label: string }[] = [
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: 'in', label: 'is one of' },
];

const STRING_OPERATORS: { value: SimpleCondition['operator']; label: string }[] = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: 'in', label: 'is one of' },
];

export function getOperatorsForFact(factKey: string): { value: SimpleCondition['operator']; label: string }[] {
  const opt = CONDITION_FACT_OPTIONS.find((o) => o.value === factKey);
  return opt?.type === 'string' ? STRING_OPERATORS : NUMERIC_OPERATORS;
}

/** Default operator when switching condition field type so summary and logic stay in sync. */
export function getDefaultOperatorForFact(factKey: string): SimpleCondition['operator'] {
  const opt = CONDITION_FACT_OPTIONS.find((o) => o.value === factKey);
  return opt?.type === 'string' ? '==' : '>';
}

/**
 * Build JsonLogic from a simple condition.
 */
export function simpleConditionToJsonLogic(c: SimpleCondition): ConditionTree | undefined {
  if (c.factKey == null || c.factKey === '') return undefined;
  const varRef = { var: c.factKey };
  const factOpt = CONDITION_FACT_OPTIONS.find((o) => o.value === c.factKey);
  const isNumeric = factOpt?.type === 'number';

  if (c.operator === 'in') {
    const list = c.valueList?.length
      ? c.valueList
      : typeof c.value === 'string'
        ? c.value.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    if (list.length === 0) return undefined;
    const typedList = isNumeric
      ? list.map((s) => Number(s)).filter((n) => !Number.isNaN(n))
      : list;
    if (typedList.length === 0) return undefined;
    return { in: [varRef, typedList] } as ConditionTree;
  }

  if (isNumeric) {
    const num = typeof c.value === 'number' ? c.value : Number(c.value);
    if (Number.isNaN(num)) return undefined;
    return { [c.operator]: [varRef, num] } as ConditionTree;
  }

  const strVal = typeof c.value === 'string' ? c.value : String(c.value ?? '');
  if (c.operator === '==') return { '==': [varRef, strVal] } as ConditionTree;
  if (c.operator === '!=') return { '!=': [varRef, strVal] } as ConditionTree;
  if (c.operator === '>' || c.operator === '>=' || c.operator === '<' || c.operator === '<=') {
    const n = Number(strVal);
    if (!Number.isNaN(n)) return { [c.operator]: [varRef, n] } as ConditionTree;
  }
  return undefined;
}

/**
 * Try to parse JsonLogic back into a simple condition (for editing in guided form).
 * Returns undefined if the tree is not a single simple comparison we support.
 */
export function jsonLogicToSimpleCondition(tree: ConditionTree | undefined): SimpleCondition | undefined {
  if (!tree || typeof tree !== 'object') return undefined;
  const keys = Object.keys(tree);
  if (keys.length !== 1) return undefined;
  const op = keys[0];
  if (!['>', '<', '>=', '<=', '==', '!=', 'in'].includes(op)) return undefined;
  const args = (tree as Record<string, unknown>)[op];
  if (!Array.isArray(args) || args.length !== 2) return undefined;
  const [left, right] = args;
  const varObj = left as Record<string, unknown>;
  const v = typeof varObj === 'object' && varObj != null && 'var' in varObj ? (varObj.var as string) : undefined;
  if (typeof v !== 'string') return undefined;

  if (op === 'in') {
    const arr = Array.isArray(right) ? right : [];
    const valueList = arr.map((x) => String(x)).filter(Boolean);
    const value = valueList[0] ?? '';
    return { factKey: v, operator: 'in', value, valueList };
  }

  const val = right as number | string;
  return { factKey: v, operator: op as SimpleCondition['operator'], value: val };
}

/** Check if tree is a single var-op-value (so we can show guided form). */
function isSimpleConditionTree(tree: ConditionTree | undefined): boolean {
  return jsonLogicToSimpleCondition(tree) != null;
}

/**
 * Build JsonLogic for multiple conditions combined with AND or OR.
 */
export function conditionsToJsonLogic(
  conditions: SimpleCondition[],
  combine: 'and' | 'or' = 'and'
): ConditionTree | undefined {
  const clauses = conditions
    .map((c) => simpleConditionToJsonLogic(c))
    .filter((t): t is ConditionTree => t != null);
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { [combine]: clauses } as ConditionTree;
}

/**
 * Human-readable sentence for a condition tree (single, and, or).
 */
export function conditionToReadableSentence(tree: ConditionTree | undefined): string {
  if (!tree || typeof tree !== 'object') return '';
  const keys = Object.keys(tree);
  if (keys.length === 0) return '';
  if (keys.length === 1) {
    const key = keys[0];
    if (key === 'and' || key === 'or') {
      const arr = (tree as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) return '';
      const parts = arr.map((c) => conditionToReadableSentence(c as ConditionTree)).filter(Boolean);
      if (parts.length === 0) return '';
      const join = key === 'and' ? ' and ' : ' or ';
      return parts.join(join);
    }
    const simple = jsonLogicToSimpleCondition(tree as ConditionTree);
    if (simple) {
      const opt = CONDITION_FACT_OPTIONS.find((o) => o.value === simple.factKey);
      const fieldLabel = opt?.label ?? simple.factKey;
      const opLabel: Record<string, string> = {
        '>': 'is greater than',
        '>=': 'is at least',
        '<': 'is less than',
        '<=': 'is at most',
        '==': 'equals',
        '!=': 'does not equal',
        in: 'is one of',
      };
      const op = opLabel[simple.operator] ?? simple.operator;
      const valDisplay =
        simple.operator === 'in' && simple.valueList?.length
          ? simple.valueList.join(', ')
          : String(simple.value);
      return `When ${fieldLabel} ${op} ${valDisplay}`;
    }
  }
  return '';
}

/**
 * Parse existing conditions: if it's a single simple condition, return it; otherwise null (show raw).
 */
export function parseConditionForEditor(conditions: ConditionTree | undefined): {
  simple: SimpleCondition | undefined;
  raw: string;
  useSimple: boolean;
} {
  if (!conditions || Object.keys(conditions).length === 0) {
    return { simple: undefined, raw: '', useSimple: true };
  }
  const simple = jsonLogicToSimpleCondition(conditions);
  const useSimple = isSimpleConditionTree(conditions);
  const raw = JSON.stringify(conditions, null, 2);
  return { simple: simple ?? undefined, raw, useSimple };
}

/**
 * Parse conditions for multi-condition editor: supports single, AND, and OR trees.
 * Returns list of SimpleCondition and combine mode, or fallback for unsupported trees.
 */
export function parseConditionsListForEditor(conditions: ConditionTree | undefined): {
  conditions: SimpleCondition[];
  combine: 'and' | 'or';
  useSimple: boolean;
} {
  if (!conditions || Object.keys(conditions).length === 0) {
    return { conditions: [], combine: 'and', useSimple: true };
  }
  const keys = Object.keys(conditions);
  if (keys.length !== 1) {
    return { conditions: [{ factKey: 'tccPercentile', operator: '>', value: 75 }], combine: 'and', useSimple: false };
  }
  const key = keys[0];
  if (key === 'and' || key === 'or') {
    const arr = (conditions as Record<string, unknown>)[key];
    if (!Array.isArray(arr)) {
      return { conditions: [{ factKey: 'tccPercentile', operator: '>', value: 75 }], combine: 'and', useSimple: false };
    }
    const parsed: SimpleCondition[] = [];
    for (const item of arr) {
      const c = jsonLogicToSimpleCondition(item as ConditionTree);
      if (c) parsed.push(c);
    }
    if (parsed.length === 0) {
      return { conditions: [{ factKey: 'tccPercentile', operator: '>', value: 75 }], combine: key as 'and' | 'or', useSimple: true };
    }
    return { conditions: parsed, combine: key as 'and' | 'or', useSimple: true };
  }
  const simple = jsonLogicToSimpleCondition(conditions);
  if (simple) {
    return { conditions: [simple], combine: 'and', useSimple: true };
  }
  return { conditions: [{ factKey: 'tccPercentile', operator: '>', value: 75 }], combine: 'and', useSimple: false };
}
