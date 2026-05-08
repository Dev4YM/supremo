import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';

@Injectable()
export class DeleteMessageAction extends BaseAction {
  type = 'delete_message';
  name = 'Delete Message';
  description = 'Delete a message';
  icon = '🗑️';
  category = 'messaging';

  constructor(private discordService: DiscordService) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const channelId = config.channelId || context.message?.channelId;
      const messageId = config.messageId || context.message?.id;

      if (!channelId || !messageId) {
        return this.failure('Channel ID and Message ID are required');
      }

      const channel = await this.discordService.getChannel(channelId);
      if (!channel || !channel.isTextBased()) {
        return this.failure('Invalid channel');
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        return this.failure('Message not found');
      }

      await message.delete();
      return this.success({ messageId, channelId });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to delete message', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!config.messageId;
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID' },
        messageId: { type: 'string', description: 'Message ID to delete' },
      },
      required: ['messageId'],
    };
  }
}

