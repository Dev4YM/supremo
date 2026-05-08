import { Controller, Get, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DiscordService } from './discord.service';
import { MessageBuilderService } from '../messaging/message-builder.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('discord')
@Controller('api/discord')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class DiscordController {
  constructor(
    private discordService: DiscordService,
    private messageBuilder: MessageBuilderService,
    private prisma: PrismaService,
  ) {}

  @Get('channels')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getChannels(@CurrentGuild() guildId: string) {
    if (!guildId) {
      throw new NotFoundException('Guild ID is required. Please provide x-guild-id header or guildId query parameter.');
    }

    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new NotFoundException(`Guild ${guildId} not found. Please connect the guild first via POST /api/guilds/:discordGuildId/connect`);
    }

    // Use cached channels from DiscordService
    const channels = await this.discordService.getAllChannels(dbGuild.discordGuildId);
    return channels.filter((channel) => channel.type === 0 || channel.type === 2); // Text and voice channels
  }

  @Post('channels/:channelId/send')
  @RequirePermission('MESSAGES_SEND')
  async sendMessage(
    @Param('channelId') channelId: string,
    @Body() body: { content?: string; embed?: any; components?: any[] },
    @CurrentGuild() guildId: string,
  ) {
    const channel = await this.discordService.getChannel(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Handle structured payload
    let messageOptions: any = {};
    const emptyContext = {} as any;
    
    if (body.embed) {
      // Use MessageBuilderService for embed construction
      messageOptions = await this.messageBuilder.buildEmbed(body.embed, emptyContext);
      
      // Add content if provided
      if (body.content) {
        messageOptions.content = body.content;
      }
    } else if (body.components) {
      // Handle interactive components
      messageOptions = await this.messageBuilder.buildInteractive(
        body.content || '',
        body.components,
        emptyContext,
      );
    } else if (body.content) {
      // Plain text message
      messageOptions = { content: body.content };
    } else {
      throw new Error('Message content, embed, or components required');
    }

    const message = await channel.send(messageOptions);
    return {
      id: message.id,
      content: message.content,
      channelId: message.channel.id,
      createdAt: message.createdAt.toISOString(),
    };
  }

  @Get('guild')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getGuildInfo(@CurrentGuild() guildId: string) {
    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new Error('Guild not found');
    }

    const guild = await this.discordService.getGuild(dbGuild.discordGuildId);
    if (!guild) {
      throw new Error('Discord guild not found');
    }

    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL(),
    };
  }

  @Get('members')
  @RequirePermission('USERS_VIEW')
  async getAllMembers(@CurrentGuild() guildId: string) {
    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new Error('Guild not found');
    }

    const members = await this.discordService.getAllMembers(dbGuild.discordGuildId);
    return { members };
  }

  @Get('members/:memberId')
  @RequirePermission('USERS_VIEW')
  async getMember(@Param('memberId') memberId: string, @CurrentGuild() guildId: string) {
    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new Error('Guild not found');
    }

    try {
      const member = await this.discordService.getMember(dbGuild.discordGuildId, memberId);
      
      if (!member) {
        throw new Error('Member not found');
      }

      return {
        id: member.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatarURL(),
        roles: member.roles.cache.map((role) => ({
          id: role.id,
          name: role.name,
        })),
        joinedAt: member.joinedAt?.toISOString(),
      };
    } catch (error: any) {
      throw new Error(error.message || 'Member not found');
    }
  }
}

