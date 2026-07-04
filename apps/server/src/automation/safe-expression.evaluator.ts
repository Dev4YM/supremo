import { WorkflowContext } from './interfaces/action.interface';

export type ComparisonOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'includes'
  | 'not_includes'
  | 'within_days'
  | 'exists';

export interface StructuredCondition {
  field: string;
  operator: ComparisonOperator;
  value?: string | number | boolean;
  caseSensitive?: boolean;
}

function resolveField(context: WorkflowContext, field: string): unknown {
  const parts = field.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (field === 'trustScore') {
    return context.user?.trustScore;
  }
  if (field === 'message.content') {
    return context.message?.content;
  }
  if (field === 'user.roles') {
    return context.user?.roles ?? [];
  }
  if (field === 'user.joinDate') {
    return context.user?.joinDate;
  }

  return current;
}

function compareValues(
  left: unknown,
  operator: ComparisonOperator,
  right: unknown,
  caseSensitive = true,
): boolean {
  if (operator === 'exists') {
    return left !== undefined && left !== null && left !== '';
  }

  if (operator === 'within_days') {
    const days = Number(right ?? 0);
    const date = left instanceof Date ? left : new Date(String(left));
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  }

  if (operator === 'includes' || operator === 'not_includes') {
    const haystack = Array.isArray(left) ? left.map(String) : [];
    const needle = String(right ?? '');
    const match = haystack.includes(needle);
    return operator === 'includes' ? match : !match;
  }

  if (operator === 'contains' || operator === 'not_contains') {
    const haystack = caseSensitive ? String(left ?? '') : String(left ?? '').toLowerCase();
    const needle = caseSensitive ? String(right ?? '') : String(right ?? '').toLowerCase();
    const match = haystack.includes(needle);
    return operator === 'contains' ? match : !match;
  }

  const leftNum = Number(left);
  const rightNum = Number(right);
  const numeric = !Number.isNaN(leftNum) && !Number.isNaN(rightNum);

  switch (operator) {
    case 'eq':
      return numeric ? leftNum === rightNum : String(left) === String(right);
    case 'neq':
      return numeric ? leftNum !== rightNum : String(left) !== String(right);
    case 'gt':
      return numeric ? leftNum > rightNum : String(left) > String(right);
    case 'gte':
      return numeric ? leftNum >= rightNum : String(left) >= String(right);
    case 'lt':
      return numeric ? leftNum < rightNum : String(left) < String(right);
    case 'lte':
      return numeric ? leftNum <= rightNum : String(left) <= String(right);
    default:
      return false;
  }
}

/**
 * Evaluates whitelisted comparisons only — no arbitrary JavaScript execution.
 */
export function evaluateStructuredCondition(
  context: WorkflowContext,
  condition: StructuredCondition,
): boolean {
  const left = resolveField(context, condition.field);
  return compareValues(left, condition.operator, condition.value, condition.caseSensitive ?? true);
}

const EXPRESSION_PATTERN =
  /^(trustScore|messageCount|user\.trustScore|message\.content)\s*(==|!=|>=|<=|>|<)\s*(.+)$/i;

export function evaluateSafeExpression(
  context: WorkflowContext,
  input: string | StructuredCondition,
): boolean {
  if (typeof input === 'object' && input.field && input.operator) {
    return evaluateStructuredCondition(context, input);
  }

  const expression = String(input).trim();
  const match = expression.match(EXPRESSION_PATTERN);
  if (!match) {
    return false;
  }

  const [, field, op, rawValue] = match;
  const operatorMap: Record<string, ComparisonOperator> = {
    '==': 'eq',
    '!=': 'neq',
    '>': 'gt',
    '>=': 'gte',
    '<': 'lt',
    '<=': 'lte',
  };

  const numericValue = Number(rawValue.trim());
  const value = Number.isNaN(numericValue) ? rawValue.trim() : numericValue;

  return evaluateStructuredCondition(context, {
    field,
    operator: operatorMap[op],
    value,
  });
}

export function conditionFromBuilderSubtype(
  subtype: string,
  config: Record<string, unknown>,
): StructuredCondition {
  switch (subtype) {
    case 'user_has_role':
      return {
        field: 'user.roles',
        operator: 'includes',
        value: String(config.role ?? ''),
      };
    case 'message_contains':
      return {
        field: 'message.content',
        operator: 'contains',
        value: String(config.text ?? ''),
        caseSensitive: Boolean(config.case_sensitive),
      };
    case 'user_joined_recently':
      return {
        field: 'user.joinDate',
        operator: 'within_days',
        value: Number(config.timeframe ?? 7),
      };
    default:
      return {
        field: String(config.field ?? 'trustScore'),
        operator: (config.operator as ComparisonOperator) ?? 'gte',
        value: config.value as string | number,
      };
  }
}
