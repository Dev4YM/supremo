import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getGuildFromContext } from '../helpers/guild-helper';

@Injectable()
export class RemoveRoleAction extends BaseAction {
  type = 'remove_role';
  name = 'Remove Role';
  description = 'Remove a role from a user';
  icon = '➖';
  category = 'moderation';

  constructor(
    private discordService: DiscordService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      // Interpolate userId if provided, otherwise default to trigger user
      const userId = config.userId 
        ? this.interpolate(config.userId, context) 
        : context.user?.discordId;
      const roleId = config.roleId ? this.interpolate(config.roleId, context) : config.roleId;

      if (!userId || !roleId) {
        return this.failure('User ID and Role ID are required');
      }

      const guildData = await getGuildFromContext(context, this.prisma, this.discordService);
      if (!guildData) {
        return this.failure('Guild not found');
      }

      const { dbGuild, discordGuild: guild } = guildData;
      const member = await this.discordService.getMember(dbGuild.discordGuildId, userId);
      if (!member) {
        return this.failure('User not found in guild');
      }

      // Prevent role changes on owner or bot
      if (!this.discordService.canModerateMember(userId, guild)) {
        return this.failure('Cannot modify roles for the server owner or bot');
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return this.failure('Role not found');
      }

      if (!member.roles.cache.has(roleId)) {
        return this.success({ userId, roleId, message: 'User does not have role' });
      }

      const reason = config.reason 
        ? this.interpolate(config.reason, context)
        : `Automated action: ${context.automation?.name || 'Unknown'}`;
      await member.roles.remove(roleId, reason);

      // Note: Role history logging removed - model doesn't exist in schema
      // If needed, add roleHistory model to schema or use Action model instead

      return this.success({ userId, roleId, roleName: role.name });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to remove role', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.roleId);
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
        roleId: { type: 'string', description: 'Role ID to remove' },
        reason: { type: 'string', description: 'Reason for role removal' },
      },
      required: ['roleId'],
    };
  }
}

