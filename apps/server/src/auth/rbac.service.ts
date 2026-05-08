import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PermissionSet {
  permissions: Set<string>;
  isOwner: boolean;
  isGlobalAdmin: boolean;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolvePermissions(botUserId: string, guildId?: string): Promise<PermissionSet> {
    const permissions = new Set<string>();
    let isOwner = false;
    let isGlobalAdmin = false;

    const globalRoles = await this.prisma.botUserGlobalRole.findMany({
      where: { botUserId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    for (const userRole of globalRoles) {
      const role = userRole.role;
      
      if (role.key === 'OWNER') {
        isOwner = true;
        isGlobalAdmin = true;
      } else if (role.key === 'SUPPORT' || role.key === 'ADMIN') {
        isGlobalAdmin = true;
      }

      for (const rolePerm of role.permissions) {
        if (rolePerm.effect === 'ALLOW') {
          permissions.add(rolePerm.permission.key);
        } else if (rolePerm.effect === 'DENY') {
          permissions.delete(rolePerm.permission.key);
        }
      }
    }

    // If owner, grant all permissions
    if (isOwner) {
      const allPerms = await this.prisma.permission.findMany({
        select: { key: true },
      });
      allPerms.forEach((p) => permissions.add(p.key));
      return { permissions, isOwner, isGlobalAdmin };
    }

    // Get guild-specific role if guildId provided
    if (guildId) {
      const guildMember = await this.prisma.guildMember.findUnique({
        where: {
          guildId_botUserId: {
            guildId,
            botUserId,
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (guildMember) {
        // Apply guild role permissions
        for (const rolePerm of guildMember.role.permissions) {
          if (rolePerm.effect === 'ALLOW') {
            permissions.add(rolePerm.permission.key);
          } else if (rolePerm.effect === 'DENY') {
            permissions.delete(rolePerm.permission.key);
          }
        }

        // Apply custom permission overrides if any
        if (guildMember.customPermissions) {
          try {
            const customPerms = JSON.parse(guildMember.customPermissions);
            if (Array.isArray(customPerms)) {
              customPerms.forEach((perm: string) => permissions.add(perm));
            }
          } catch (e) {
            this.logger.warn(`Failed to parse custom permissions for user ${botUserId} in guild ${guildId}`);
          }
        }
      }
    }

    return { permissions, isOwner, isGlobalAdmin };
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(botUserId: string, permission: string, guildId?: string): Promise<boolean> {
    const { permissions, isOwner } = await this.resolvePermissions(botUserId, guildId);
    
    if (isOwner) {
      return true;
    }

    return permissions.has(permission);
  }

  /**
   * Check if user has access to a guild
   */
  async hasGuildAccess(botUserId: string, guildId: string): Promise<boolean> {
    // Owner has access to all guilds
    const { isOwner } = await this.resolvePermissions(botUserId);
    if (isOwner) {
      return true;
    }

    // Check if user is a member of the guild
    const member = await this.prisma.guildMember.findUnique({
      where: {
        guildId_botUserId: {
          guildId,
          botUserId,
        },
      },
    });

    return !!member;
  }

  /**
   * Get all guilds a user has access to
   */
  async getUserGuilds(botUserId: string): Promise<string[]> {
    const { isOwner } = await this.resolvePermissions(botUserId);
    
    if (isOwner) {
      // Owner can see all guilds
      const guilds = await this.prisma.guild.findMany({
        select: { id: true },
      });
      return guilds.map((g) => g.id);
    }

    // Get guilds where user is a member
    const members = await this.prisma.guildMember.findMany({
      where: { botUserId },
      select: { guildId: true },
    });

    return members.map((m) => m.guildId);
  }
}

