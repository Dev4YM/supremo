import { Injectable, Logger } from '@nestjs/common';
import { Message, GuildMember, Role, Interaction, GuildAuditLogsEntry, Guild as DiscordGuild } from 'discord.js';
import { DiscordService } from './discord.service';
import { MessageHandlerService } from './message-handler.service';
import { WelcomeService } from './welcome.service';
import { TriggerHandlerService } from '../automation/trigger-handler.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../shared/queue/queue.service';
import { DiscordEvent } from '../shared/types';

@Injectable()
export class DiscordGateway {
  private readonly logger = new Logger(DiscordGateway.name);
  private commandHandler: any; // Will be injected lazily to avoid circular dependency
  private antiRaidService: any; // Lazy injection
  private analyticsService: any; // Lazy injection

  constructor(
    private discordService: DiscordService,
    private messageHandler: MessageHandlerService,
    private welcomeService: WelcomeService,
    private triggerHandler: TriggerHandlerService,
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {
    this.setupEventHandlers();
  }

  setAntiRaidService(service: any) {
    this.antiRaidService = service;
  }

  setAnalyticsService(service: any) {
    this.analyticsService = service;
  }

  setCommandHandler(handler: any) {
    this.commandHandler = handler;
  }

  private setupEventHandlers() {
    const client = this.discordService.client;

    // Message events
    client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;
      
      // Publish to queue for intelligence analysis
      if (message.guild) {
        const guild = await this.prisma.guild.findUnique({
          where: { discordGuildId: message.guild.id },
        });
        
        if (guild) {
          const event: DiscordEvent = {
            type: 'message',
            guildId: guild.id,
            userId: message.author.id,
            data: {
              messageId: message.id,
              channelId: message.channel.id,
              content: message.content,
              attachments: message.attachments.map(a => ({ id: a.id, url: a.url })),
              createdAt: message.createdAt.toISOString(),
            },
          };
          
          // Queue for ML analysis
          await this.queueService.addMLAnalysis({
            event,
            guildId: guild.id,
            userId: message.author.id,
          }).catch((err) => {
            this.logger.error('Error queueing ML analysis:', err);
          });
        }
      }
      
      await this.messageHandler.handleMessage(message);
      // Trigger automation handler
      await this.triggerHandler.handleMessageSent(message).catch((err) => {
        this.logger.error('Error in trigger handler for message:', err);
      });
      // B8: Analytics - Record activity
      if (this.analyticsService && message.guild) {
        try {
          const guild = await this.prisma.guild.findUnique({
            where: { discordGuildId: message.guild.id },
          });
          if (guild) {
            await this.analyticsService.recordActivity(guild.id).catch((err) => {
              this.logger.error('Error recording activity:', err);
            });
            const hour = new Date().getHours();
            await this.analyticsService.recordEngagementHeatmap(
              guild.id,
              hour,
              message.channel.id,
            ).catch((err) => {
              this.logger.error('Error recording engagement heatmap:', err);
            });
          }
        } catch (error) {
          this.logger.error('Error in analytics for message:', error);
        }
      }
    });

