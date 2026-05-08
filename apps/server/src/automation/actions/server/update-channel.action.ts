import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';

@Injectable()
export class UpdateChannelAction extends BaseAction {
  type = 'update_channel';
  name = 'Update Channel';
  description = 'Update channel settings';
  icon = '✏️';
  category = 'server';

  constructor(private discordService: DiscordService) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const channelId = config.channelId;
      if (!channelId) {
        return this.failure('Channel ID is required');
      }

      const channel = await this.discordService.getChannel(channelId);
      if (!channel || !channel.isTextBased()) {
        return this.failure('Invalid channel');
      }

      const updates: any = {};

      if (config.name) {
        updates.name = this.interpolate(config.name, context);
      }
      if (config.topic !== undefined) {
        updates.topic = config.topic ? this.interpolate(config.topic, context) : null;
      }
      if (config.parentId !== undefined) {
        updates.parent = config.parentId || null;
      }

      if (Object.keys(updates).length === 0) {
        return this.failure('No updates provided');
      }

      await channel.edit(updates);

      return this.success({ channelId, updates });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to update channel', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.channelId && (config.name || config.topic !== undefined || config.parentId !== undefined));
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID to update' },
        name: { type: 'string', description: 'New channel name' },
        topic: { type: 'string', description: 'New channel topic (null to remove)' },
        parentId: { type: 'string', description: 'New parent category ID (null to remove)' },
      },
      required: ['channelId'],
    };
  }
}

