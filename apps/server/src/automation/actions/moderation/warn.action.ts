import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { ActionsService } from '../../../actions/actions.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WarnAction extends BaseAction {
  type = 'warn';
  name = 'Warn User';
  description = 'Issue a warning to a user';
  icon = '⚠️';
  category = 'moderation';

  constructor(
    private actionsService: ActionsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const discordId = config.userId || context.user?.discordId;
      const reason = config.reason || `Automated warning: ${context.automation?.name || 'Unknown'}`;

      if (!discordId) {
        return this.failure('User ID is required');
      }

      if (!context.guildId) {
        return this.failure('Guild ID is required');
      }
      // Find user by discordId to get database ID
      const user = await this.prisma.user.findUnique({
        where: {
          guildId_discordId: {
            guildId: context.guildId,
            discordId,
          },
        },
      });
      if (!user) {
        return this.failure('User not found');
      }

      await this.actionsService.executeAction({
        guildId: context.guildId!,
        userId: user.id,
        actionType: 'warn',
        reason,
        executor: 'system',
      });

      return this.success({ userId: user.id, discordId, reason });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to warn user', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return true; // Reason is optional
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
        reason: { type: 'string', description: 'Warning reason' },
      },
    };
  }
}

