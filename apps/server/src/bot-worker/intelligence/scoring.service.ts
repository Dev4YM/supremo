import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  /**
   * Calculate confidence score from multiple detection signals
   */
  calculateConfidence(signals: Array<{ type: string; confidence: number }>): number {
    if (signals.length === 0) return 0;

    // Weight different signal types
    const weights: Record<string, number> = {
      RAID_DETECTED: 1.5,
      TOXIC_CONTENT: 1.2,
      MESSAGE_SPAM: 1.0,
      JOIN_SPAM: 1.0,
      SUSPICIOUS_LINK: 0.9,
      NEW_ACCOUNT: 0.7,
      MENTION_SPAM: 1.1,
    };

    const totalWeight = signals.reduce(
      (sum, signal) => sum + (weights[signal.type] || 1.0),
      0,
    );
    const weightedSum = signals.reduce(
      (sum, signal) => sum + signal.confidence * (weights[signal.type] || 1.0),
      0,
    );

    return Math.min(100, Math.round(weightedSum / totalWeight));
  }

  /**
   * Determine severity based on detection type and confidence
   */
  determineSeverity(
    detectionType: string,
    confidence: number,
    context?: any,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Raids or very high confidence toxic content
    if (detectionType === 'RAID_DETECTED' || (detectionType === 'TOXIC_CONTENT' && confidence >= 90)) {
      return 'critical';
    }

    // High: High confidence violations or multiple violations
    if (confidence >= 75 || detectionType === 'TOXIC_CONTENT' || detectionType === 'MENTION_SPAM') {
      return 'high';
    }

    // Medium: Moderate confidence or spam
    if (confidence >= 50 || detectionType === 'MESSAGE_SPAM' || detectionType === 'JOIN_SPAM') {
      return 'medium';
    }

    // Low: Everything else
    return 'low';
  }
}

