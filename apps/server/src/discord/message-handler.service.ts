import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessageHandlerService {
  private readonly logger = new Logger(MessageHandlerService.name);
  private autoModService: any; // Lazy injection

  constructor(
    private readonly prisma: PrismaService,
    private readonly moderationService: ModerationService,
    private readonly usersService: UsersService,
  ) {}

  setAutoModService(service: any) {
    this.autoModService = service;
  }

  async handleMessage(message: Message): Promise<void> {
    try {
      if (!message.guild) return;

      const guild = await this.prisma.guild.findUnique({
        where: { discordGuildId: message.guild.id },
      });

      if (!guild) {
        this.logger.warn(`Guild ${message.guild.id} not found in database, skipping message handling`);
        return;
      }

      // Ensure user exists in database
      await this.usersService.ensureUserExists(guild.id, {
        discordId: message.author.id,
        username: message.author.username,
        discriminator: message.author.discriminator,
        avatar: message.author.avatar,
      });

      // Store message selectively (only if flagged or for context)
      // For now, we'll store messages that might be relevant
      const shouldStore = await this.shouldStoreMessage(message);
      
      if (shouldStore) {
        await this.storeMessage(message, guild.id);
      }

      // B2: Auto-Moderation scan
      if (this.autoModService) {
        try {
          const user = await this.prisma.user.findFirst({
            where: { guildId: guild.id, discordId: message.author.id },
          });

          if (user) {
            const scanResults = await this.autoModService.scanMessage(
              guild.id,
              message.id,
              message.author.id,
              message.channel.id,
              message.content,
            );

            // If message was flagged, delete it
            if (scanResults && scanResults.length > 0 && scanResults.some((r: any) => r.flagged)) {
              await message.delete().catch(() => {
                this.logger.warn(`Failed to delete flagged message ${message.id}`);
              });
            }
          }
        } catch (error) {
          this.logger.error(`Error in auto-mod scan for message ${message.id}:`, error);
        }
      }

      // Analyze message for moderation
      await this.moderationService.analyzeMessage(message, guild.id);
    } catch (error) {
      this.logger.error(`Error handling message ${message.id}:`, error);
    }
  }

  private async shouldStoreMessage(message: Message): Promise<boolean> {
    // Store messages that:
    // 1. Are in monitored channels
    // 2. Contain potential violations
    // 3. Are replies to flagged messages
    
    // For now, store all messages (can be optimized later)
    return true;
  }

  private async storeMessage(message: Message, guildId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          guildId,
          discordId: message.author.id,
        },
      });

      if (!user) {
        this.logger.warn(`User ${message.author.id} not found when storing message`);
        return;
      }

      // Get surrounding context (last 5 messages)
      const context = await this.getMessageContext(message);

      await this.prisma.message.upsert({
        where: { guildId_messageId: { guildId, messageId: message.id } },
        create: {
          guildId,
          messageId: message.id,
          userId: user.id,
          channelId: message.channel.id,
          content: message.content,
          createdAt: message.createdAt,
        },
        update: {
          content: message.content,
        },
      });
    } catch (error) {
      this.logger.error(`Error storing message ${message.id}:`, error);
    }
  }

  private async getMessageContext(message: Message): Promise<any[] | null> {
    try {
      const channel = message.channel;
      if (!channel.isTextBased()) return null;

      const messages = await channel.messages.fetch({ limit: 5, before: message.id });
      return Array.from(messages.values())
        .reverse()
        .map((msg) => ({
          id: msg.id,
          author: msg.author.username,
          content: msg.content.substring(0, 200), // Limit content length
          timestamp: msg.createdTimestamp,
        }));
    } catch (error) {
      this.logger.error('Error fetching message context:', error);
      return null;
    }
  }
}

