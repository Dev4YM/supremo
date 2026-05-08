import { Injectable, Logger } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';

@Injectable()
export class CustomCodeAction extends BaseAction {
  private readonly logger = new Logger(CustomCodeAction.name);
  type = 'custom_code';
  name = 'Custom Code';
  description = 'Execute custom JavaScript code (disabled — vm2 removed for security)';
  icon = '💻';
  category = 'utility';

  async execute(_context: WorkflowContext, config: any): Promise<ActionResult> {
    if (!config?.code) {
      return this.failure('Code is required');
    }
    this.logger.warn('custom_code action invoked but in-process JS execution is disabled (vm2 removed).');
    return this.failure(
      'Custom code execution is disabled. The previous vm2-based implementation was removed for security. ' +
        'Use supported automation actions or an external worker with a safe DSL.',
    );
  }

  validate(config: any): boolean {
    return !!config.code;
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Not executed — reserved for future safe execution backend.',
        },
      },
      required: ['code'],
    };
  }
}
