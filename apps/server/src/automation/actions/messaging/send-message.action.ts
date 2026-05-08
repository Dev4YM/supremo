import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';
import { MessageBuilderService } from '../../../messaging/message-builder.service';

@Injectable()
export class SendMessageAction extends BaseAction {
  type = 'send_message';
  name = 'Send Message';
  description = 'Send a text, embed, or interactive message to a channel';
  icon = '📨';
  category = 'messaging';

  constructor(
    private discordService: DiscordService,
    private messageBuilder: MessageBuilderService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const channelId = this.interpolate(config.channelId || '', context);
      if (!channelId) {
        return this.failure('Channel ID is required');
      }

      const channel = await this.discordService.getChannel(channelId);
      if (!channel || !channel.isTextBased()) {
        return this.failure('Invalid channel or channel is not text-based');
      }

      let messageOptions: any = {};

      // Handle message type
      if (config.type === 'embed' || config.embed) {
        messageOptions = await this.messageBuilder.buildEmbed(
          config.embed || config,
          context,
        );
      } else if (config.type === 'interactive' || config.components) {
        const content = config.content ? this.interpolate(config.content, context) : '';
        messageOptions = await this.messageBuilder.buildInteractive(
          content,
          config.components,
          context,
        );
      } else {
        // Plain text message
        const content = this.interpolate(config.content || '', context);
        if (!content) {
          return this.failure('Message content is required');
        }
        messageOptions = { content };
      }

      // Add reactions if specified
      if (config.reactions && Array.isArray(config.reactions)) {
        const message = await channel.send(messageOptions);
        for (const reaction of config.reactions) {
          try {
            await message.react(reaction);
          } catch (error) {
            // Ignore reaction errors
          }
        }
        return this.success({ messageId: message.id, channelId });
      } else {
        const message = await channel.send(messageOptions);
        return this.success({ messageId: message.id, channelId });
      }
    } catch (error: any) {
      return this.failure(error.message || 'Failed to send message', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.channelId && (config.content || config.embed || config.components));
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID to send message to' },
        type: { 
          type: 'string', 
          enum: ['text', 'embed', 'interactive'],
          default: 'text',
          description: 'Message type' 
        },
        content: { type: 'string', description: 'Message content (supports placeholders)' },
        embed: {
          type: 'object',
          description: 'Embed configuration',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            fields: { type: 'array' },
            image: { type: 'string' },
            thumbnail: { type: 'string' },
            footer: { type: 'object' },
          },
        },
        components: {
          type: 'array',
          description: 'Interactive components (buttons, select menus)',
        },
        reactions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Emoji reactions to add',
        },
      },
      required: ['channelId'],
    };
  }
}

