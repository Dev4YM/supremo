import { Injectable, Logger } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowContext } from './interfaces/action.interface';

export interface PlaceholderDefinition {
  name: string;
  description: string;
  example: string;
  category: string;
  availableIn?: string[]; // Action types where this placeholder is available
  requiresContext?: string[]; // Required context fields (e.g., ['user', 'message'])
  source: 'system' | 'discord' | 'custom'; // Where this placeholder comes from
}

@Injectable()
export class PlaceholderService {
  private readonly logger = new Logger(PlaceholderService.name);

  constructor(
    private discordService: DiscordService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all available placeholders for a given context
   */
  async getPlaceholders(context?: {
    actionType?: string;
    triggerType?: string;
    guildId?: string;
  }): Promise<PlaceholderDefinition[]> {
    const placeholders: PlaceholderDefinition[] = [];

    // System placeholders (always available)
    placeholders.push(...this.getSystemPlaceholders());

    // Discord-based placeholders (dynamically fetched)
    if (context?.guildId) {
      const discordPlaceholders = await this.getDiscordPlaceholders(context.guildId);
      placeholders.push(...discordPlaceholders);
    }

    // Action-specific placeholders
    if (context?.actionType) {
      const actionPlaceholders = this.getActionSpecificPlaceholders(context.actionType);
      placeholders.push(...actionPlaceholders);
    }

    // Trigger-specific placeholders
    if (context?.triggerType) {
      const triggerPlaceholders = this.getTriggerSpecificPlaceholders(context.triggerType);
      placeholders.push(...triggerPlaceholders);
    }

    // Filter by availability if actionType is specified
    if (context?.actionType) {
      return placeholders.filter(
        (p) => !p.availableIn || p.availableIn.includes(context.actionType!),
      );
    }

    return placeholders;
  }

  /**
   * Get system placeholders (always available)
   */
  private getSystemPlaceholders(): PlaceholderDefinition[] {
    return [
      {
        name: '{user}',
        description: 'User Discord ID',
        example: '123456789012345678',
        category: 'User',
        source: 'system',
        requiresContext: ['user'],
      },
      {
        name: '{username}',
        description: 'Username',
        example: 'JohnDoe',
        category: 'User',
        source: 'system',
        requiresContext: ['user'],
      },
      {
        name: '{mention}',
        description: 'User mention tag',
        example: '<@123456789012345678>',
        category: 'User',
        source: 'system',
        requiresContext: ['user'],
      },
      {
        name: '{trustScore}',
        description: 'User trust score',
        example: '85',
        category: 'User',
        source: 'system',
        requiresContext: ['user'],
      },
      {
        name: '{messageCount}',
        description: 'User message count',
        example: '1250',
        category: 'User',
        source: 'system',
        requiresContext: ['user'],
      },
      {
        name: '{joinDate}',
        description: 'User join date',
        example: '1/15/2024',
        category: 'User',
        source: 'system',
        requiresContext: ['user'],
      },
      {
        name: '{guild}',
        description: 'Server name',
        example: 'My Server',
        category: 'Server',
        source: 'system',
        requiresContext: ['guild'],
      },
      {
        name: '{guildId}',
        description: 'Server Discord ID',
        example: '987654321098765432',
        category: 'Server',
        source: 'system',
        requiresContext: ['guild'],
      },
      {
        name: '{channel}',
        description: 'Channel name',
        example: 'general',
        category: 'Channel',
        source: 'system',
        requiresContext: ['channel'],
      },
      {
        name: '{channelId}',
        description: 'Channel Discord ID',
        example: '456789012345678901',
        category: 'Channel',
        source: 'system',
        requiresContext: ['channel'],
      },
      {
        name: '{message}',
        description: 'Message content',
        example: 'Hello world!',
        category: 'Message',
        source: 'system',
        requiresContext: ['message'],
      },
      {
        name: '{messageId}',
        description: 'Message Discord ID',
        example: '987654321098765432',
        category: 'Message',
        source: 'system',
        requiresContext: ['message'],
      },
      {
        name: '{timestamp}',
        description: 'Current timestamp',
        example: '2024-01-15T10:30:00Z',
        category: 'System',
        source: 'system',
      },
      {
        name: '{date}',
        description: 'Current date',
        example: '1/15/2024',
        category: 'System',
        source: 'system',
      },
      {
        name: '{time}',
        description: 'Current time',
        example: '10:30 AM',
        category: 'System',
        source: 'system',
      },
    ];
  }

  /**
   * Get Discord-based placeholders (roles, channels, etc.)
   */
  private async getDiscordPlaceholders(guildId: string): Promise<PlaceholderDefinition[]> {
    const placeholders: PlaceholderDefinition[] = [];

    try {
      // Get the guild from database to get discordGuildId
      const dbGuild = await this.prisma.guild.findUnique({
        where: { id: guildId },
      });
      
      if (!dbGuild) {
        return placeholders;
      }

      const guild = await this.discordService.getGuild(dbGuild.discordGuildId);
      if (!guild) {
        return placeholders;
      }

      // Get roles
      const roles = guild.roles.cache
        .filter((role) => !role.managed && role.name !== '@everyone')
        .map((role) => ({
          name: `{role.${role.name}}`,
          description: `Role: ${role.name}`,
          example: role.id,
          category: 'Role',
          source: 'discord' as const,
        }));

      placeholders.push(...roles);

      // Get channels
      const channels = guild.channels.cache
        .filter((channel) => channel.isTextBased())
        .map((channel) => ({
          name: `{channel.${channel.name}}`,
          description: `Channel: ${channel.name}`,
          example: channel.id,
          category: 'Channel',
          source: 'discord' as const,
        }));

      placeholders.push(...channels);

      // Get member count
      placeholders.push({
        name: '{memberCount}',
        description: 'Total server member count',
        example: guild.memberCount.toString(),
        category: 'Server',
        source: 'discord',
        requiresContext: ['guild'],
      });
    } catch (error) {
      this.logger.error('Failed to fetch Discord placeholders:', error);
    }

    return placeholders;
  }

  /**
   * Get action-specific placeholders
   */
  private getActionSpecificPlaceholders(actionType: string): PlaceholderDefinition[] {
    const actionPlaceholders: Record<string, PlaceholderDefinition[]> = {
      send_message: [
        {
          name: '{message.id}',
          description: 'ID of the message that triggered the automation',
          example: '987654321098765432',
          category: 'Message',
          source: 'system',
          availableIn: ['send_message'],
          requiresContext: ['message'],
        },
        {
          name: '{message.content}',
          description: 'Content of the message that triggered the automation',
          example: 'Hello world!',
          category: 'Message',
          source: 'system',
          availableIn: ['send_message'],
          requiresContext: ['message'],
        },
        {
          name: '{message.channelId}',
          description: 'ID of the channel where the message was sent',
          example: '456789012345678901',
          category: 'Message',
          source: 'system',
          availableIn: ['send_message'],
          requiresContext: ['message'],
        },
      ],
      send_dm: [
        {
          name: '{dmChannel}',
          description: 'DM channel ID',
          example: '123456789012345678',
          category: 'Channel',
          source: 'system',
          availableIn: ['send_dm'],
        },
      ],
      warn: [
        {
          name: '{reason}',
          description: 'Reason for the warning',
          example: 'Violation of server rules',
          category: 'Moderation',
          source: 'system',
          availableIn: ['warn'],
        },
        {
          name: '{warnCount}',
          description: 'Number of warnings the user has',
          example: '3',
          category: 'Moderation',
          source: 'system',
          availableIn: ['warn'],
          requiresContext: ['user'],
        },
      ],
      timeout: [
        {
          name: '{duration}',
          description: 'Duration of the timeout',
          example: '1h',
          category: 'Moderation',
          source: 'system',
          availableIn: ['timeout'],
        },
        {
          name: '{timeoutUntil}',
          description: 'Timestamp when timeout expires',
          example: '2024-01-15T11:30:00Z',
          category: 'Moderation',
          source: 'system',
          availableIn: ['timeout'],
        },
      ],
      create_incident: [
        {
          name: '{rule}',
          description: 'Rule that triggered the incident',
          example: 'Spam Detection',
          category: 'Moderation',
          source: 'system',
          availableIn: ['create_incident'],
        },
        {
          name: '{evidence}',
          description: 'Evidence for the incident',
          example: 'Message content or attachment',
          category: 'Moderation',
          source: 'system',
          availableIn: ['create_incident'],
        },
        {
          name: '{severity}',
          description: 'Severity level of the incident',
          example: 'high',
          category: 'Moderation',
          source: 'system',
          availableIn: ['create_incident'],
        },
      ],
      add_role: [
        {
          name: '{role}',
          description: 'Role name being added',
          example: 'Member',
          category: 'Role',
          source: 'system',
          availableIn: ['add_role'],
        },
        {
          name: '{roleId}',
          description: 'Role ID being added',
          example: '456789012345678901',
          category: 'Role',
          source: 'system',
          availableIn: ['add_role'],
        },
      ],
      remove_role: [
        {
          name: '{role}',
          description: 'Role name being removed',
          example: 'Member',
          category: 'Role',
          source: 'system',
          availableIn: ['remove_role'],
        },
        {
          name: '{roleId}',
          description: 'Role ID being removed',
          example: '456789012345678901',
          category: 'Role',
          source: 'system',
          availableIn: ['remove_role'],
        },
      ],
      custom_code: [
        {
          name: '{variables.*}',
          description: 'Custom variables set in previous blocks',
          example: '{variables.yourVar}',
          category: 'Custom',
          source: 'custom',
          availableIn: ['custom_code'],
        },
      ],
    };

    return actionPlaceholders[actionType] || [];
  }

  /**
   * Get trigger-specific placeholders
   */
  private getTriggerSpecificPlaceholders(triggerType: string): PlaceholderDefinition[] {
    const triggerPlaceholders: Record<string, PlaceholderDefinition[]> = {
      message_sent: [
        {
          name: '{message.author}',
          description: 'Message author username',
          example: 'JohnDoe',
          category: 'Message',
          source: 'system',
          requiresContext: ['message'],
        },
        {
          name: '{message.authorId}',
          description: 'Message author Discord ID',
          example: '123456789012345678',
          category: 'Message',
          source: 'system',
          requiresContext: ['message'],
        },
      ],
      member_joined: [
        {
          name: '{joinTimestamp}',
          description: 'When the member joined',
          example: '2024-01-15T10:30:00Z',
          category: 'User',
          source: 'system',
          requiresContext: ['user'],
        },
      ],
      member_left: [
        {
          name: '{leaveTimestamp}',
          description: 'When the member left',
          example: '2024-01-15T10:30:00Z',
          category: 'User',
          source: 'system',
          requiresContext: ['user'],
        },
      ],
      role_added: [
        {
          name: '{role.name}',
          description: 'Name of the role that was added',
          example: 'Member',
          category: 'Role',
          source: 'system',
          requiresContext: ['role'],
        },
        {
          name: '{role.id}',
          description: 'ID of the role that was added',
          example: '456789012345678901',
          category: 'Role',
          source: 'system',
          requiresContext: ['role'],
        },
      ],
      role_removed: [
        {
          name: '{role.name}',
          description: 'Name of the role that was removed',
          example: 'Member',
          category: 'Role',
          source: 'system',
          requiresContext: ['role'],
        },
        {
          name: '{role.id}',
          description: 'ID of the role that was removed',
          example: '456789012345678901',
          category: 'Role',
          source: 'system',
          requiresContext: ['role'],
        },
      ],
    };

    return triggerPlaceholders[triggerType] || [];
  }

  /**
   * Interpolate placeholders in a template string using context
   */
  interpolate(template: string, context: WorkflowContext): string {
    let result = template;

    // System placeholders
    const systemPlaceholders = [
      { pattern: /\{user\}/g, value: context.user?.discordId || '' },
      { pattern: /\{username\}/g, value: context.user?.username || '' },
      { pattern: /\{mention\}/g, value: context.user ? `<@${context.user.discordId}>` : '' },
      { pattern: /\{trustScore\}/g, value: context.user?.trustScore?.toString() || '0' },
      { pattern: /\{messageCount\}/g, value: context.user?.messageCount?.toString() || '0' },
      { pattern: /\{joinDate\}/g, value: context.user?.joinDate ? new Date(context.user.joinDate).toLocaleDateString() : '' },
      { pattern: /\{guild\}/g, value: context.guild?.name || '' },
      { pattern: /\{guildId\}/g, value: context.guild?.id || '' },
      { pattern: /\{memberCount\}/g, value: context.guild?.memberCount?.toString() || '0' },
      { pattern: /\{channel\}/g, value: context.channel?.name || '' },
      { pattern: /\{channelId\}/g, value: context.channel?.id || '' },
      { pattern: /\{message\}/g, value: context.message?.content || '' },
      { pattern: /\{messageId\}/g, value: context.message?.id || '' },
      { pattern: /\{message\.id\}/g, value: context.message?.id || '' },
      { pattern: /\{message\.content\}/g, value: context.message?.content || '' },
      { pattern: /\{message\.channelId\}/g, value: context.message?.channelId || '' },
      { pattern: /\{message\.author\}/g, value: context.message?.authorId || '' },
      { pattern: /\{message\.authorId\}/g, value: context.message?.authorId || '' },
      { pattern: /\{role\}/g, value: context.role?.name || '' },
      { pattern: /\{roleId\}/g, value: context.role?.id || '' },
      { pattern: /\{role\.name\}/g, value: context.role?.name || '' },
      { pattern: /\{role\.id\}/g, value: context.role?.id || '' },
      { pattern: /\{timestamp\}/g, value: new Date().toISOString() },
      { pattern: /\{date\}/g, value: new Date().toLocaleDateString() },
      { pattern: /\{time\}/g, value: new Date().toLocaleTimeString() },
    ];

    systemPlaceholders.forEach(({ pattern, value }) => {
      result = result.replace(pattern, value);
    });

    // Custom variables
    if (context.variables) {
      Object.keys(context.variables).forEach((key) => {
        const pattern = new RegExp(`\\{variables\\.${key}\\}`, 'g');
        result = result.replace(pattern, String(context.variables[key]));
        // Also support {key} format for backward compatibility
        const simplePattern = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(simplePattern, String(context.variables[key]));
      });
    }

    // Discord role/channel placeholders (e.g., {role.Member}, {channel.general})
    // These are resolved at runtime if needed, but for now we'll leave them as-is
    // They can be resolved by querying Discord API if needed

    return result;
  }
}

