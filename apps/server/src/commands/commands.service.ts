import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCommand(data: {
    guildId: string;
    name: string;
    description: string;
    category: string;
    action: string;
    actionConfig: any;
    cooldown?: number;
    createdBy?: string;
    isSystem?: boolean;
  }) {
    return this.prisma.botCommand.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        description: data.description,
        category: data.category,
        action: data.action,
        actionConfig: JSON.stringify(data.actionConfig),
        cooldown: data.cooldown,
        createdBy: data.createdBy,
        isSystem: data.isSystem || false,
        enabled: true,
      },
      include: {
        permissions: true,
      },
    });
  }

  async getAll(filters?: { guildId: string; category?: string; isSystem?: boolean; enabled?: boolean }) {
    return this.prisma.botCommand.findMany({
      where: {
        guildId: filters?.guildId,
        category: filters?.category,
        isSystem: filters?.isSystem,
        enabled: filters?.enabled,
      },
      include: {
        permissions: true,
        _count: {
          select: {
            logs: true,
          },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async getOne(id: string, guildId: string) {
    const command = await this.prisma.botCommand.findFirst({
      where: { id, guildId },
      include: {
        permissions: true,
        logs: {
          take: 50,
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return command;
  }

  async getByName(guildId: string, name: string) {
    return this.prisma.botCommand.findUnique({
      where: {
        guildId_name: {
          guildId,
          name,
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async update(id: string, data: {
    description?: string;
    enabled?: boolean;
    actionConfig?: any;
    cooldown?: number;
  }, guildId: string) {
    const command = await this.prisma.botCommand.findFirst({ where: { id, guildId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    if (command.isSystem && data.enabled === false) {
      throw new BadRequestException('Cannot disable system commands');
    }

    return this.prisma.botCommand.update({
      where: { id },
      data: {
        description: data.description,
        enabled: data.enabled,
        actionConfig: data.actionConfig ? JSON.stringify(data.actionConfig) : undefined,
        cooldown: data.cooldown,
      },
      include: {
        permissions: true,
      },
    });
  }

  async delete(id: string, guildId: string) {
    const command = await this.prisma.botCommand.findFirst({ where: { id, guildId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    if (command.isSystem) {
      throw new BadRequestException('Cannot delete system commands');
    }

    return this.prisma.botCommand.delete({ where: { id } });
  }

  // Permission management
  async setPermission(commandId: string, roleId: string, roleName: string, restrictions: any | undefined, guildId: string) {
    // Verify command belongs to guild
    const command = await this.prisma.botCommand.findFirst({ where: { id: commandId, guildId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return this.prisma.commandPermission.upsert({
      where: {
        commandId_roleId: {
          commandId,
          roleId,
        },
      },
      create: {
        commandId,
        roleId,
        roleName,
        canExecute: true,
        restrictions: restrictions ? JSON.stringify(restrictions) : null,
      },
      update: {
        roleName,
        restrictions: restrictions ? JSON.stringify(restrictions) : null,
      },
    });
  }

  async removePermission(commandId: string, roleId: string, guildId: string) {
    // Verify command belongs to guild
    const command = await this.prisma.botCommand.findFirst({ where: { id: commandId, guildId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return this.prisma.commandPermission.delete({
      where: {
        commandId_roleId: {
          commandId,
          roleId,
        },
      },
    });
  }

  async updatePermission(commandId: string, roleId: string, canExecute: boolean, restrictions: any | undefined, guildId: string) {
    // Verify command belongs to guild
    const command = await this.prisma.botCommand.findFirst({ where: { id: commandId, guildId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return this.prisma.commandPermission.update({
      where: {
        commandId_roleId: {
          commandId,
          roleId,
        },
      },
      data: {
        canExecute,
        restrictions: restrictions ? JSON.stringify(restrictions) : undefined,
      },
    });
  }

  async checkPermission(commandId: string, userRoles: string[]): Promise<boolean> {
    const permissions = await this.prisma.commandPermission.findMany({
      where: {
        commandId,
        roleId: { in: userRoles },
      },
    });

    if (permissions.length === 0) {
      return true; // No specific permissions = everyone can use
    }

    return permissions.some((p) => p.canExecute);
  }

  async logExecution(data: {
    commandId: string;
    userId: string;
    userName: string;
    guildId: string;
    channelId: string;
    args?: any;
    success: boolean;
    error?: string;
  }) {
    // Update usage count
    await this.prisma.botCommand.update({
      where: { id: data.commandId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    return this.prisma.commandLog.create({
      data: {
        commandId: data.commandId,
        userId: data.userId,
        userName: data.userName,
        guildId: data.guildId,
        channelId: data.channelId,
        args: data.args ? JSON.stringify(data.args) : null,
        success: data.success,
        error: data.error,
      },
    });
  }

  async getCommandStats(commandId: string, guildId: string) {
    // Verify command belongs to guild
    const command = await this.prisma.botCommand.findFirst({ where: { id: commandId, guildId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    const logs = await this.prisma.commandLog.findMany({
      where: { commandId, guildId },
    });

    const totalExecutions = logs.length;
    const successfulExecutions = logs.filter((l) => l.success).length;
    const failedExecutions = logs.filter((l) => !l.success).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const last24h = logs.filter(
      (l) => new Date(l.executedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: Math.round(successRate * 100) / 100,
      last24h,
    };
  }
}