    // Interaction (slash commands) events
    client.on('interactionCreate', async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      if (this.commandHandler) {
        await this.commandHandler.handleCommand(interaction).catch((err: any) => {
          this.logger.error('Error handling command:', err);
        });
      }
    });

    // Member join events
    client.on('guildMemberAdd', async (member: GuildMember) => {
      // Publish to queue for intelligence analysis (anti-raid detection)
      const guild = await this.prisma.guild.findUnique({
        where: { discordGuildId: member.guild.id },
      });
      
      if (guild) {
        const event: DiscordEvent = {
          type: 'member_join',
          guildId: guild.id,
          userId: member.user.id,
          data: {
            accountCreated: member.user.createdAt.toISOString(),
            joinedAt: member.joinedAt?.toISOString(),
            roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
          },
        };
        
        // Queue for join spam detection
        await this.queueService.addMLAnalysis({
          event,
          guildId: guild.id,
          userId: member.user.id,
        }).catch((err) => {
          this.logger.error('Error queueing join analysis:', err);
        });
      }
      
      await this.welcomeService.handleMemberJoin(member);
      // Trigger automation handler
      await this.triggerHandler.handleMemberJoin(member).catch((err) => {
        this.logger.error('Error in trigger handler for member join:', err);
      });
      // B8: Analytics - Record member growth
      if (this.analyticsService) {
        try {
          const guild = await this.prisma.guild.findUnique({
            where: { discordGuildId: member.guild.id },
          });
          if (guild) {
            await this.analyticsService.recordMemberGrowth(guild.id).catch((err) => {
              this.logger.error('Error recording member growth:', err);
            });
          }
        } catch (error) {
          this.logger.error('Error in analytics for member join:', error);
        }
      }
    });

    // Member leave events
    client.on('guildMemberRemove', async (member: GuildMember) => {
      await this.triggerHandler.handleMemberLeave(member).catch((err) => {
        this.logger.error('Error in trigger handler for member leave:', err);
      });
      // B8: Analytics - Record member growth
      if (this.analyticsService) {
        try {
          const guild = await this.prisma.guild.findUnique({
            where: { discordGuildId: member.guild.id },
          });
          if (guild) {
            await this.analyticsService.recordMemberGrowth(guild.id).catch((err) => {
              this.logger.error('Error recording member growth:', err);
            });
          }
        } catch (error) {
          this.logger.error('Error in analytics for member leave:', error);
        }
      }
    });

    // Role added events
    client.on('guildMemberUpdate', async (oldMember: GuildMember, newMember: GuildMember) => {
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;
      
      // Find added roles
      const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
      for (const role of addedRoles.values()) {
        await this.triggerHandler.handleRoleAdded(newMember, role).catch((err) => {
          this.logger.error('Error in trigger handler for role added:', err);
        });

        // B1: Anti-Raid - Role change alert
        await this.handleRoleChangeAlert(newMember, role, 'role_added').catch((err) => {
          this.logger.error('Error handling role change alert:', err);
        });
      }

      // Find removed roles
      const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));
      for (const role of removedRoles.values()) {
        await this.triggerHandler.handleRoleRemoved(newMember, role).catch((err) => {
          this.logger.error('Error in trigger handler for role removed:', err);
        });

        // B1: Anti-Raid - Role change alert
        await this.handleRoleChangeAlert(newMember, role, 'role_removed').catch((err) => {
          this.logger.error('Error handling role change alert:', err);
        });
      }
    });

    // Audit log events (B1: Anti-Raid)
    client.on('guildAuditLogEntryCreate', async (auditLog, guild) => {
      await this.handleAuditLogEntry(auditLog, guild).catch((err) => {
        this.logger.error('Error handling audit log entry:', err);
      });
    });

    // Error handling
    client.on('error', (error) => {
      this.logger.error('Discord gateway error:', error);
    });

    this.logger.log('Discord event handlers initialized');
  }

  private async handleRoleChangeAlert(
    member: GuildMember,
    role: Role,
    changeType: string,
  ) {
    try {
      if (!this.antiRaidService) return;

      const guild = await this.prisma.guild.findUnique({
        where: { discordGuildId: member.guild.id },
      });

      if (!guild) return;

      const user = await this.prisma.user.findFirst({
        where: { guildId: guild.id, discordId: member.user.id },
      });

      if (!user) return;

      await this.antiRaidService.createRoleChangeAlert(
        guild.id,
        user.id,
        member.user.id,
        changeType,
        role.id,
        role.name,
      );
    } catch (error) {
      this.logger.error('Error in handleRoleChangeAlert:', error);
    }
  }

  private async handleAuditLogEntry(auditLog: GuildAuditLogsEntry, guild: DiscordGuild) {
    try {
      if (!this.antiRaidService) return;

      const dbGuild = await this.prisma.guild.findUnique({
        where: { discordGuildId: guild.id },
      });

      if (!dbGuild) return;

      const watches = await this.antiRaidService.getAuditLogWatches(dbGuild.id);
      const matchingWatch = watches.find((w: any) => w.actionType === auditLog.action);

      if (matchingWatch && matchingWatch.enabled) {
        // Send alert
        this.logger.warn(
          `Audit log alert: ${auditLog.action} in guild ${guild.id} by ${auditLog.executor?.tag}`,
        );

        // Could send to alert channel here
      }
    } catch (error) {
      this.logger.error('Error in handleAuditLogEntry:', error);
    }
  }
}

