import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  guildId?: string;
  botUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          guildId: data.guildId,
          botUserId: data.botUserId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
          newValue: data.newValue ? JSON.stringify(data.newValue) : null,
          ip: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }

  async getGuildLogs(guildId: string, limit = 100, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        botUser: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getUserLogs(botUserId: string, limit = 100, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: { botUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        guild: {
          select: {
            id: true,
            name: true,
            discordGuildId: true,
          },
        },
      },
    });
  }
}

