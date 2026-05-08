import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface FeedbackData {
  incidentId: string;
  approved: boolean;
  moderatorId: string;
  moderatorNotes?: string;
  timestamp: Date;
}

interface AccuracyMetrics {
  totalIncidents: number;
  truePositives: number; // Approved incidents
  falsePositives: number; // Rejected incidents
  accuracy: number; // TP / Total
  confidenceByType: Record<string, { avgConfidence: number; accuracy: number }>;
}

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);
  private feedbackCache: FeedbackData[] = [];

  constructor(private prisma: PrismaService) {}

  /**
   * Record moderator feedback on an incident
   */
  async recordFeedback(
    incidentId: string,
    approved: boolean,
    moderatorId: string,
    moderatorNotes?: string,
  ): Promise<void> {
    this.logger.log(
      `Recording feedback for incident ${incidentId}: ${approved ? 'APPROVED' : 'REJECTED'}`,
    );

    const feedback: FeedbackData = {
      incidentId,
      approved,
      moderatorId,
      moderatorNotes,
      timestamp: new Date(),
    };

    // Store in cache for analysis
    this.feedbackCache.push(feedback);

    // Update incident in database
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: approved ? 'RESOLVED' : 'REJECTED',
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        resolution: moderatorNotes,
      },
    });

    // If we have enough feedback, trigger learning
    if (this.feedbackCache.length >= 10) {
      await this.analyzeFeedbackAndAdjust();
    }
  }

  /**
   * Analyze feedback patterns and adjust confidence thresholds
   */
  private async analyzeFeedbackAndAdjust(): Promise<void> {
    this.logger.log('Analyzing feedback patterns...');

    try {
      // Get recent incidents with feedback
      const recentIncidents = await this.prisma.incident.findMany({
        where: {
          reviewedAt: {
            not: null,
          },
        },
        orderBy: {
          reviewedAt: 'desc',
        },
        take: 100,
      });

      if (recentIncidents.length < 10) {
        this.logger.warn('Not enough feedback data for learning');
        return;
      }

      // Calculate accuracy metrics by type
      const metricsByType: Record<
        string,
        { total: number; approved: number; confidences: number[] }
      > = {};

      for (const incident of recentIncidents) {
        const type = incident.type;
        if (!metricsByType[type]) {
          metricsByType[type] = { total: 0, approved: 0, confidences: [] };
        }

        metricsByType[type].total++;
        if (incident.status === 'RESOLVED') {
          metricsByType[type].approved++;
        }
        metricsByType[type].confidences.push(incident.confidence);
      }

      // Analyze and log recommendations
      for (const [type, metrics] of Object.entries(metricsByType)) {
        const accuracy = metrics.approved / metrics.total;
        const avgConfidence =
          metrics.confidences.reduce((a, b) => a + b, 0) / metrics.confidences.length;

        this.logger.log(
          `Type: ${type}, Accuracy: ${(accuracy * 100).toFixed(1)}%, ` +
            `Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%, ` +
            `Count: ${metrics.total}`,
        );

        // Recommendation logic
        if (accuracy < 0.5 && avgConfidence > 70) {
          this.logger.warn(
            `⚠️  Type "${type}" has low accuracy (${(accuracy * 100).toFixed(1)}%) ` +
              `but high confidence. Consider adjusting detection logic.`,
          );
        } else if (accuracy > 0.9 && avgConfidence < 60) {
          this.logger.log(
            `✅ Type "${type}" has high accuracy (${(accuracy * 100).toFixed(1)}%). ` +
              `Consider lowering confidence threshold to catch more cases.`,
          );
        } else if (accuracy < 0.6) {
          this.logger.warn(
            `⚠️  Type "${type}" has low accuracy (${(accuracy * 100).toFixed(1)}%). ` +
              `Review detection rules or increase confidence threshold.`,
          );
        }
      }

      // Store learning metrics in database for tracking
      await this.storeMetrics(metricsByType);

      // Clear feedback cache
      this.feedbackCache = [];
    } catch (error) {
      this.logger.error('Error analyzing feedback:', error);
    }
  }

  /**
   * Get accuracy metrics for dashboard
   */
  async getAccuracyMetrics(
    guildId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AccuracyMetrics> {
    const where: any = { guildId, reviewedAt: { not: null } };

    if (startDate) {
      where.reviewedAt = { ...where.reviewedAt, gte: startDate };
    }
    if (endDate) {
      where.reviewedAt = { ...where.reviewedAt, lte: endDate };
    }

    const incidents = await this.prisma.incident.findMany({
      where,
    });

    const total = incidents.length;
    const approved = incidents.filter((i) => i.status === 'RESOLVED').length;

    // Group by type
    const byType: Record<string, { confidences: number[]; approved: number }> = {};
    for (const incident of incidents) {
      if (!byType[incident.type]) {
        byType[incident.type] = { confidences: [], approved: 0 };
      }
      byType[incident.type].confidences.push(incident.confidence);
      if (incident.status === 'RESOLVED') {
        byType[incident.type].approved++;
      }
    }

    const confidenceByType: Record<string, { avgConfidence: number; accuracy: number }> = {};
    for (const [type, data] of Object.entries(byType)) {
      const avgConfidence =
        data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length;
      const accuracy = data.approved / data.confidences.length;
      confidenceByType[type] = { avgConfidence, accuracy };
    }

    return {
      totalIncidents: total,
      truePositives: approved,
      falsePositives: total - approved,
      accuracy: total > 0 ? approved / total : 0,
      confidenceByType,
    };
  }

  /**
   * Store learning metrics for historical tracking
   */
  private async storeMetrics(
    metricsByType: Record<string, { total: number; approved: number; confidences: number[] }>,
  ): Promise<void> {
    // Store in AuditLog for now (could create dedicated LearningMetrics table)
    const summary = Object.entries(metricsByType).map(([type, metrics]) => ({
      type,
      accuracy: metrics.approved / metrics.total,
      count: metrics.total,
    }));

    this.logger.debug(`Storing learning metrics:`, summary);

    // Could implement dedicated storage here if needed
    // For now, metrics are logged and available via getAccuracyMetrics
  }

  /**
   * Get recommendations for confidence threshold adjustments
   */
  async getThresholdRecommendations(
    guildId: string,
  ): Promise<Record<string, { currentThreshold: number; recommendedThreshold: number; reason: string }>> {
    const metrics = await this.getAccuracyMetrics(guildId);
    const recommendations: Record<string, any> = {};

    for (const [type, data] of Object.entries(metrics.confidenceByType)) {
      const currentThreshold = data.avgConfidence;
      let recommendedThreshold = currentThreshold;
      let reason = 'No adjustment needed';

      if (data.accuracy < 0.5) {
        // Low accuracy - increase threshold to reduce false positives
        recommendedThreshold = Math.min(95, currentThreshold + 15);
        reason = 'Increase threshold to reduce false positives';
      } else if (data.accuracy > 0.9 && currentThreshold < 60) {
        // High accuracy with low threshold - can be more aggressive
        recommendedThreshold = Math.max(40, currentThreshold - 10);
        reason = 'Decrease threshold to catch more violations';
      } else if (data.accuracy > 0.8 && data.accuracy < 0.9) {
        reason = 'Good accuracy, maintain current threshold';
      }

      recommendations[type] = {
        currentThreshold: Math.round(currentThreshold * 100),
        recommendedThreshold: Math.round(recommendedThreshold * 100),
        reason,
      };
    }

    return recommendations;
  }
}

