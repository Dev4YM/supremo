import { Injectable, Logger } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
// @ts-ignore - vm2 doesn't have TypeScript definitions
import { VM } from 'vm2';

@Injectable()
export class CustomCodeAction extends BaseAction {
  private readonly logger = new Logger(CustomCodeAction.name);
  type = 'custom_code';
  name = 'Custom Code';
  description = 'Execute custom JavaScript code';
  icon = '💻';
  category = 'utility';

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const code = config.code;

      if (!code) {
        return this.failure('Code is required');
      }

      // Create safe sandbox with limited access
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
          // Helper functions
          log: (...args: any[]) => this.logger.log('[CustomCode]', ...args),
        },
      });

      const result = vm.run(code);

      return this.success({ result });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to execute custom code', { error: error.toString() });
    }
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
          description: 'JavaScript code to execute (sandboxed, 5s timeout)',
        },
      },
      required: ['code'],
    };
  }
}

