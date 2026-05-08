import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowContext } from './interfaces/action.interface';
import { GuildMember, Message, Role } from 'discord.js';

@Injectable()
export class TriggerHandlerService {
  private readonly logger = new Logger(TriggerHandlerService.name);
  private cooldowns: Map<string, Date> = new Map();

  constructor(
    private prisma: PrismaService,
    private workflowEngine: WorkflowEngineService,
  ) {}

  async handleTrigger(
    triggerType: string,
    context: Partial<WorkflowContext>,
  ): Promise<void> {
    try {
      // Find all enabled automations with matching trigger type and guildId
      const where: any = {
        enabled: true,
        triggerType,
      };

      // Filter by guildId if provided
      if (context.guildId) {
        where.guildId = context.guildId;
      }

      const automations = await this.prisma.automation.findMany({
        where,
        orderBy: {
          priority: 'desc',
        },
      });

      for (const automation of automations) {
        // Check cooldown
        const cooldownKey = `${automation.id}_${context.user?.discordId || 'global'}`;
        const lastRun = this.cooldowns.get(cooldownKey);
        if (lastRun && automation.cooldown) {
          const cooldownMs = automation.cooldown * 1000;
          if (Date.now() - lastRun.getTime() < cooldownMs) {
            this.logger.debug(`Automation ${automation.id} is on cooldown`);
            continue;
          }
        }

        // Check trigger config filters
        if (automation.triggerConfig) {
          try {
            const triggerConfig = JSON.parse(automation.triggerConfig);
            if (!this.matchesTriggerConfig(triggerConfig, context)) {
              continue;
            }
          } catch (error) {
            this.logger.warn(`Invalid trigger config for automation ${automation.id}`);
          }
        }

        // Build full context with guildId
        const fullContext: WorkflowContext = {
          ...context,
          guildId: automation.guildId,
          trigger: {
            type: triggerType,
            timestamp: new Date(),
          },
        } as WorkflowContext;

        // Execute automation
        this.logger.log(`Executing automation: ${automation.name} (${automation.id})`);
        const workflow = JSON.parse(automation.workflow);
        const result = await this.workflowEngine.executeWorkflow(workflow, fullContext, automation.id, triggerType);

        if (result.success) {
          this.cooldowns.set(cooldownKey, new Date());
          this.logger.log(`Automation ${automation.id} executed successfully`);
        } else {
          this.logger.error(`Automation ${automation.id} failed: ${result.error}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error handling trigger ${triggerType}:`, error);
    }
  }

  private matchesTriggerConfig(config: any, context: Partial<WorkflowContext>): boolean {
    // Check channel filter
    if (config.channelId && context.channel?.id !== config.channelId) {
      return false;
    }

    // Check user filter
    if (config.userId && context.user?.discordId !== config.userId) {
      return false;
    }

    // Check role filter
    if (config.roleId && context.user?.roles && !context.user.roles.includes(config.roleId)) {
      return false;
    }

    // Check keyword filter (for message triggers)
    if (config.keyword && context.message?.content) {
      const keyword = config.keyword.toLowerCase();
      const content = context.message.content.toLowerCase();
      if (!content.includes(keyword)) {
        return false;
      }
    }

    // Check trust score filter
    if (config.minTrustScore && context.user?.trustScore !== undefined) {
      if (context.user.trustScore < config.minTrustScore) {
        return false;
      }
    }

    return true;
  }

  async handleMemberJoin(member: GuildMember): Promise<void> {
    if (!member.guild) return;

    const dbGuild = await this.prisma.guild.findUnique({
      where: { discordGuildId: member.guild.id },
    });

    if (!dbGuild) {
      this.logger.warn(`Guild ${member.guild.id} not found in database, skipping automation trigger`);
      return;
    }

    await this.handleTrigger('member_join', {
      guildId: dbGuild.id,
      user: {
        id: member.id,
        discordId: member.id,
        username: member.user.username,
        trustScore: 100,
        joinDate: member.joinedAt || new Date(),
        roles: member.roles.cache.map((r) => r.id),
      },
      guild: {
        id: member.guild.id,
        name: member.guild.name,
        memberCount: member.guild.memberCount,
      },
    });
  }

  async handleMemberLeave(member: GuildMember): Promise<void> {
    if (!member.guild) return;

    const dbGuild = await this.prisma.guild.findUnique({
      where: { discordGuildId: member.guild.id },
    });

    if (!dbGuild) {
      this.logger.warn(`Guild ${member.guild.id} not found in database, skipping automation trigger`);
      return;
    }

    await this.handleTrigger('member_leave', {
      guildId: dbGuild.id,
      user: {
        discordId: member.id,
        username: member.user.username,
        trustScore: 100,
      },
      guild: {
        id: member.guild.id,
        name: member.guild.name,
      },
    });
  }

  async handleMessageSent(message: Message): Promise<void> {
    if (!message.guild) return;

    const dbGuild = await this.prisma.guild.findUnique({
      where: { discordGuildId: message.guild.id },
    });

    if (!dbGuild) {
      this.logger.warn(`Guild ${message.guild.id} not found in database, skipping automation trigger`);
      return;
    }

    await this.handleTrigger('message_sent', {
      guildId: dbGuild.id,
      message: {
        id: message.id,
        content: message.content,
        channelId: message.channel.id,
        authorId: message.author.id,
      },
      channel: {
        id: message.channel.id,
        name: (message.channel as any).name || '',
        type: message.channel.type.toString(),
      },
      user: {
        discordId: message.author.id,
        username: message.author.username,
      },
    });
  }

  async handleRoleAdded(member: GuildMember, role: Role): Promise<void> {
    if (!member.guild) return;

    const dbGuild = await this.prisma.guild.findUnique({
      where: { discordGuildId: member.guild.id },
    });

    if (!dbGuild) {
      this.logger.warn(`Guild ${member.guild.id} not found in database, skipping automation trigger`);
      return;
    }

    await this.handleTrigger('role_added', {
      guildId: dbGuild.id,
      user: {
        discordId: member.id,
        username: member.user.username,
        trustScore: 100,
      },
      role: {
        id: role.id,
        name: role.name,
      },
    });
  }

  async handleRoleRemoved(member: GuildMember, role: Role): Promise<void> {
    if (!member.guild) return;

    const dbGuild = await this.prisma.guild.findUnique({
      where: { discordGuildId: member.guild.id },
    });

    if (!dbGuild) {
      this.logger.warn(`Guild ${member.guild.id} not found in database, skipping automation trigger`);
      return;
    }

    await this.handleTrigger('role_removed', {
      guildId: dbGuild.id,
      user: {
        discordId: member.id,
        username: member.user.username,
        trustScore: 100,
      },
      role: {
        id: role.id,
        name: role.name,
      },
    });
  }

  async handleTrustScoreChanged(userId: string, oldScore: number, newScore: number): Promise<void> {
    await this.handleTrigger('trust_score_changed', {
      user: {
        discordId: userId,
        username: '',
        trustScore: newScore,
      },
      variables: {
        oldScore,
        newScore,
        change: newScore - oldScore,
      },
    });
  }
}

