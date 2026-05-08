import { Injectable, Logger } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';

@Injectable()
export class ConditionAction extends BaseAction {
  private readonly logger = new Logger(ConditionAction.name);
  type = 'condition';
  name = 'Condition';
  description = 'Evaluate a condition (disabled — vm2 removed for security)';
  icon = '🔀';
  category = 'utility';

  async execute(_context: WorkflowContext, config: any): Promise<ActionResult> {
    if (!config?.expression) {
      return this.failure('Expression is required');
    }
    this.logger.warn('condition action invoked but in-process JS evaluation is disabled (vm2 removed).');
    return this.failure(
      'JavaScript condition evaluation is disabled. The previous vm2-based implementation was removed for security. ' +
        'Use rule-based triggers or supported comparison actions.',
    );
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
          description: 'Not evaluated — reserved for future safe expression engine.',
        },
      },
      required: ['expression'],
    };
  }
}
