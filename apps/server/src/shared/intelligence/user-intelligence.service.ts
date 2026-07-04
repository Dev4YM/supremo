import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface TrustScoreFactors {
  accountAge: number;      // 0-25 points
  serverActivity: number;   // 0-25 points
  cleanRecord: number;      // 0-30 points
  engagement: number;        // 0-15 points
  verifications: number;    // 0-5 points
}

@Injectable()
export class UserIntelligenceService {
  private readonly logger = new Logger(UserIntelligenceService.name);

  constructor(private prisma: PrismaService) {}

  async calculateTrustScore(guildId: string, userId: string): Promise<number> {
    const profile = await this.getUserProfile(guildId, userId);
    
    const factors: TrustScoreFactors = {
      accountAge: this.scoreAccountAge(profile.accountCreated),
      serverActivity: this.scoreActivity(profile.messageCount, profile.serverJoinDate),
      cleanRecord: this.scoreCleanRecord(profile.incidents),
      engagement: this.scoreEngagement(profile.interactions),
      verifications: profile.verified ? 5 : 0,
    };
    
    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    
    // Update database
    await this.updateUserIntelligence(guildId, userId, {
      trustScore: score,
      factors,
      riskLevel: this.determineRiskLevel(score),
      lastUpdated: new Date(),
    });
    
    return score;
  }

  private scoreAccountAge(created: Date): number {
    const days = this.daysBetween(created, new Date());
    if (days < 7) return 0;
    if (days < 30) return 10;
    if (days < 90) return 15;
    if (days < 180) return 20;
    return 25;
  }

  private scoreActivity(messageCount: number, joinDate: Date): number {
    const daysInServer = this.daysBetween(joinDate, new Date());
    if (daysInServer === 0) return 0;
    
    const messagesPerDay = messageCount / daysInServer;
    
    if (messagesPerDay > 10) return 25;
    if (messagesPerDay > 5) return 20;
    if (messagesPerDay > 2) return 15;
    if (messagesPerDay > 0.5) return 10;
    return 5;
  }

  private scoreCleanRecord(incidents: Array<{ createdAt: Date }>): number {
    if (incidents.length === 0) return 30;
    
    const lastIncident = incidents.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
    
    const daysSinceIncident = this.daysBetween(lastIncident.createdAt, new Date());
    
    if (daysSinceIncident > 90) return 25;
    if (daysSinceIncident > 60) return 20;
    if (daysSinceIncident > 30) return 15;
    if (daysSinceIncident > 14) return 10;
    if (daysSinceIncident > 7) return 5;
    return 0;
  }

  private scoreEngagement(interactions: any[]): number {
    // Simplified engagement scoring
    // In production, consider reactions, replies, etc.
    return Math.min(15, interactions.length * 2);
  }

  private determineRiskLevel(score: number): string {
    if (score < 20) return 'CRITICAL';
    if (score < 40) return 'HIGH';
    if (score < 60) return 'MEDIUM';
    if (score < 80) return 'LOW';
    return 'NONE';
  }

  private daysBetween(date1: Date, date2: Date): number {
    return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async getUserProfile(guildId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, guildId },
      include: {
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        messages: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found in guild ${guildId}`);
    }

    const accountCreated = this.discordIdToCreatedAt(user.discordId);
    const interactions = user.messages.map((m) => ({
      type: 'message',
      at: m.createdAt,
    }));

    return {
      accountCreated,
      serverJoinDate: user.joinedAt,
      messageCount: user.messageCount,
      incidents: user.incidents,
      interactions,
      verified: this.isAccountMature(accountCreated),
    };
  }

  private discordIdToCreatedAt(discordId: string): Date {
    try {
      const timestamp = Number((BigInt(discordId) >> 22n) + 1420070400000n);
      return new Date(timestamp);
    } catch {
      return new Date();
    }
  }

  private isAccountMature(created: Date): boolean {
    const days = this.daysBetween(created, new Date());
    return days >= 30;
  }

  private async updateUserIntelligence(
    guildId: string,
    userId: string,
    data: {
      trustScore: number;
      factors: TrustScoreFactors;
      riskLevel: string;
      lastUpdated: Date;
    },
  ) {
    await this.prisma.userIntelligence.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      create: {
        guildId,
        userId,
        trustScore: data.trustScore,
        riskLevel: data.riskLevel as any,
        riskFlags: [],
        accountAge: 0,
        serverJoinAge: 0,
        messageCount: 0,
        incidentCount: 0,
        cleanRecordDays: 0,
        lastActivity: new Date(),
        profile: data.factors as any,
      },
      update: {
        trustScore: data.trustScore,
        riskLevel: data.riskLevel as any,
        profile: data.factors as any,
        updatedAt: data.lastUpdated,
      },
    });
  }
}

