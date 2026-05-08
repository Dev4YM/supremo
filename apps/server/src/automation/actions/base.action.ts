import { IAction, WorkflowContext, ActionResult } from '../interfaces/action.interface';

export abstract class BaseAction implements IAction {
  abstract type: string;
  abstract name: string;
  abstract description?: string;
  abstract icon?: string;
  abstract category: string;

  abstract execute(context: WorkflowContext, config: any): Promise<ActionResult>;
  abstract validate(config: any): boolean;
  abstract getConfigSchema(): any;

  protected success(data?: any, metadata?: Record<string, any>): ActionResult {
    return {
      success: true,
      data,
      metadata,
    };
  }

  protected failure(error: string, metadata?: Record<string, any>): ActionResult {
    return {
      success: false,
      error,
      metadata,
    };
  }

  protected interpolate(template: string, context: WorkflowContext): string {
    let result = template;
    
    // Replace placeholders
    const placeholders = [
      { pattern: /\{user\}/g, value: context.user?.discordId || '' },
      { pattern: /\{username\}/g, value: context.user?.username || '' },
      { pattern: /\{mention\}/g, value: context.user ? `<@${context.user.discordId}>` : '' },
      { pattern: /\{guild\}/g, value: context.guild?.name || '' },
      { pattern: /\{channel\}/g, value: context.channel?.name || '' },
      { pattern: /\{trustScore\}/g, value: context.user?.trustScore?.toString() || '0' },
      { pattern: /\{messageCount\}/g, value: context.user?.messageCount?.toString() || '0' },
      { pattern: /\{joinDate\}/g, value: context.user?.joinDate ? new Date(context.user.joinDate).toLocaleDateString() : '' },
    ];

    placeholders.forEach(({ pattern, value }) => {
      result = result.replace(pattern, value);
    });

    // Replace custom variables
    if (context.variables) {
      Object.keys(context.variables).forEach((key) => {
        const pattern = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(pattern, String(context.variables[key]));
      });
    }

    return result;
  }
}

