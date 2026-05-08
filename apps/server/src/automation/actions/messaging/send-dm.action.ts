import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { DiscordService } from '../../../discord/discord.service';
import { MessageBuilderService } from '../../../messaging/message-builder.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getGuildFromContext } from '../helpers/guild-helper';

@Injectable()
export class SendDMAction extends BaseAction {
  type = 'send_dm';
  name = 'Send Direct Message';
  description = 'Send a direct message to a user';
  icon = '💬';
  category = 'messaging';

  constructor(
    private discordService: DiscordService,
    private messageBuilder: MessageBuilderService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const userId = config.userId || context.user?.discordId;
      if (!userId) {
        return this.failure('User ID is required');
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

      let messageOptions: any = {};

      // Handle message type
      if (config.type === 'embed' || config.embed) {
        messageOptions = await this.messageBuilder.buildEmbed(config.embed || config, context);
        if (config.content) {
          messageOptions.content = this.interpolate(config.content, context);
        }
      } else if (config.type === 'interactive' || config.components) {
        const content = config.content ? this.interpolate(config.content, context) : '';
        messageOptions = await this.messageBuilder.buildInteractive(content, config.components, context);
      } else {
        // Plain text message
        const content = this.interpolate(config.content || '', context);
        if (!content) {
          return this.failure('Message content is required');
        }
        messageOptions = { content };
      }

      const message = await member.send(messageOptions);

      // Add reactions if specified
      if (config.reactions && Array.isArray(config.reactions)) {
        for (const reaction of config.reactions) {
          try {
            await message.react(reaction);
          } catch (error) {
            // Ignore reaction errors
          }
        }
      }
      return this.success({ messageId: message.id, userId });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to send DM', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.userId || config.content);
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
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
            author: { type: 'object' },
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
      required: ['content'],
    };
  }
}

