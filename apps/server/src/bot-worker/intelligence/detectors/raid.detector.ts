import { Injectable, Logger } from '@nestjs/common';
import { DiscordEvent } from '../../../shared/types';
import { PrismaService } from '../../../prisma/prisma.service';

interface Check {
  detected: boolean;
  confidence: number;
  type: string;
  evidence?: any;
}

@Injectable()
export class RaidDetector {
  private readonly logger = new Logger(RaidDetector.name);
  private readonly joinCache = new Map<string, Array<{ userId: string; timestamp: number }>>();

  constructor(private prisma: PrismaService) {
    // Clean cache every 10 minutes
    setInterval(() => this.cleanCache(), 10 * 60 * 1000);
  }

  async detectJoinSpam(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'member_join') {
      return { detected: false, confidence: 0, type: 'JOIN_SPAM' };
    }

    const guildId = event.guildId;
    const userId = event.userId || '';
    const timestamp = Date.now();

    const cacheKey = `joins:${guildId}`;
    const joins = this.joinCache.get(cacheKey) || [];

    // Filter joins from last 60 seconds
    const recentJoins = joins.filter((j) => timestamp - j.timestamp < 60000);

    // Check for rapid joins (10+ in 60 seconds = potential raid)
    if (recentJoins.length >= 10) {
      // Check account ages
      const newAccounts = recentJoins.filter((j) => {
        const accountCreated = new Date(event.data?.accountCreated);
        if (!accountCreated || isNaN(accountCreated.getTime())) return false;
        const daysOld = Math.floor(
          (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysOld < 7;
      });

      const confidence = Math.min(
        95,
        50 + recentJoins.length * 3 + newAccounts.length * 5,
      );

      return {
        detected: true,
        confidence,
        type: 'JOIN_SPAM',
        evidence: {
          joinCount: recentJoins.length + 1,
          timeWindow: '60 seconds',
          newAccountCount: newAccounts.length,
        },
      };
    }

    // Store join in cache
    joins.push({ userId, timestamp });
    this.joinCache.set(cacheKey, joins);

    return { detected: false, confidence: 0, type: 'JOIN_SPAM' };
  }

  async detectRaid(event: DiscordEvent): Promise<Check> {
    // Check for coordinated activity patterns
    const joinSpam = await this.detectJoinSpam(event);

    if (joinSpam.detected && joinSpam.confidence >= 80) {
      return {
        detected: true,
        confidence: Math.min(100, joinSpam.confidence + 10),
        type: 'RAID_DETECTED',
        evidence: {
          ...joinSpam.evidence,
          raidType: 'join_spam',
        },
      };
    }

    return { detected: false, confidence: 0, type: 'RAID_DETECTED' };
  }

  private cleanCache() {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes

    for (const [key, joins] of this.joinCache.entries()) {
      const filtered = joins.filter((j) => now - j.timestamp < maxAge);
      if (filtered.length === 0) {
        this.joinCache.delete(key);
      } else {
        this.joinCache.set(key, filtered);
      }
    }
  }
}

