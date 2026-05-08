import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

export interface Violation {
  rule: string;
  confidence: number;
  recommendedAction: 'warn' | 'timeout' | 'note' | 'none';
  reasoning: string;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(private prisma: PrismaService) {}

  async checkMessage(message: Message, user: User): Promise<Violation[]> {
    const violations: Violation[] = [];

    // Rule 1: Spam detection (repeated messages)
    const spamViolation = await this.checkSpam(message, user);
    if (spamViolation) violations.push(spamViolation);

    // Rule 2: Profanity detection (basic)
    const profanityViolation = await this.checkProfanity(message);
    if (profanityViolation) violations.push(profanityViolation);

    // Rule 3: Excessive mentions
    const mentionViolation = await this.checkExcessiveMentions(message);
    if (mentionViolation) violations.push(mentionViolation);

    // Rule 4: Trust score threshold
    const trustViolation = await this.checkTrustScore(user);
    if (trustViolation) violations.push(trustViolation);

    return violations;
  }

  private async checkSpam(message: Message, user: User): Promise<Violation | null> {
    // Check last 10 messages from this user in the same channel
    const recentMessages = await this.prisma.message.findMany({
      where: {
        userId: user.id,
        channelId: message.channel.id,
        createdAt: {
          gte: new Date(Date.now() - 60000), // Last minute
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Check for duplicate content
    const duplicateCount = recentMessages.filter(
      (msg) => msg.content === message.content && msg.content.length > 10,
    ).length;

    if (duplicateCount >= 3) {
      return {
        rule: 'spam_duplicate',
        confidence: 0.9,
        recommendedAction: 'warn',
        reasoning: `User sent the same message ${duplicateCount + 1} times in quick succession.`,
      };
    }

    // Check for rapid message sending
    if (recentMessages.length >= 8) {
      return {
        rule: 'spam_rapid',
        confidence: 0.7,
        recommendedAction: 'warn',
        reasoning: `User sent ${recentMessages.length + 1} messages in under a minute.`,
      };
    }

    return null;
  }

  private async checkProfanity(message: Message): Promise<Violation | null> {
    // Basic profanity detection (can be enhanced with ML/AI later)
    const profanityWords = [
      // Add your profanity list here or load from config
    ];

    const lowerContent = message.content.toLowerCase();
    const foundWords = profanityWords.filter((word) => lowerContent.includes(word));

    if (foundWords.length > 0) {
      return {
        rule: 'profanity',
        confidence: 0.6,
        recommendedAction: 'note', // Start with note, escalate if repeated
        reasoning: `Message contains potentially inappropriate language.`,
      };
    }

    return null;
  }

  private async checkExcessiveMentions(message: Message): Promise<Violation | null> {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    
    if (mentionCount > 5) {
      return {
        rule: 'excessive_mentions',
        confidence: 0.8,
        recommendedAction: 'warn',
        reasoning: `Message contains ${mentionCount} mentions, which may be spam.`,
      };
    }

    return null;
  }

  private async checkTrustScore(user: User): Promise<Violation | null> {
    // If trust score is very low, flag for review
    if (user.trustScore < 30) {
      return {
        rule: 'low_trust_score',
        confidence: 0.5,
        recommendedAction: 'note',
        reasoning: `User has low trust score (${user.trustScore}). Messages should be reviewed.`,
      };
    }

    return null;
  }
}

