import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SetupStatus {
  ready: boolean;
  rbacSeeded: boolean;
  usersExist: boolean;
  guildCount: number;
  message: string;
}

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<SetupStatus> {
    // Check if RBAC is seeded (permissions and global roles exist)
    const permissionCount = await this.prisma.permission.count();
    const globalRoleCount = await this.prisma.role.count({
      where: { scope: 'GLOBAL', guildId: null },
    });
    const rbacSeeded = permissionCount > 0 && globalRoleCount > 0;

    // Check if any users exist
    const userCount = await this.prisma.botUser.count();
    const usersExist = userCount > 0;

    // Check guild count
    const guildCount = await this.prisma.guild.count();

    // Determine readiness
    const ready = rbacSeeded && usersExist;

    let message = '';
    if (!rbacSeeded) {
      message = 'RBAC system not initialized. Run seed scripts or restart with AUTO_SEED=true.';
    } else if (!usersExist) {
      message = 'No users exist. Register or set ADMIN_EMAIL/ADMIN_PASSWORD env vars.';
    } else if (guildCount === 0) {
      message = 'System ready. Connect a Discord server to get started.';
    } else {
      message = 'System ready and operational.';
    }

    return {
      ready,
      rbacSeeded,
      usersExist,
      guildCount,
      message,
    };
  }
}
