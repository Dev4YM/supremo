import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChannelType } from 'discord.js';
import { getGuildFromContext } from '../helpers/guild-helper';

@Injectable()
export class CreateChannelAction extends BaseAction {
  type = 'create_channel';
  name = 'Create Channel';
  description = 'Create a new channel';
  icon = '📁';
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
      const type = config.type || 'text';
      const parentId = config.parentId;
      const topic = config.topic ? this.interpolate(config.topic, context) : undefined;

      if (!name) {
        return this.failure('Channel name is required');
      }

      const guildData = await getGuildFromContext(context, this.prisma, this.discordService);
      if (!guildData) {
        return this.failure('Guild not found');
      }

      const { discordGuild: guild } = guildData;

      const channelType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

      const channel = await guild.channels.create({
        name,
        type: channelType,
        parent: parentId,
        topic,
      });

      return this.success({ channelId: channel.id, name: channel.name });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to create channel', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!config.name;
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Channel name (supports placeholders)' },
        type: { 
          type: 'string', 
          enum: ['text', 'voice'],
          default: 'text',
        },
        parentId: { type: 'string', description: 'Parent category ID (optional)' },
        topic: { type: 'string', description: 'Channel topic (optional)' },
      },
      required: ['name'],
    };
  }
}

