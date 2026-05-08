import { Injectable, Logger } from '@nestjs/common';
import { DiscordEvent, DetectionResult } from '../../shared/types';
import { SpamDetector } from './detectors/spam.detector';
import { ToxicityDetector } from './detectors/toxicity.detector';
import { LinksDetector } from './detectors/links.detector';
import { RaidDetector } from './detectors/raid.detector';
import { ScoringService } from './scoring.service';
import { QueueService } from '../../shared/queue/queue.service';

interface Check {
  detected: boolean;
  confidence: number;
  type: string;
  evidence?: any;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private spamDetector: SpamDetector,
    private toxicityDetector: ToxicityDetector,
    private linksDetector: LinksDetector,
    private raidDetector: RaidDetector,
    private scoringService: ScoringService,
    private queueService: QueueService,
  ) {}

  async analyzeEvent(event: DiscordEvent): Promise<DetectionResult> {
    this.logger.debug(`Analyzing event: ${event.type} for guild ${event.guildId}`);

    const checks = await Promise.all([
      this.checkJoinSpam(event),
      this.checkMessageSpam(event),
      this.checkToxicity(event),
      this.checkSuspiciousLinks(event),
      this.checkAccountAge(event),
      this.checkRaid(event),
    ]);

    const detections = checks.filter((c) => c.detected);

    if (detections.length === 0) {
      return { safe: true, detected: false };
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(detections);

    // Determine severity
    const severity = this.determineSeverity(detections, confidence);

    // Recommend actions
    const actions = this.recommendActions(severity, confidence, detections);

    // Gather evidence
    const evidence = this.gatherEvidence(detections, event);

    const result: DetectionResult = {
      detected: true,
      type: detections[0].type,
      severity,
      confidence,
      evidence,
      recommendedActions: actions,
    };

    // If high confidence and high severity, create incident immediately
    if (confidence >= 70 && severity === 'critical') {
      await this.createIncident(event, result);
    } else if (confidence >= 50) {
      // Queue for review
      await this.queueService.addIncident(
        {
          guildId: event.guildId,
          userId: event.userId,
          type: result.type,
          severity: result.severity,
          confidence: result.confidence,
          evidence: result.evidence,
          recommendedActions: result.recommendedActions,
        },
        severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
      );
    }

    return result;
  }

  private async checkJoinSpam(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'member_join') {
      return { detected: false, confidence: 0, type: 'JOIN_SPAM' };
    }

    return this.raidDetector.detectJoinSpam(event);
  }

  private async checkMessageSpam(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'message') {
      return { detected: false, confidence: 0, type: 'MESSAGE_SPAM' };
    }

    return this.spamDetector.detect(event);
  }

  private async checkToxicity(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'message' || !event.data?.content) {
      return { detected: false, confidence: 0, type: 'TOXIC_CONTENT' };
    }

    return this.toxicityDetector.detect(event.data.content);
  }

  private async checkSuspiciousLinks(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'message') {
      return { detected: false, confidence: 0, type: 'SUSPICIOUS_LINK' };
    }

    return this.linksDetector.detect(event);
  }

  private async checkAccountAge(event: DiscordEvent): Promise<Check> {
    if (event.type !== 'member_join') {
      return { detected: false, confidence: 0, type: 'NEW_ACCOUNT' };
    }

    const accountCreated = new Date(event.data?.accountCreated);
    if (!accountCreated || isNaN(accountCreated.getTime())) {
      return { detected: false, confidence: 0, type: 'NEW_ACCOUNT' };
    }

    const daysOld = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld < 7) {
      return {
        detected: true,
        confidence: daysOld < 1 ? 80 : daysOld < 3 ? 60 : 40,
        type: 'NEW_ACCOUNT',
        evidence: { accountAge: daysOld },
      };
    }

    return { detected: false, confidence: 0, type: 'NEW_ACCOUNT' };
  }

  private async checkRaid(event: DiscordEvent): Promise<Check> {
    return this.raidDetector.detectRaid(event);
  }

  private calculateConfidence(detections: Check[]): number {
    if (detections.length === 0) return 0;

    // Weighted average of detection confidences
    const weights = detections.map((d) => {
      switch (d.type) {
        case 'RAID_DETECTED':
          return 1.5;
        case 'TOXIC_CONTENT':
          return 1.2;
        case 'MESSAGE_SPAM':
          return 1.0;
        default:
          return 0.8;
      }
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedSum = detections.reduce(
      (sum, d, i) => sum + d.confidence * weights[i],
      0,
    );

    return Math.min(100, Math.round(weightedSum / totalWeight));
  }

  private determineSeverity(
    detections: Check[],
    confidence: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const hasRaid = detections.some((d) => d.type === 'RAID_DETECTED');
    const hasToxic = detections.some((d) => d.type === 'TOXIC_CONTENT');
    const hasSpam = detections.some((d) => d.type === 'MESSAGE_SPAM' || d.type === 'JOIN_SPAM');

    if (hasRaid || (confidence >= 90 && hasToxic)) {
      return 'critical';
    }

    if (confidence >= 75 || (hasToxic && hasSpam)) {
      return 'high';
    }

    if (confidence >= 50 || hasSpam || hasToxic) {
      return 'medium';
    }

    return 'low';
  }

  private recommendActions(
    severity: 'low' | 'medium' | 'high' | 'critical',
    confidence: number,
    detections: Check[],
  ): any[] {
    const actions: any[] = [];

    if (severity === 'critical') {
      actions.push({
        type: 'BAN',
        priority: 'critical',
        reason: 'Automated detection: Critical threat',
      });
    } else if (severity === 'high') {
      if (confidence >= 80) {
        actions.push({
          type: 'TIMEOUT',
          duration: 86400, // 24 hours
          priority: 'high',
          reason: 'Automated detection: High confidence violation',
        });
      } else {
        actions.push({
          type: 'WARN',
          priority: 'high',
          reason: 'Automated detection: Review recommended',
        });
      }
    } else if (severity === 'medium') {
      actions.push({
        type: 'WARN',
        priority: 'medium',
        reason: 'Automated detection: Moderate violation',
      });
    } else {
      actions.push({
        type: 'LOG_ONLY',
        priority: 'low',
        reason: 'Automated detection: Low severity, monitoring',
      });
    }

    return actions;
  }

  private gatherEvidence(detections: Check[], event: DiscordEvent): any {
    return {
      detections: detections.map((d) => ({
        type: d.type,
        confidence: d.confidence,
        evidence: d.evidence,
      })),
      event: {
        type: event.type,
        timestamp: new Date().toISOString(),
        data: event.data,
      },
    };
  }

  private async createIncident(event: DiscordEvent, result: DetectionResult) {
    await this.queueService.addIncident(
      {
        guildId: event.guildId,
        userId: event.userId,
        type: result.type!,
        severity: result.severity!,
        confidence: result.confidence!,
        evidence: result.evidence,
        recommendedActions: result.recommendedActions,
      },
      result.severity === 'critical' ? 'critical' : 'high',
    );
  }
}

