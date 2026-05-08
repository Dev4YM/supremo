import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
// @ts-ignore - vm2 doesn't have TypeScript definitions
import { VM } from 'vm2';

@Injectable()
export class ConditionAction extends BaseAction {
  type = 'condition';
  name = 'Condition';
  description = 'Evaluate a condition and branch workflow';
  icon = '🔀';
  category = 'utility';

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const expression = config.expression;

      if (!expression) {
        return this.failure('Expression is required');
      }

      // Create safe sandbox for expression evaluation
      const vm = new VM({
        timeout: 5000,
        sandbox: {
          user: context.user || {},
          message: context.message || {},
          guild: context.guild || {},
          channel: context.channel || {},
          role: context.role || {},
          variables: context.variables || {},
          trigger: context.trigger || {},
        },
      });

      const result = vm.run(`(${expression})`);

      return this.success({ 
        result: !!result,
        evaluated: result,
      });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to evaluate condition', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!config.expression;
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        expression: { 
          type: 'string', 
          description: 'JavaScript expression to evaluate (e.g., "user.trustScore > 50")',
        },
      },
      required: ['expression'],
    };
  }
}

