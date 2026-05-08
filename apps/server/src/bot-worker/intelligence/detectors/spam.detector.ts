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
export class SpamDetector {
  private readonly logger = new Logger(SpamDetector.name);
  private readonly messageCache = new Map<
    string,
    Array<{ userId: string; timestamp: number; content: string }>
  >();

  constructor(private prisma: PrismaService) {
    // Clean cache every 5 minutes
    setInterval(() => this.cleanCache(), 5 * 60 * 1000);
  }

  async detect(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'message' || !event.data?.content) {
      return { detected: false, confidence: 0, type: 'MESSAGE_SPAM' };
    }

    const guildId = event.guildId;
    const userId = event.userId || '';
    const channelId = event.data.channelId;
    const content = event.data.content;
    const timestamp = Date.now();

    // Check message rate (5 messages in 5 seconds = spam)
    const cacheKey = `${guildId}:${channelId}`;
    const messages = this.messageCache.get(cacheKey) || [];

    // Filter messages from last 5 seconds
    const recentMessages = messages.filter(
      (m) => timestamp - m.timestamp < 5000 && m.userId === userId,
    );

    if (recentMessages.length >= 5) {
      return {
        detected: true,
        confidence: Math.min(95, 60 + recentMessages.length * 5),
        type: 'MESSAGE_SPAM',
        evidence: {
          messageCount: recentMessages.length + 1,
          timeWindow: '5 seconds',
          channelId,
        },
      };
    }

    // Check for repeated content
    const recentWindow = 30_000;
    const similarMessages = messages.filter(
      (m) =>
        m.userId === userId &&
        timestamp - m.timestamp < recentWindow &&
        this.sameMessageContent(content, m.content),
    );

    if (similarMessages.length >= 3) {
      return {
        detected: true,
        confidence: 70,
        type: 'MESSAGE_SPAM',
        evidence: {
          repeatedContent: true,
          similarCount: similarMessages.length,
        },
      };
    }

    // Check for excessive mentions
    const mentionCount = (content.match(/<@!?\d+>/g) || []).length;
    if (mentionCount > 5) {
      return {
        detected: true,
        confidence: 65,
        type: 'MENTION_SPAM',
        evidence: {
          mentionCount,
        },
      };
    }

    // Store message in cache
    messages.push({ userId, timestamp, content: content.trim().slice(0, 500) });
    this.messageCache.set(cacheKey, messages);

    return { detected: false, confidence: 0, type: 'MESSAGE_SPAM' };
  }

  private sameMessageContent(a: string, b: string): boolean {
    const x = a.trim().toLowerCase();
    const y = b.trim().toLowerCase();
    if (!x || !y) return false;
    if (x === y) return true;
    if (x.length >= 20 && y.length >= 20 && x.slice(0, 80) === y.slice(0, 80)) {
      return true;
    }
    return false;
  }

  private cleanCache() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [key, messages] of this.messageCache.entries()) {
      const filtered = messages.filter((m) => now - m.timestamp < maxAge);
      if (filtered.length === 0) {
        this.messageCache.delete(key);
      } else {
        this.messageCache.set(key, filtered);
      }
    }
  }
}

