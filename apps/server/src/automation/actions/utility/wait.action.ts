import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';

@Injectable()
export class WaitAction extends BaseAction {
  type = 'wait';
  name = 'Wait';
  description = 'Wait for a specified duration before continuing';
  icon = '⏳';
  category = 'utility';

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const duration = config.duration || 1000; // Default 1 second, in milliseconds

      if (duration < 0 || duration > 60000) {
        return this.failure('Duration must be between 0 and 60000 milliseconds');
      }

      await new Promise((resolve) => setTimeout(resolve, duration));

      return this.success({ duration });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to wait', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return true; // Duration is optional, defaults to 1000ms
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        duration: { 
          type: 'number', 
          description: 'Wait duration in milliseconds (max 60000)',
          default: 1000,
          minimum: 0,
          maximum: 60000,
        },
      },
    };
  }
}

