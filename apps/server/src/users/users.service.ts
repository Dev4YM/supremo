import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

/**
 * Service for managing users and Discord member synchronization
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  /**
   * Ensure a user exists in the database, creating if necessary
   * Updates user information if already exists
   * 
   * @param guildId - Guild ID
   * @param data - User data from Discord
   * @returns User entity
   */
  async ensureUserExists(
    guildId: string,
    data: {
      discordId: string;
      username: string;
      discriminator?: string;
      avatar?: string | null;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        guildId_discordId: {
          guildId,
          discordId: data.discordId,
        },
      },
    });

    if (user) {
      // Update username/avatar if changed
      if (user.username !== data.username || user.avatar !== data.avatar) {
        return this.prisma.user.update({
          where: { id: user.id },
          data: {
            username: data.username,
            discriminator: data.discriminator,
            avatar: data.avatar,
            lastActivity: new Date(),
          },
        });
      }

      // Update last activity
      return this.prisma.user.update({
        where: { id: user.id },
        data: { lastActivity: new Date() },
      });
    }

    // Create new user
    return this.prisma.user.create({
      data: {
        guildId,
        discordId: data.discordId,
        username: data.username,
        discriminator: data.discriminator,
        avatar: data.avatar,
        joinedAt: new Date(),
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Find a user by Discord ID within a guild
   * 
   * @param discordId - Discord user ID
   * @param guildId - Guild ID
   * @returns User with recent incidents and actions, or null if not found
   */
  async findByDiscordId(discordId: string, guildId: string) {
    return this.prisma.user.findFirst({
      where: {
        guildId,
        discordId,
      },
      include: {
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        actions: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get all users in a guild with optional filtering and pagination
   * 
   * @param filters - Filter options including guildId, limit, offset, and syncFromDiscord flag
   * @returns List of users with counts
   */
  async findAll(filters?: { guildId: string; limit?: number; offset?: number; syncFromDiscord?: boolean }) {
    // Only sync if explicitly requested and within reasonable limits
    if (filters?.syncFromDiscord && filters?.guildId) {
      try {
        await this.syncDiscordMembers(filters.guildId);
      } catch (error: any) {
        // If sync fails due to rate limit, continue with database data
        if (error.message?.includes('rate limit')) {
          this.logger.warn('Skipping sync due to rate limit - using database data');
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    return this.prisma.user.findMany({
      where: { guildId: filters?.guildId },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      orderBy: { lastActivity: 'desc' },
      include: {
        _count: {
          select: {
            incidents: true,
            actions: true,
            messages: true,
          },
        },
      },
    });
  }

  /**
   * Sync Discord guild members with database
   * This ensures all server members are in the database
   */
  async syncDiscordMembers(guildId: string, forceRefresh = false) {
    try {
      // Get guild from database to get discordGuildId
      const guild = await this.prisma.guild.findUnique({
        where: { id: guildId },
      });

      if (!guild) {
        this.logger.warn('Cannot sync members: Guild not found');
        return;
      }

      const discordMembers = await this.discordService.getAllMembers(guild.discordGuildId, forceRefresh);

      if (discordMembers.length === 0) {
        this.logger.warn('No Discord members to sync');
        return;
      }

      this.logger.log(`Syncing ${discordMembers.length} Discord members to database...`);

      for (const member of discordMembers) {
        await this.ensureUserExists(guildId, {
          discordId: member.discordId,
          username: member.username,
          discriminator: member.discriminator,
          avatar: member.avatar,
        });
      }

      this.logger.log(`Successfully synced ${discordMembers.length} members`);
    } catch (error: any) {
      this.logger.error('Error syncing Discord members:');
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Get all Discord members directly from Discord API (not from database)
   * 
   * @param guildId - Guild ID
   * @returns List of Discord members
   */
  async getAllDiscordMembers(guildId: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      this.logger.warn(`Guild ${guildId} not found`);
      return [];
    }

    return this.discordService.getAllMembers(guild.discordGuildId);
  }

  /**
   * Get comprehensive user profile with statistics
   * 
   * @param discordId - Discord user ID
   * @param guildId - Guild ID
   * @returns User profile with incidents, actions, and messages, or null if not found
   */
  async getUserProfile(discordId: string, guildId: string) {
    const user = await this.findByDiscordId(discordId, guildId);
    if (!user) {
      this.logger.warn(`User ${discordId} not found in guild ${guildId}`);
      return null;
    }

    const stats = await this.prisma.user.findFirst({
      where: {
        guildId,
        discordId,
      },
      include: {
        incidents: true,
        actions: true,
        messages: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return stats;
  }
}

