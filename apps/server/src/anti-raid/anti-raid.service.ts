import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class AntiRaidService {
  private readonly logger = new Logger(AntiRaidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async getConfig(guildId: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found. Please connect the guild first via /api/guilds/:discordGuildId/connect`);
    }

    let config = await this.prisma.antiRaidConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.antiRaidConfig.create({
        data: {
          guildId,
          enabled: true,
          joinRateLimitEnabled: true,
          joinRateLimit: 10,
          joinRateWindow: 60,
          accountAgeGateEnabled: false,
          minAccountAge: 0,
          verificationEnabled: false,
          verificationType: 'none',
          roleChangeAlertEnabled: true,
          auditLogWatchEnabled: true,
        },
      });
    }

    return config;
  }

  /**
   * Update anti-raid configuration
   */
  async updateConfig(guildId: string, data: Partial<any>) {
    await this.getConfig(guildId); // Ensure config exists

    return this.prisma.antiRaidConfig.update({
      where: { guildId },
      data,
    });
  }

  /**
   * Check join rate limit
   */
  async checkJoinRate(guildId: string, discordGuildId: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    windowStart: Date;
  }> {
    const config = await this.getConfig(guildId);

    if (!config.joinRateLimitEnabled || !config.enabled) {
      return { allowed: true, current: 0, limit: 0, windowStart: new Date() };
    }

    const windowStart = new Date(Date.now() - config.joinRateWindow * 1000);

    // Get or create rate limit record
    let rateLimit = await this.prisma.joinRateLimit.findFirst({
      where: {
        guildId,
        windowStart: { gte: windowStart },
      },
      orderBy: { windowStart: 'desc' },
    });

    if (!rateLimit) {
      rateLimit = await this.prisma.joinRateLimit.create({
        data: {
          guildId,
          configId: config.id,
          windowStart: new Date(),
          joinCount: 0,
          threshold: config.joinRateLimit,
        },
      });
    }

    // Check if limit exceeded
    const allowed = rateLimit.joinCount < config.joinRateLimit;

    if (!allowed && !rateLimit.triggered) {
      await this.prisma.joinRateLimit.update({
        where: { id: rateLimit.id },
        data: { triggered: true },
      });

      this.logger.warn(
        `Join rate limit exceeded for guild ${discordGuildId}: ${rateLimit.joinCount}/${config.joinRateLimit}`,
      );
    }

    return {
      allowed,
      current: rateLimit.joinCount,
      limit: config.joinRateLimit,
      windowStart: rateLimit.windowStart,
    };
  }

  /**
   * Increment join count
   */
  async incrementJoinCount(guildId: string) {
    const config = await this.getConfig(guildId);
    const windowStart = new Date(Date.now() - config.joinRateWindow * 1000);

    const rateLimit = await this.prisma.joinRateLimit.findFirst({
      where: {
        guildId,
        windowStart: { gte: windowStart },
      },
      orderBy: { windowStart: 'desc' },
    });

    if (rateLimit) {
      await this.prisma.joinRateLimit.update({
        where: { id: rateLimit.id },
        data: { joinCount: { increment: 1 } },
      });
    } else {
      await this.prisma.joinRateLimit.create({
        data: {
          guildId,
          configId: config.id,
          windowStart: new Date(),
          joinCount: 1,
          threshold: config.joinRateLimit,
        },
      });
    }
  }

  /**
   * Check account age gate
   */
  async checkAccountAge(
    guildId: string,
    discordUserId: string,
  ): Promise<{ allowed: boolean; accountAge: number; required: number }> {
    const config = await this.getConfig(guildId);

    if (!config.accountAgeGateEnabled || !config.enabled) {
      return { allowed: true, accountAge: 0, required: 0 };
    }

    try {
      const user = await this.discordService.client.users.fetch(discordUserId);
      const accountAge = Date.now() - user.createdTimestamp;
      const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);
      const requiredDays = config.minAccountAge;

      return {
        allowed: accountAgeDays >= requiredDays,
        accountAge: Math.floor(accountAgeDays),
        required: requiredDays,
      };
    } catch (error) {
      this.logger.error(`Failed to check account age for user ${discordUserId}:`, error);
      return { allowed: false, accountAge: 0, required: config.minAccountAge };
    }
  }

  /**
   * Create verification flow
   */
  async createVerificationFlow(
    guildId: string,
    userId: string,
    discordUserId: string,
    type: string = 'button',
  ) {
    const config = await this.getConfig(guildId);

    if (!config.verificationEnabled || !config.enabled) {
      return null;
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return this.prisma.verificationFlow.create({
      data: {
        guildId,
        configId: config.id,
        userId,
        discordUserId,
        type: config.verificationType || type,
        token,
        expiresAt,
        status: 'pending',
      },
    });
  }

  /**
   * Complete verification flow
   */
  async completeVerification(token: string) {
    const flow = await this.prisma.verificationFlow.findUnique({
      where: { token },
    });

    if (!flow) {
      throw new NotFoundException('Verification flow not found');
    }

    if (flow.status !== 'pending') {
      throw new Error('Verification flow already completed or expired');
    }

    if (new Date() > flow.expiresAt) {
      await this.prisma.verificationFlow.update({
        where: { id: flow.id },
        data: { status: 'expired' },
      });
      throw new Error('Verification flow expired');
    }

    return this.prisma.verificationFlow.update({
      where: { id: flow.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Enable/disable lockdown mode
   */
  async setLockdown(
    guildId: string,
    enabled: boolean,
    reason: string,
    startedBy: string,
    restrictions?: any,
  ) {
    if (enabled) {
      return this.prisma.lockdownState.upsert({
        where: { guildId },
        create: {
          guildId,
          enabled: true,
          reason,
          startedBy,
          restrictions: restrictions ? JSON.stringify(restrictions) : null,
        },
        update: {
          enabled: true,
          reason,
          startedBy,
          restrictions: restrictions ? JSON.stringify(restrictions) : null,
          startedAt: new Date(),
        },
      });
    } else {
      const lockdown = await this.prisma.lockdownState.findUnique({
        where: { guildId },
      });

      if (lockdown) {
        return this.prisma.lockdownState.update({
          where: { guildId },
          data: {
            enabled: false,
            endedAt: new Date(),
            endedBy: startedBy,
          },
        });
      }

      return lockdown;
    }
  }

  /**
   * Get lockdown state
   */
  async getLockdownState(guildId: string) {
    return this.prisma.lockdownState.findUnique({
      where: { guildId },
    });
  }

  /**
   * Create role change alert
   */
  async createRoleChangeAlert(
    guildId: string,
    userId: string,
    discordUserId: string,
    changeType: string,
    roleId: string,
    roleName: string,
    changedBy?: string,
  ) {
    const config = await this.getConfig(guildId);

    if (!config.roleChangeAlertEnabled || !config.enabled) {
      return null;
    }

    // Determine severity based on change type
    let severity = 'medium';
    if (changeType === 'permission_changed') {
      severity = 'high';
    }

    return this.prisma.roleChangeAlert.create({
      data: {
        guildId,
        configId: config.id,
        userId,
        discordUserId,
        changeType,
        roleId,
        roleName,
        changedBy,
        severity,
      },
    });
  }

  /**
   * Create audit log watch
   */
  async createAuditLogWatch(
    guildId: string,
    actionType: string,
    severity: string = 'medium',
    alertChannelId?: string,
  ) {
    const config = await this.getConfig(guildId);

    return this.prisma.auditLogWatch.create({
      data: {
        guildId,
        configId: config.id,
        actionType,
        severity,
        alertChannelId,
        enabled: true,
      },
    });
  }

  /**
   * Get audit log watches
   */
  async getAuditLogWatches(guildId: string) {
    return this.prisma.auditLogWatch.findMany({
      where: { guildId, enabled: true },
    });
  }

  /**
   * Generate verification token
   */
  private generateToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}

