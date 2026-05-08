import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Client, GatewayIntentBits, Guild, TextChannel } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { CacheManagerService } from '../cache-manager/cache-manager.service';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  public readonly client: Client;
  private readonly CACHE_KEY = 'discord_members';

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CacheManagerService))
    private readonly cacheManager: CacheManagerService,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
      ],
    });
  }

  async onModuleInit() {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');
    
    if (!token) {
      this.logger.error('DISCORD_BOT_TOKEN is not set in environment variables');
      throw new Error('Discord bot token is required');
    }

    this.client.once('ready', async () => {
      this.logger.log(`🤖 Bot logged in as ${this.client.user?.tag}`);
      this.logger.log(`📊 Connected to ${this.client.guilds.cache.size} guild(s)`);
      
      const guilds = await this.getGuilds();
      this.logger.log(`📋 Connected to ${guilds.length} guild(s)`);
      guilds.forEach((guild) => {
        this.logger.log(`  - ${guild.name} (${guild.memberCount} members)`);
      });

      const commandHandler = (global as any).commandHandler;
      if (commandHandler) {
        await commandHandler.registerCommands();
      }
    });

    this.client.on('error', (error) => {
      this.logger.error('Discord client error:', error);
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Discord client disconnected');
    });

    // Handle rate limit errors gracefully
    this.client.on('rateLimit', (rateLimitData) => {
      this.logger.warn(`Rate limit hit: ${rateLimitData.method} - Retry after ${rateLimitData.timeout}ms`);
    });

    try {
      await this.client.login(token);
    } catch (error: any) {
      if (error.message?.includes('disallowed intents') || error.message?.includes('Used disallowed intents')) {
        this.logger.error('');
        this.logger.error('❌ DISCORD INTENTS ERROR');
        this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.error('The bot requires privileged intents that must be enabled in Discord Developer Portal.');
        this.logger.error('');
        this.logger.error('📋 REQUIRED INTENTS:');
        this.logger.error('   1. MESSAGE CONTENT INTENT (Privileged)');
        this.logger.error('   2. SERVER MEMBERS INTENT (Privileged)');
        this.logger.error('');
        this.logger.error('🔧 HOW TO ENABLE:');
        this.logger.error('   1. Go to https://discord.com/developers/applications');
        this.logger.error('   2. Select your application');
        this.logger.error('   3. Go to "Bot" section');
        this.logger.error('   4. Scroll down to "Privileged Gateway Intents"');
        this.logger.error('   5. Enable:');
        this.logger.error('      ✅ MESSAGE CONTENT INTENT');
        this.logger.error('      ✅ SERVER MEMBERS INTENT');
        this.logger.error('   6. Save changes');
        this.logger.error('   7. Restart the bot');
        this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.error('');
      }
      throw error;
    }
  }

  /**
   * Get a Discord guild by Discord guild ID
   */
  async getGuild(discordGuildId: string): Promise<Guild | null> {
    return this.client.guilds.cache.get(discordGuildId) || null;
  }

  /**
   * Get all Discord guilds the bot is in
   */
  async getGuilds(): Promise<Guild[]> {
    return Array.from(this.client.guilds.cache.values());
  }

  /**
   * Get guild by database guild ID (legacy support)
   */
  async getGuildByDbId(): Promise<Guild | null> {
    const guildId = this.configService.get<string>('DISCORD_GUILD_ID');
    if (!guildId) return null;
    return this.client.guilds.cache.get(guildId) || null;
  }

  async getChannel(channelId: string): Promise<TextChannel | null> {
    const channel = await this.client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      return channel as TextChannel;
    }
    return null;
  }

  /**
   * Safely fetch a guild member, checking cache first to avoid rate limits
   */
  async getMember(discordGuildId: string, memberId: string) {
    const guild = await this.getGuild(discordGuildId);
    if (!guild) {
      return null;
    }

    // Check cache first
    let member = guild.members.cache.get(memberId);
    
    if (!member) {
      try {
        // Only fetch if not in cache
        member = await guild.members.fetch({ user: memberId, cache: true });
      } catch (error: any) {
        // Handle rate limit errors
        if (error.message?.includes('rate limit') || error.message?.includes('rate limited')) {
          this.logger.warn(`Rate limited while fetching member ${memberId}`);
          throw new Error('Discord rate limit: Please wait a moment and try again');
        }
        this.logger.error(`Error fetching member ${memberId}:`, error);
        return null;
      }
    }

    return member;
  }

  /**
   * Get member from a specific guild
   */
  async getMemberById(discordGuildId: string, memberId: string) {
    const guild = await this.getGuild(discordGuildId);
    if (!guild) {
      return null;
    }

    // Check cache first
    let member = guild.members.cache.get(memberId);
    
    if (!member) {
      try {
        member = await guild.members.fetch({ user: memberId, cache: true });
      } catch (error: any) {
        if (error.message?.includes('rate limit') || error.message?.includes('rate limited')) {
          this.logger.warn(`Rate limited while fetching member ${memberId}`);
          return null;
        }
        this.logger.error(`Error fetching member ${memberId}:`, error);
        return null;
      }
    }

    return member;
  }

  /**
   * Check if a member can be moderated (not owner or bot)
   */
  canModerateMember(memberId: string, guild: Guild): boolean {
    const botId = this.client.user?.id;
    const ownerId = guild.ownerId;

    // Cannot moderate owner
    if (memberId === ownerId) {
      return false;
    }

    // Cannot moderate bot
    if (memberId === botId) {
      return false;
    }

    return true;
  }

  /**
   * Get all guild channels (centralized function)
   * Uses Cache Manager for intelligent caching
   */
  async getAllChannels(discordGuildId: string, forceRefresh = false) {
    const cacheKey = `discord_channels`;
    const guild = await this.getGuild(discordGuildId);
    if (!guild) {
      return [];
    }

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await this.cacheManager.get<any[]>(cacheKey, discordGuildId);
        if (cached) {
          this.logger.log('Using cached Discord channels data');
          return cached;
        }
      }

      // Fetch from Discord
      this.logger.log('Fetching channels from Discord API...');
      const channels = await guild.channels.fetch();
      
      const channelList = Array.from(channels.values())
        .filter((channel) => channel && 'name' in channel)
        .map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          parentId: channel.parentId,
          position: channel.position || 0,
        }));

      // Store in cache
      await this.cacheManager.set(cacheKey, channelList, discordGuildId);
      this.logger.log(`Cached ${channelList.length} Discord channels`);

      return channelList;
    } catch (error: any) {
      this.logger.error('Error fetching all channels:');
      this.logger.error(error);
      
      // If rate limited, return cached channels if available
      if (error.message?.includes('rate limit') || error.code === 'RateLimitError') {
        this.logger.warn('Rate limited - attempting to return cached channels');
        
        const cached = await this.cacheManager.get<any[]>(cacheKey, discordGuildId);
        if (cached) {
          this.logger.log('Returning stale cached channels due to rate limit');
          return cached;
        }
        
        throw new Error('Discord rate limit: Please wait a moment and try again');
      }
      
      return [];
    }
  }

  /**
   * Get all guild roles (centralized function)
   * Uses Cache Manager for intelligent caching
   */
  async getAllRoles(discordGuildId: string, forceRefresh = false) {
    const cacheKey = `discord_roles`;
    const guild = await this.getGuild(discordGuildId);
    if (!guild) {
      return [];
    }

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await this.cacheManager.get<any[]>(cacheKey, discordGuildId);
        if (cached) {
          this.logger.log('Using cached Discord roles data');
          return cached;
        }
      }

      // Use cached roles from Discord.js (already cached by Discord.js)
      // But we still want to cache our formatted version
      const roles = Array.from(guild.roles.cache.values())
        .filter((role) => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map((role) => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          mentionable: role.mentionable,
          hoist: role.hoist,
          members: role.members.size,
        }));

      // Store in cache
      await this.cacheManager.set(cacheKey, roles, discordGuildId);
      this.logger.log(`Cached ${roles.length} Discord roles`);

      return roles;
    } catch (error: any) {
      this.logger.error('Error fetching all roles:');
      this.logger.error(error);
      
      // If rate limited, return cached roles if available
      if (error.message?.includes('rate limit') || error.code === 'RateLimitError') {
        this.logger.warn('Rate limited - attempting to return cached roles');
        
        const cached = await this.cacheManager.get<any[]>(cacheKey, discordGuildId);
        if (cached) {
          this.logger.log('Returning stale cached roles due to rate limit');
          return cached;
        }
      }
      
      // Fallback to Discord.js cache
      return Array.from(guild.roles.cache.values())
        .filter((role) => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map((role) => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          mentionable: role.mentionable,
          hoist: role.hoist,
          members: role.members.size,
        }));
    }
  }

  /**
   * Get all guild members (centralized function)
   * Fetches all members from Discord and returns them with proper filtering
   * Uses Cache Manager for intelligent caching
   */
  async getAllMembers(discordGuildId: string, forceRefresh = false) {
    const cacheKey = `discord_members`;
    const guild = await this.getGuild(discordGuildId);
    if (!guild) {
      return [];
    }

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await this.cacheManager.get<any[]>(cacheKey, discordGuildId);
        if (cached) {
          this.logger.log('Using cached Discord members data');
          return cached;
        }
      }

      // Fetch from Discord
      this.logger.log('Fetching members from Discord API...');
      await guild.members.fetch();
      
      // Get bot's user ID
      const botId = this.client.user?.id;
      
      // Get owner ID
      const ownerId = guild.ownerId;

      // Filter out bot and return all members
      const members = guild.members.cache
        .filter((member) => {
          // Exclude bot
          if (member.id === botId) return false;
          // Include everyone else (including owner)
          return true;
        })
        .map((member) => ({
          id: member.id,
          discordId: member.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          displayName: member.displayName,
          avatar: member.user.avatarURL(),
          bot: member.user.bot,
          isOwner: member.id === ownerId,
          roles: member.roles.cache
            .filter((role) => role.name !== '@everyone')
            .map((role) => ({
              id: role.id,
              name: role.name,
              color: role.color,
            })),
          joinedAt: member.joinedAt?.toISOString(),
          permissions: member.permissions.toArray(),
        }));

      // Store in cache
      await this.cacheManager.set(cacheKey, members, discordGuildId);
      this.logger.log(`Cached ${members.length} Discord members`);

      return members;
    } catch (error: any) {
      this.logger.error('Error fetching all members:');
      this.logger.error(error);
      
      // If rate limited, return cached members if available
      if (error.message?.includes('rate limit') || error.code === 'RateLimitError') {
        this.logger.warn('Rate limited - attempting to return cached members');
        
        const cached = await this.cacheManager.get<any[]>(cacheKey, discordGuildId);
        if (cached) {
          this.logger.log('Returning stale cached members due to rate limit');
          return cached;
        }
        
        throw new Error('Discord rate limit: Please wait a moment and try again');
      }
      
      return [];
    }
  }
}

