import { Injectable, Logger } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelType } from 'discord.js';

@Injectable()
export class ServerService {
  private readonly logger = new Logger(ServerService.name);

  constructor(
    private readonly discordService: DiscordService,
    private readonly prisma: PrismaService,
  ) {}

  async getServerInfo(guildId: string) {
    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new Error('Guild not found');
    }

    const guild = await this.discordService.getGuild(dbGuild.discordGuildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Use cached channels from DiscordService
    const channels = await this.discordService.getAllChannels(dbGuild.discordGuildId);
    // Only count cached members, not all members
    const cachedMembersCount = guild.members.cache.size;
    // Use cached roles from DiscordService
    const rolesList = await this.discordService.getAllRoles(dbGuild.discordGuildId);

    return {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      icon: guild.iconURL(),
      banner: guild.bannerURL(),
      createdAt: guild.createdAt.toISOString(),
      stats: {
        totalChannels: channels.length,
        textChannels: channels.filter(c => c.type === 0).length,
        voiceChannels: channels.filter(c => c.type === 2).length,
        totalMembers: guild.memberCount, // Use guild.memberCount instead of fetched members
        cachedMembers: cachedMembersCount,
        totalRoles: rolesList.length,
      },
    };
  }

  async getRole(guildId: string, roleId: string) {
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

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      permissions: role.permissions.toArray(),
      mentionable: role.mentionable,
      hoist: role.hoist,
      managed: role.managed,
      memberCount: role.members.size,
    };
  }

  async getRoles(guildId: string) {
    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new Error('Guild not found');
    }

    // Use cached roles from DiscordService
    return await this.discordService.getAllRoles(dbGuild.discordGuildId);
  }

  async getChannels(guildId: string) {
    const dbGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!dbGuild) {
      throw new Error('Guild not found');
    }

    // Use cached channels from DiscordService
    return await this.discordService.getAllChannels(dbGuild.discordGuildId);
  }

  async createRole(guildId: string, data: { name: string; color?: string; mentionable?: boolean; hoist?: boolean }) {
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

    const role = await guild.roles.create({
      name: data.name,
      color: data.color ? parseInt(data.color.replace('#', ''), 16) : undefined,
      mentionable: data.mentionable,
      hoist: data.hoist,
    });

    return {
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
      mentionable: role.mentionable,
      hoist: role.hoist,
    };
  }

  async updateRole(guildId: string, id: string, data: { name?: string; color?: string; mentionable?: boolean; hoist?: boolean }) {
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

    const role = guild.roles.cache.get(id);
    if (!role) {
      throw new Error('Role not found');
    }

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.color !== undefined) updates.color = parseInt(data.color.replace('#', ''), 16);
    if (data.mentionable !== undefined) updates.mentionable = data.mentionable;
    if (data.hoist !== undefined) updates.hoist = data.hoist;

    await role.edit(updates);

    return {
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
      mentionable: role.mentionable,
      hoist: role.hoist,
    };
  }

  async deleteRole(guildId: string, id: string) {
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

    const role = guild.roles.cache.get(id);
    if (!role) {
      throw new Error('Role not found');
    }

    await role.delete();
    return { success: true };
  }

  async createChannel(guildId: string, data: { name: string; type?: string; parentId?: string; topic?: string }) {
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

    const channelType = data.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const channel = await guild.channels.create({
      name: data.name,
      type: channelType,
      parent: data.parentId,
      topic: data.topic,
    });

    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      position: channel.position,
    };
  }

  async updateChannel(guildId: string, id: string, data: { name?: string; topic?: string; parentId?: string }) {
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

    const channel = await guild.channels.fetch(id);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel not found or not text-based');
    }

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.topic !== undefined) updates.topic = data.topic;
    if (data.parentId !== undefined) updates.parent = data.parentId || null;

    await channel.edit(updates);

    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      position: 'position' in channel ? channel.position : 0,
    };
  }

  async getChannel(guildId: string, channelId: string) {
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

    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    return {
      id: channel.id,
      name: 'name' in channel ? channel.name : '',
      type: channel.type,
      parentId: 'parentId' in channel ? channel.parentId : null,
      position: 'position' in channel ? channel.position : 0,
    };
  }

  async deleteChannel(guildId: string, id: string) {
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

    const channel = await guild.channels.fetch(id);
    if (!channel) {
      throw new Error('Channel not found');
    }

    await channel.delete();
    return { success: true };
  }

  async getAuditLogs(guildId: string, limit: number) {
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

    const logs = await guild.fetchAuditLogs({ limit });
    return logs.entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      target: entry.target && 'id' in entry.target ? {
        id: entry.target.id,
        type: entry.target.constructor.name,
      } : null,
      executor: entry.executor ? {
        id: entry.executor.id,
        username: entry.executor.username,
      } : null,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  async getInvites(guildId: string) {
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

    const invites = await guild.invites.fetch();
    return Array.from(invites.values()).map((invite) => ({
      code: invite.code,
      channelId: invite.channelId,
      channelName: invite.channel?.name,
      inviter: invite.inviter ? {
        id: invite.inviter.id,
        username: invite.inviter.username,
      } : null,
      uses: invite.uses,
      maxUses: invite.maxUses,
      maxAge: invite.maxAge,
      createdAt: invite.createdAt?.toISOString(),
      expiresAt: invite.expiresAt?.toISOString(),
    }));
  }

  async createInvite(guildId: string, data: { channelId: string; maxAge?: number; maxUses?: number; temporary?: boolean }) {
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

    const channel = await guild.channels.fetch(data.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (!channel.isTextBased() || channel.isThread()) {
      throw new Error('Channel must be a text channel (not a thread)');
    }

    const invite = await (channel as any).createInvite({
      maxAge: data.maxAge,
      maxUses: data.maxUses,
      temporary: data.temporary,
    });

    return {
      code: invite.code,
      url: invite.url,
      channelId: invite.channelId,
      expiresAt: invite.expiresAt?.toISOString(),
    };
  }
}

