import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  constructor(private prisma: PrismaService) {}

  async adjustTrustScore(userId: string, change: number, reason?: string, incidentId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const previousScore = user.trustScore;
    const newScore = Math.max(0, Math.min(100, previousScore + change)); // Clamp between 0-100

    // Update user trust score
    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore: newScore },
    });

    // Record history
    await this.prisma.trustScoreHistory.create({
      data: {
        userId,
        oldScore: previousScore,
        newScore,
        reason: reason || 'Trust score adjustment',
        changedBy: 'system',
      },
    });

    this.logger.log(`Trust score adjusted for user ${user.username}: ${previousScore} -> ${newScore} (${change > 0 ? '+' : ''}${change})`);

    return { previousScore, newScore, change };
  }

  async getTrustScoreHistory(userId: string, limit = 50) {
    return this.prisma.trustScoreHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async recalculateTrustScore(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        incidents: true,
        actions: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Base score
    let score = 100;

    // Deduct for incidents
    score -= user.incidents.length * 5;

    // Deduct for actions
    const actionPenalties: Record<string, number> = {
      warn: -5,
      timeout: -10,
      ban: -50,
      kick: -30,
    };

    for (const action of user.actions) {
      score += actionPenalties[action.actionType] || 0;
    }

    // Bonus for positive activity (messages, time in server)
    const daysSinceJoin = Math.floor(
      (Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    score += Math.min(20, daysSinceJoin * 0.5); // Up to 20 points for longevity

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    const previousScore = user.trustScore;
    const change = score - previousScore;

    if (change !== 0) {
      await this.adjustTrustScore(userId, change, 'Recalculated trust score');
    }

    return { previousScore, newScore: score, change };
  }
}

