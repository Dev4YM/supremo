import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';
import { ActionsService } from '../../../actions/actions.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TimeoutAction extends BaseAction {
  type = 'timeout';
  name = 'Timeout User';
  description = 'Timeout a user for a specified duration';
  icon = '⏱️';
  category = 'moderation';

  constructor(
    private discordService: DiscordService,
    private actionsService: ActionsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const discordId = config.userId || context.user?.discordId;
      const duration = config.duration; // in seconds

      if (!discordId || !duration) {
        return this.failure('User ID and duration are required');
      }

      if (!context.guildId) {
        return this.failure('Guild ID not found in context');
      }

      const dbGuild = await this.prisma.guild.findUnique({
        where: { id: context.guildId },
      });

      if (!dbGuild) {
        return this.failure('Guild not found');
      }

      const guild = await this.discordService.getGuild(dbGuild.discordGuildId);
      if (!guild) {
        return this.failure('Discord guild not found');
      }

      const member = await this.discordService.getMember(dbGuild.discordGuildId, discordId);
      if (!member) {
        return this.failure('User not found in guild');
      }

      // Prevent timeout on owner or bot
      if (!this.discordService.canModerateMember(discordId, guild)) {
        return this.failure('Cannot timeout the server owner or bot');
      }

      const reason = config.reason || `Automated timeout: ${context.automation?.name || 'Unknown'}`;
      
      // Timeout duration must be between 1 second and 28 days (2419200 seconds)
      const durationMs = Math.min(Math.max(duration * 1000, 1000), 28 * 24 * 60 * 60 * 1000);
      const timeoutUntil = new Date(Date.now() + durationMs);

      // Discord.js timeout accepts Date object (TypeScript types may be incomplete)
      await (member as any).timeout(timeoutUntil, reason);

      // Find user by discordId and guildId to get database ID
      const user = await this.prisma.user.findFirst({
        where: {
          guildId: context.guildId,
          discordId,
        },
      });

      if (user) {
        // Log action
        await this.actionsService.executeAction({
          guildId: context.guildId!,
          userId: user.id,
          actionType: 'timeout',
          duration,
          reason,
          executor: 'system',
        });
      }

      return this.success({ userId: user?.id, discordId, duration, timeoutUntil });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to timeout user', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.duration && config.duration > 0);
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
        duration: { 
          type: 'number', 
          description: 'Timeout duration in seconds (max 2419200 = 28 days)',
          minimum: 1,
          maximum: 2419200,
        },
        reason: { type: 'string', description: 'Reason for timeout' },
      },
      required: ['duration'],
    };
  }
}


