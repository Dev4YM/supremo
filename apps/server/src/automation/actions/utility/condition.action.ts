import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import {
  evaluateSafeExpression,
  StructuredCondition,
} from '../../safe-expression.evaluator';

@Injectable()
export class ConditionAction extends BaseAction {
  type = 'condition';
  name = 'Condition';
  description = 'Evaluate a safe comparison (no arbitrary code execution)';
  icon = '🔀';
  category = 'utility';

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    if (config?.structured) {
      const result = evaluateSafeExpression(context, config.structured as StructuredCondition);
      return this.success({ result }, { evaluated: config.structured });
    }

    if (config?.expression) {
      const result = evaluateSafeExpression(context, String(config.expression));
      return this.success({ result }, { expression: config.expression });
    }

    return this.failure('Condition requires structured rules or a safe expression');
  }

  validate(config: any): boolean {
    return Boolean(config?.structured || config?.expression);
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        structured: {
          type: 'object',
          description: 'Structured comparison { field, operator, value }',
          properties: {
            field: { type: 'string' },
            operator: { type: 'string' },
            value: {},
            caseSensitive: { type: 'boolean' },
          },
        },
        expression: {
          type: 'string',
          description: 'Simple expression e.g. trustScore >= 50',
        },
      },
    };
  }
}
