import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async getSentMessages(filters?: {
    guildId: string;
    channelId?: string;
    staticMessageKey?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      guildId: filters?.guildId,
    };
    
    if (filters?.channelId) {
      where.channelId = filters.channelId;
    }
    
    if (filters?.staticMessageKey) {
      where.staticMessageKey = filters.staticMessageKey;
    }

    return this.prisma.sentMessage.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      include: {
        staticMessage: {
          select: {
            key: true,
            content: true,
          },
        },
      },
    });
  }

  async sendStaticMessage(key: string, channelId: string | undefined, replaceExisting: boolean, guildId: string) {
    const staticMessage = await this.prisma.staticMessage.findFirst({
      where: { guildId, key },
    });

    if (!staticMessage) {
      throw new Error(`Static message with key "${key}" not found`);
    }

    if (!staticMessage.enabled) {
      throw new Error(`Static message "${key}" is disabled`);
    }

    const targetChannelId = channelId || staticMessage.channelId;
    if (!targetChannelId) {
      throw new Error('No channel specified for message');
    }

    const channel = await this.discordService.getChannel(targetChannelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Replace placeholders if needed
    let content = staticMessage.content;
    // Note: In a real implementation, you'd replace {user}, {username}, {guild} placeholders
    // For now, we'll send as-is

    // Smart handling: If replaceExisting is true, find and delete previous messages from this static message
    if (replaceExisting) {
      const previousMessages = await this.prisma.sentMessage.findMany({
        where: {
          staticMessageId: staticMessage.id,
          channelId: targetChannelId,
          deleted: false,
        },
        orderBy: { sentAt: 'desc' },
      });

      // Delete previous Discord messages
      for (const prevMsg of previousMessages) {
        try {
          const discordMessage = await channel.messages.fetch(prevMsg.messageId).catch(() => null);
          if (discordMessage) {
            await discordMessage.delete();
            this.logger.log(`Deleted previous static message "${key}" (${prevMsg.messageId})`);
          }
        } catch (error) {
          this.logger.warn(`Could not delete previous message ${prevMsg.messageId}:`, error);
        }

        // Mark as deleted in database
        await this.prisma.sentMessage.update({
          where: { id: prevMsg.id },
          data: { deleted: true, deletedAt: new Date() },
        });
      }
    }

    // Send new message
    const message = await channel.send(content);

    // Record sent message
    const sentMessage = await this.prisma.sentMessage.create({
      data: {
        guildId,
        messageId: message.id,
        channelId: targetChannelId,
        staticMessageId: staticMessage.id,
        content: content,
        sentAt: message.createdAt,
      },
    });

    // Update last sent timestamp
    await this.prisma.staticMessage.updateMany({
      where: { guildId, key },
      data: { lastSentAt: new Date() },
    });

    this.logger.log(`Sent static message "${key}" to channel ${targetChannelId}`);

    return sentMessage;
  }

  async updateStaticMessage(key: string, newContent: string, channelId: string | undefined, guildId: string) {
    const staticMessage = await this.prisma.staticMessage.findFirst({
      where: { guildId, key },
    });

    if (!staticMessage) {
      throw new Error(`Static message with key "${key}" not found`);
    }

    // Update the static message content
    await this.prisma.staticMessage.updateMany({
      where: { guildId, key },
      data: {
        content: newContent,
        channelId: channelId || staticMessage.channelId,
        updatedAt: new Date(),
      },
    });

    // If there are existing sent messages and channel is configured, update them
    const targetChannelId = channelId || staticMessage.channelId;
    if (targetChannelId) {
      const existingMessages = await this.prisma.sentMessage.findMany({
        where: {
          guildId,
          staticMessageId: staticMessage.id,
          channelId: targetChannelId,
          deleted: false,
        },
      });

      const channel = await this.discordService.getChannel(targetChannelId);
      if (channel) {
        for (const sentMsg of existingMessages) {
          try {
            const discordMessage = await channel.messages.fetch(sentMsg.messageId).catch(() => null);
            if (discordMessage) {
              // Try to edit the message
              await discordMessage.edit(newContent);
              // Update database record
              await this.prisma.sentMessage.update({
                where: { id: sentMsg.id },
                data: { content: newContent },
              });
              this.logger.log(`Updated static message "${key}" in Discord (${sentMsg.messageId})`);
            }
          } catch (error) {
            // If edit fails (message too old or other reason), delete and resend
            this.logger.warn(`Could not edit message ${sentMsg.messageId}, will delete and resend:`, error);
            try {
              const discordMessage = await channel.messages.fetch(sentMsg.messageId).catch(() => null);
              if (discordMessage) {
                await discordMessage.delete();
              }
            } catch (deleteError) {
              this.logger.warn(`Could not delete message ${sentMsg.messageId}:`, deleteError);
            }
            await this.prisma.sentMessage.update({
              where: { id: sentMsg.id },
              data: { deleted: true, deletedAt: new Date() },
            });
          }
        }
      }
    }

    return staticMessage;
  }

  async deleteSentMessage(id: string, guildId: string) {
    const sentMessage = await this.prisma.sentMessage.findFirst({
      where: { id, guildId },
    });

    if (!sentMessage) {
      throw new Error('Sent message not found');
    }

    try {
      const channel = await this.discordService.getChannel(sentMessage.channelId);
      if (channel) {
        const discordMessage = await channel.messages.fetch(sentMessage.messageId);
        if (discordMessage) {
          await discordMessage.delete();
        }
      }
    } catch (error) {
      this.logger.warn(`Could not delete Discord message: ${error}`);
    }

    return this.prisma.sentMessage.delete({
      where: { id },
    });
  }

  async getStaticMessage(key: string, guildId: string) {
    return this.prisma.staticMessage.findFirst({
      where: { guildId, key },
    });
  }

  async getSentMessage(id: string, guildId: string) {
    return this.prisma.sentMessage.findFirst({
      where: { id, guildId },
    });
  }
}

