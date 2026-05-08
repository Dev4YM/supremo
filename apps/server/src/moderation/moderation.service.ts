import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service';
import { RuleEngineService } from './rule-engine.service';
import { IncidentsService } from '../incidents/incidents.service';
import { TrustScoreService } from '../trust-score/trust-score.service';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: RuleEngineService,
    private readonly incidentsService: IncidentsService,
    private readonly trustScoreService: TrustScoreService,
  ) {}

  async analyzeMessage(message: Message, guildId: string): Promise<void> {
    try {
      if (message.author.bot || !message.guild) return;

      const user = await this.prisma.user.findFirst({
        where: {
          guildId,
          discordId: message.author.id,
        },
      });

      if (!user) {
        this.logger.warn(`User ${message.author.id} not found for moderation analysis`);
        return;
      }

      const violations = await this.ruleEngine.checkMessage(message, user);
      if (violations.length === 0) return;

      for (const violation of violations) {
        await this.incidentsService.createIncident({
          guildId,
          userId: user.id,
          ruleTriggered: violation.rule,
          evidence: [message.id],
          confidenceScore: violation.confidence,
          recommendedAction: violation.recommendedAction,
          reasoning: violation.reasoning,
        });
      }

      if (violations.length > 0) {
        await this.trustScoreService.adjustTrustScore(
          user.id,
          -violations.length * 5,
          `Message violations detected: ${violations.map(v => v.rule).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error analyzing message ${message.id}:`, error);
    }
  }
}

