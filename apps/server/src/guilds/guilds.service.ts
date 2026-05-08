import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../auth/rbac.service';
import { DiscordService } from '../discord/discord.service';
import { SeedManagerService } from '../seed-manager/seed-manager.service';
import { UpdateBrandingDto, BrandingResponseDto } from './dto/branding.dto';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly discordService: DiscordService,
    private readonly seedManager: SeedManagerService,
  ) {}

  async getUserGuilds(botUserId: string) {
    const discordGuilds = this.discordService.client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
    }));

    const accessibleGuildIds = await this.rbacService.getUserGuilds(botUserId);
    const dbGuilds = await this.prisma.guild.findMany({
      where: {
        OR: [
          { id: { in: accessibleGuildIds } },
          { discordGuildId: { in: discordGuilds.map((g) => g.id) } },
        ],
      },
      include: {
        members: {
          where: { botUserId },
          include: {
            role: true,
          },
        },
      },
    });

    // Merge Discord data with DB data
    return discordGuilds.map((discordGuild) => {
      const dbGuild = dbGuilds.find((g) => g.discordGuildId === discordGuild.id);
      const member = dbGuild?.members[0];

      return {
        id: dbGuild?.id || null,
        discordGuildId: discordGuild.id,
        name: discordGuild.name,
        icon: discordGuild.icon,
        memberCount: discordGuild.memberCount,
        connected: !!dbGuild,
        role: member?.role ? {
          id: member.role.id,
          key: member.role.key,
          name: member.role.name,
        } : null,
      };
    });
  }

  /**
   * Connect a Discord guild to the system
   */
  async connectGuild(discordGuildId: string, botUserId: string) {
    // Verify bot is in this guild
    const discordGuild = this.discordService.client.guilds.cache.get(discordGuildId);
    if (!discordGuild) {
      throw new NotFoundException('Bot is not in this Discord server');
    }

    // Check if guild already exists
    let guild = await this.prisma.guild.findUnique({
      where: { discordGuildId },
    });

    if (guild) {
      // Check if user is already a member
      const existingMember = await this.prisma.guildMember.findUnique({
        where: {
          guildId_botUserId: {
            guildId: guild.id,
            botUserId,
          },
        },
      });

      if (existingMember) {
        return guild;
      }
    } else {
      // Create guild record
      guild = await this.prisma.guild.create({
        data: {
          discordGuildId,
          name: discordGuild.name,
          icon: discordGuild.iconURL(),
          ownerDiscordId: discordGuild.ownerId,
        },
      });

      // Seed guild-specific defaults
      try {
        await this.seedManager.seedGuildDefaults(guild.id);
        this.logger.log(`✅ Seeded defaults for guild ${guild.id}`);
      } catch (error) {
        this.logger.error(`Failed to seed defaults for guild ${guild.id}:`, error);
        // Don't fail guild connection if seeding fails
      }
    }

    // Get or create Admin role for this guild
    let adminRole = await this.prisma.role.findFirst({
      where: {
        scope: 'GUILD',
        guildId: guild.id,
        key: 'ADMIN',
      },
    });

    if (!adminRole) {
      adminRole = await this.prisma.role.create({
        data: {
          scope: 'GUILD',
          guildId: guild.id,
          key: 'ADMIN',
          name: 'Admin',
          description: 'Full control over this guild',
        },
      });

      // Grant all permissions to admin role
      const allPermissions = await this.prisma.permission.findMany();
      await this.prisma.rolePermission.createMany({
        data: allPermissions.map((perm) => ({
          roleId: adminRole!.id,
          permissionId: perm.id,
          effect: 'ALLOW',
        })),
      });
    }

    // Add user as guild member with Admin role
    await this.prisma.guildMember.upsert({
      where: {
        guildId_botUserId: {
          guildId: guild.id,
          botUserId,
        },
      },
      update: {
        roleId: adminRole.id,
      },
      create: {
        guildId: guild.id,
        botUserId,
        roleId: adminRole.id,
      },
    });

    this.logger.log(`Guild ${discordGuildId} connected by user ${botUserId}`);

    return guild;
  }

  /**
   * Invite a user to a guild
   */
  async inviteUser(guildId: string, botUserId: string, invitedBy: string, roleKey: string = 'VIEWER') {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    // Verify inviter has permission
    const hasPermission = await this.rbacService.hasPermission(
      invitedBy,
      'GUILD_SETTINGS_EDIT',
      guildId,
    );

    if (!hasPermission) {
      throw new BadRequestException('You do not have permission to invite users');
    }

    // Get role
    const role = await this.prisma.role.findFirst({
      where: {
        scope: 'GUILD',
        guildId,
        key: roleKey,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleKey} not found`);
    }

    // Add user as member
    const member = await this.prisma.guildMember.upsert({
      where: {
        guildId_botUserId: {
          guildId,
          botUserId,
        },
      },
      update: {
        roleId: role.id,
      },
      create: {
        guildId,
        botUserId,
        roleId: role.id,
      },
    });

    return member;
  }

  /**
   * Get branding configuration for a guild
   */
  async getBranding(guildId: string): Promise<BrandingResponseDto | null> {
    await this.validateGuild(guildId);

    const branding = await this.prisma.guildBranding.findUnique({
      where: { guildId },
    });

    return branding;
  }

  /**
   * Update branding configuration for a guild
   */
  async updateBranding(guildId: string, botUserId: string, dto: UpdateBrandingDto): Promise<BrandingResponseDto> {
    await this.validateGuild(guildId);

    // Check permissions
    const hasPermission = await this.rbacService.hasPermission(
      botUserId,
      'GUILD_SETTINGS_EDIT',
      guildId,
    );

    if (!hasPermission) {
      throw new BadRequestException('You do not have permission to update branding');
    }

    // Upsert branding
    const branding = await this.prisma.guildBranding.upsert({
      where: { guildId },
      update: {
        ...dto,
        updatedAt: new Date(),
      },
      create: {
        guildId,
        ...dto,
        themeMode: dto.themeMode || 'dark',
        hideBranding: dto.hideBranding ?? false,
      },
    });

    this.logger.log(`Branding updated for guild ${guildId} by user ${botUserId}`);

    return branding;
  }

  /**
   * Reset branding to defaults
   */
  async resetBranding(guildId: string, botUserId: string): Promise<void> {
    await this.validateGuild(guildId);

    // Check permissions
    const hasPermission = await this.rbacService.hasPermission(
      botUserId,
      'GUILD_SETTINGS_EDIT',
      guildId,
    );

    if (!hasPermission) {
      throw new BadRequestException('You do not have permission to reset branding');
    }

    await this.prisma.guildBranding.delete({
      where: { guildId },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    this.logger.log(`Branding reset for guild ${guildId} by user ${botUserId}`);
  }

  private async validateGuild(guildId: string): Promise<void> {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
  }
}

