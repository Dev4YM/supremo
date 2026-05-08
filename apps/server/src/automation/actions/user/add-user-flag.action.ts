import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AddUserFlagAction extends BaseAction {
  type = 'add_user_flag';
  name = 'Add User Flag';
  description = 'Add a flag to a user';
  icon = '🏷️';
  category = 'user';

  constructor(private prisma: PrismaService) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const userId = config.userId || context.user?.discordId;
      const flag = config.flag;

      if (!userId || !flag) {
        return this.failure('User ID and flag are required');
      }

      if (!context.guildId) {
        return this.failure('Guild ID is required');
      }
      const user = await this.prisma.user.findUnique({
        where: {
          guildId_discordId: {
            guildId: context.guildId,
            discordId: userId,
          },
        },
      });
      if (!user) {
        return this.failure('User not found');
      }

      // Note: User flags field doesn't exist in schema
      // Store flags in user notes field as JSON or add flags field to schema
      const existingNotes = user.notes ? JSON.parse(user.notes) : {};
      const flags = existingNotes.flags || [];
      
      if (flags.includes(flag)) {
        return this.success({ userId, flag, message: 'Flag already exists' });
      }

      flags.push(flag);
      existingNotes.flags = flags;

      await this.prisma.user.update({
        where: {
          guildId_discordId: {
            guildId: context.guildId!,
            discordId: userId,
          },
        },
        data: {
          notes: JSON.stringify(existingNotes),
        },
      });

      return this.success({ userId, flag });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to add user flag', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.flag);
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
        flag: { type: 'string', description: 'Flag name to add' },
      },
      required: ['flag'],
    };
  }
}

