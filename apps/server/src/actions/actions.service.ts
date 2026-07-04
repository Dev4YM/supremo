import { Injectable, Logger, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { CreateActionDto } from './dto/action.dto';
import { RealtimeGateway } from '../api-server/websocket/realtime.gateway';

@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async executeAction(data: CreateActionDto & { guildId: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: data.userId, guildId: data.guildId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: data.guildId },
    });

    if (!dbGuild) {
      throw new NotFoundException('Guild not found');
    }

    const guild = await this.discordService.getGuild(dbGuild.discordGuildId);
    if (!guild) {
      throw new NotFoundException('Discord guild not found');
    }

    const member = await this.discordService.getMember(dbGuild.discordGuildId, user.discordId);
    if (!member) {
      throw new NotFoundException('Member not found in guild');
    }

    const botId = this.discordService.client.user?.id;
    const ownerId = guild.ownerId;

    if (member.id === ownerId || member.id === botId) {
      throw new BadRequestException('Cannot perform moderation actions on server owner or bot');
    }

    if (member.user.bot && member.id !== botId) {
      throw new BadRequestException('Cannot perform moderation actions on bots');
    }

    let result: any = null;

    switch (data.actionType) {
      case 'warn':
        result = await this.executeWarn(member, data.reason);
        break;
      case 'timeout':
        result = await this.executeTimeout(member, data.duration || 3600, data.reason);
        break;
      case 'note':
        result = { success: true, message: 'Note recorded' };
        break;
      case 'kick':
        result = await this.executeKick(member, data.reason);
        break;
      case 'ban':
        result = await this.executeBan(member, data.reason);
        break;
      default:
        throw new BadRequestException(`Unknown action type: ${data.actionType}`);
    }

    // Map actionType to ActionType enum
    const actionTypeMap: Record<string, any> = {
      'warn': 'WARN',
      'timeout': 'TIMEOUT',
      'kick': 'KICK',
      'ban': 'BAN',
      'note': 'LOG_ONLY',
    };

    const action = await this.prisma.action.create({
      data: {
        guildId: data.guildId,
        type: actionTypeMap[data.actionType] || 'LOG_ONLY',
        targetUserId: data.userId,
        incidentId: data.incidentId,
        parameters: {
          duration: data.duration,
          reason: data.reason,
        },
        approvedBy: data.executor,
        status: 'COMPLETED',
        executedBy: data.executor,
        executedAt: new Date(),
      },
    });

    this.logger.log(`Action ${data.actionType} executed for user ${user.username} by ${data.executor}`);

    this.realtimeGateway?.broadcastActionCompleted(data.guildId, action.id, {
      action,
      result,
      type: action.type,
    });

    return { action, result };
  }

  private async executeWarn(member: any, reason?: string) {
    try {
      await member.send(
        `⚠️ **Warning from ${member.guild.name}**\n\n` +
        `You have received a warning from the moderation team.\n` +
        (reason ? `Reason: ${reason}\n` : '') +
        `\nPlease review the server rules to avoid further action.`,
      );
      return { success: true, message: 'Warning sent via DM' };
    } catch (error) {
      this.logger.warn(`Could not send DM to ${member.user.tag}:`, error);
      return { success: false, message: 'Could not send DM (user may have DMs disabled)' };
    }
  }

  private async executeTimeout(member: any, durationSeconds: number, reason?: string) {
    const timeoutUntil = new Date(Date.now() + durationSeconds * 1000);
    
    try {
      await member.timeout(timeoutUntil, reason || 'Moderation timeout');
      return { success: true, message: `User timed out until ${timeoutUntil.toISOString()}` };
    } catch (error) {
      this.logger.error(`Error timing out user ${member.user.tag}:`, error);
      throw error;
    }
  }

  private async executeKick(member: any, reason?: string) {
    try {
      await member.kick(reason || 'Moderation kick');
      return { success: true, message: 'User kicked from the server' };
    } catch (error) {
      this.logger.error(`Error kicking user ${member.user?.tag}:`, error);
      throw error;
    }
  }

  private async executeBan(member: any, reason?: string) {
    try {
      await member.ban({
        deleteMessageSeconds: 0,
        reason: reason || 'Moderation ban',
      });
      return { success: true, message: 'User banned from the server' };
    } catch (error) {
      this.logger.error(`Error banning user ${member.user?.tag}:`, error);
      throw error;
    }
  }

  async getActions(filters?: { guildId: string; userId?: string; limit?: number; offset?: number }) {
    const where: any = {
      guildId: filters?.guildId,
    };
    
    if (filters?.userId) {
      // Primary key is targetUserId; legacy rows may still have userId populated.
      where.OR = [{ targetUserId: filters.userId }, { userId: filters.userId }];
    }

    return this.prisma.action.findMany({
      where,
      include: {
        user: {
          select: {
            discordId: true,
            username: true,
          },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }
}

