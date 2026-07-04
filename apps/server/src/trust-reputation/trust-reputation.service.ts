import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { RealtimeGateway } from '../api-server/websocket/realtime.gateway';

@Injectable()
export class TrustReputationService {
  private readonly logger = new Logger(TrustReputationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async getConfig(guildId: string) {
    let config = await this.prisma.trustScoreConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.trustScoreConfig.create({
        data: {
          guildId,
          enabled: true,
          baseScore: 100,
          minScore: 0,
          maxScore: 1000,
          decayEnabled: true,
          decayRate: 0.1,
          riskAssessmentEnabled: true,
          probationEnabled: true,
          probationThreshold: 50,
          probationDuration: 7,
        },
      });
    }

    return config;
  }

  /**
   * Update trust score configuration
   */
  async updateConfig(guildId: string, data: Partial<any>) {
    await this.getConfig(guildId); // Ensure config exists

    return this.prisma.trustScoreConfig.update({
      where: { guildId },
      data,
    });
  }

  /**
   * Calculate trust score for a user
   */
  async calculateTrustScore(guildId: string, userId: string): Promise<number> {
    const config = await this.getConfig(guildId);
    const user = await this.prisma.user.findFirst({
      where: { guildId, id: userId },
      include: {
        incidents: true,
        actions: true,
        messages: true,
      },
    });

    if (!user) {
      return config.baseScore;
    }

    let score = config.baseScore;

    // Factor in incidents (negative)
    score -= user.incidents.length * 10;

    // Factor in actions taken (negative)
    score -= user.actions.length * 5;

    // Factor in message count (positive, but diminishing returns)
    score += Math.min(user.messageCount / 10, 50);

    // Factor in warning count (negative)
    score -= user.warningCount * 15;

    // Apply decay if enabled
    if (config.decayEnabled) {
      const daysSinceActivity = (Date.now() - user.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      score -= daysSinceActivity * config.decayRate;
    }

    // Clamp to min/max
    score = Math.max(config.minScore, Math.min(config.maxScore, score));

    // Update user trust score
    const roundedScore = Math.round(score);
    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore: roundedScore },
    });

    this.realtimeGateway?.broadcastTrustScoreUpdate(guildId, userId, roundedScore);

    return roundedScore;
  }

  /**
   * Assess risk for a user
   */
  async assessRisk(guildId: string, userId: string) {
    const config = await this.getConfig(guildId);
    if (!config.riskAssessmentEnabled) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: { guildId, id: userId },
      include: {
        incidents: true,
        actions: true,
      },
    });

    if (!user) {
      return null;
    }

    // Calculate risk factors
    const factors: any = {
      incidentCount: user.incidents.length,
      actionCount: user.actions.length,
      warningCount: user.warningCount,
      trustScore: user.trustScore,
      accountAge: (Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24),
    };

    // Calculate risk score (0.0 - 1.0)
    let riskScore = 0.0;

    // Incident-based risk
    riskScore += Math.min(user.incidents.length * 0.1, 0.4);

    // Action-based risk
    riskScore += Math.min(user.actions.length * 0.05, 0.3);

    // Warning-based risk
    riskScore += Math.min(user.warningCount * 0.1, 0.2);

    // Trust score-based risk (inverse)
    riskScore += (config.maxScore - user.trustScore) / config.maxScore * 0.1;

    // Account age-based risk (new accounts are riskier)
    if (factors.accountAge < 7) {
      riskScore += 0.1;
    }

    riskScore = Math.min(1.0, Math.max(0.0, riskScore));

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 0.7) riskLevel = 'critical';
    else if (riskScore >= 0.5) riskLevel = 'high';
    else if (riskScore >= 0.3) riskLevel = 'medium';

    // Store assessment
    const assessment = await this.prisma.riskAssessment.create({
      data: {
        guildId,
        configId: config.id,
        userId,
        riskScore,
        riskLevel,
        factors: JSON.stringify(factors),
      },
    });

    // Check if probation is needed
    if (config.probationEnabled && user.trustScore < config.probationThreshold) {
      await this.placeOnProbation(guildId, userId, config.id, 'Trust score below threshold');
    }

    return assessment;
  }

  /**
   * Place user on probation
   */
  async placeOnProbation(
    guildId: string,
    userId: string,
    configId: string,
    reason?: string,
  ) {
    const config = await this.getConfig(guildId);
    const existing = await this.prisma.probationRecord.findFirst({
      where: {
        guildId,
        userId,
        status: 'active',
      },
    });

    if (existing) {
      return existing;
    }

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + config.probationDuration);

    return this.prisma.probationRecord.create({
      data: {
        guildId,
        configId,
        userId,
        endsAt,
        reason: reason || 'Automated probation',
        status: 'active',
      },
    });
  }

  /**
   * Remove user from probation
   */
  async removeProbation(
    guildId: string,
    userId: string,
    revokedBy: string,
  ) {
    const probation = await this.prisma.probationRecord.findFirst({
      where: {
        guildId,
        userId,
        status: 'active',
      },
    });

    if (!probation) {
      return null;
    }

    return this.prisma.probationRecord.update({
      where: { id: probation.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
      },
    });
  }

  /**
   * Create channel trust rule
   */
  async createChannelRule(
    guildId: string,
    configId: string,
    channelId: string,
    rule: {
      minTrustScore?: number;
      maxTrustScore?: number;
      restrictions?: any;
    },
  ) {
    return this.prisma.channelTrustRule.upsert({
      where: {
        guildId_channelId: {
          guildId,
          channelId,
        },
      },
      create: {
        guildId,
        configId,
        channelId,
        ...rule,
      },
      update: rule,
    });
  }

  /**
   * Create trust exemption
   */
  async createExemption(
    guildId: string,
    configId: string,
    exemption: {
      type: 'user' | 'role';
      targetId: string;
      reason?: string;
      expiresAt?: Date;
      createdBy: string;
    },
  ) {
    return this.prisma.trustExemption.create({
      data: {
        guildId,
        configId,
        ...exemption,
      },
    });
  }

  /**
   * Check if user is exempt
   */
  async isExempt(guildId: string, userId: string, roleIds: string[]): Promise<boolean> {
    const exemptions = await this.prisma.trustExemption.findMany({
      where: {
        guildId,
        OR: [
          { type: 'user', targetId: userId },
          { type: 'role', targetId: { in: roleIds } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    });

    return exemptions.length > 0;
  }

  /**
   * Get user's trust score and risk assessment
   */
  async getUserTrustInfo(guildId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { guildId, id: userId },
    });

    if (!user) {
      return null;
    }

    const trustScore = await this.calculateTrustScore(guildId, userId);
    const riskAssessment = await this.assessRisk(guildId, userId);
    const probation = await this.prisma.probationRecord.findFirst({
      where: {
        guildId,
        userId,
        status: 'active',
      },
    });

    return {
      user,
      trustScore,
      riskAssessment,
      probation,
    };
  }
}

