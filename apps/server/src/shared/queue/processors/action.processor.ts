import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { QueueService, ActionQueueJob } from '../queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DiscordService } from '../../../discord/discord.service';

@Processor('actions')
export class ActionProcessor {
  private readonly logger = new Logger(ActionProcessor.name);
  private discordService: DiscordService | null = null;

  constructor(
    private queueService: QueueService,
    private prisma: PrismaService,
  ) {}

  setDiscordService(service: DiscordService) {
    this.discordService = service;
  }

  @Process('execute_action')
  async handleAction(job: Job<ActionQueueJob['payload']>) {
    this.logger.log(`Processing action job ${job.id}: ${job.data.type}`);
    
    try {
      if (!this.discordService) {
        this.logger.warn('DiscordService not available, skipping action execution');
        return { success: false, error: 'DiscordService not available' };
      }

      const { type, guildId, userId, parameters } = job.data;
      
      // Get guild and user from database
      const guild = await this.prisma.guild.findUnique({
        where: { id: guildId },
      });
      
      if (!guild) {
        throw new Error(`Guild ${guildId} not found`);
      }

      const user = await this.prisma.user.findFirst({
        where: { id: userId, guildId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found in guild ${guildId}`);
      }

      // Get Discord guild and member
      const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
      if (!discordGuild) {
        throw new Error(`Discord guild ${guild.discordGuildId} not found`);
      }

      const member = await this.discordService.getMember(guild.discordGuildId, user.discordId);
      if (!member) {
        throw new Error(`Member ${user.discordId} not found in Discord guild`);
      }

      // Execute action based on type
      let result: any;
      
      switch (type) {
        case 'timeout':
          const duration = parameters.duration || 3600; // Default 1 hour
          await member.timeout(duration, parameters.reason || 'Automated moderation action');
          result = { success: true, message: `User timed out for ${duration} seconds` };
          break;
          
        case 'kick':
          await member.kick(parameters.reason || 'Automated moderation action');
          result = { success: true, message: 'User kicked from server' };
          break;
          
        case 'ban':
          const banDuration = parameters.duration ? parameters.duration * 1000 : undefined; // Convert to ms
          await member.ban({
            deleteMessageDays: parameters.deleteMessageDays || 0,
            reason: parameters.reason || 'Automated moderation action',
          });
          result = { success: true, message: 'User banned from server' };
          break;
          
        case 'delete_messages':
          // This would need channel context - simplified for now
          result = { success: true, message: `Delete ${parameters.count || 0} messages requested` };
          break;
          
        case 'assign_role':
          const role = discordGuild.roles.cache.get(parameters.roleId);
          if (role) {
            await member.roles.add(role, parameters.reason || 'Automated moderation action');
            result = { success: true, message: `Role ${role.name} assigned` };
          } else {
            throw new Error(`Role ${parameters.roleId} not found`);
          }
          break;
          
        case 'remove_role':
          const roleToRemove = discordGuild.roles.cache.get(parameters.roleId);
          if (roleToRemove) {
            await member.roles.remove(roleToRemove, parameters.reason || 'Automated moderation action');
            result = { success: true, message: `Role ${roleToRemove.name} removed` };
          } else {
            throw new Error(`Role ${parameters.roleId} not found`);
          }
          break;
          
        case 'warn':
          // Send DM warning
          try {
            await member.send(
              `⚠️ **Warning from ${discordGuild.name}**\n\n` +
              `You have received a warning from the moderation team.\n` +
              (parameters.reason ? `Reason: ${parameters.reason}\n` : '') +
              `\nPlease review the server rules to avoid further action.`,
            );
            result = { success: true, message: 'Warning sent via DM' };
          } catch (error) {
            this.logger.warn(`Could not send DM to ${member.user.tag}:`, error);
            result = { success: false, message: 'Could not send DM (user may have DMs disabled)' };
          }
          break;
          
        case 'log_only':
          result = { success: true, message: 'Action logged only' };
          break;
          
        default:
          throw new Error(`Unknown action type: ${type}`);
      }

      this.logger.log(`Action ${type} executed successfully for user ${user.username}`);
      
      return { success: true, jobId: job.id, result };
    } catch (error) {
      this.logger.error(`Error processing action job ${job.id}:`, error);
      throw error;
    }
  }
}

