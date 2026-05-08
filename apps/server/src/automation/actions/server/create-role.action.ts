import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getGuildFromContext } from '../helpers/guild-helper';

@Injectable()
export class CreateRoleAction extends BaseAction {
  type = 'create_role';
  name = 'Create Role';
  description = 'Create a new role';
  icon = '👤';
  category = 'server';

  constructor(
    private discordService: DiscordService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const name = this.interpolate(config.name || '', context);
      const color = config.color;
      const mentionable = config.mentionable !== undefined ? config.mentionable : false;
      const hoist = config.hoist !== undefined ? config.hoist : false;

      if (!name) {
        return this.failure('Role name is required');
      }

      const guildData = await getGuildFromContext(context, this.prisma, this.discordService);
      if (!guildData) {
        return this.failure('Guild not found');
      }

      const { discordGuild: guild } = guildData;

      const role = await guild.roles.create({
        name,
        color: color ? parseInt(color.replace('#', ''), 16) : undefined,
        mentionable,
        hoist,
      });

      return this.success({ roleId: role.id, name: role.name });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to create role', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!config.name;
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Role name (supports placeholders)' },
        color: { type: 'string', description: 'Hex color (e.g., #FF0000)' },
        mentionable: { type: 'boolean', default: false },
        hoist: { type: 'boolean', default: false },
      },
      required: ['name'],
    };
  }
}

