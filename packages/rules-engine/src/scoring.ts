import { RuleResult, SeverityLevel } from './types';

export class ConfidenceScorer {
  /**
   * Calculate overall confidence score from multiple rule results
   */
  static calculateOverallConfidence(results: RuleResult[]): number {
    if (results.length === 0) return 0;

    const triggeredResults = results.filter(r => r.triggered);
    if (triggeredResults.length === 0) return 0;

    // Weight by severity and combine confidences
    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of triggeredResults) {
      const weight = this.getSeverityWeight(result.severity);
      weightedSum += result.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get weight multiplier based on severity level
   */
  private static getSeverityWeight(severity?: SeverityLevel): number {
    switch (severity) {
      case SeverityLevel.CRITICAL: return 4.0;
      case SeverityLevel.HIGH: return 3.0;
      case SeverityLevel.MEDIUM: return 2.0;
      case SeverityLevel.LOW: return 1.0;
      default: return 1.5; // Default weight
    }
  }

  /**
   * Adjust confidence based on user trust score
   */
  static adjustForTrustScore(confidence: number, trustScore: number): number {
    // Higher trust score reduces confidence in violations
    // Lower trust score increases confidence in violations
    const trustAdjustment = (1 - trustScore) * 0.3; // Max 30% adjustment
    return Math.max(0, Math.min(1, confidence + trustAdjustment));
  }

  /**
   * Apply temporal decay to confidence based on time since last violation
   */
  static applyTemporalDecay(
    confidence: number, 
    lastViolation: Date, 
    decayRate: number = 0.1
  ): number {
    const daysSinceLastViolation = (Date.now() - lastViolation.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-decayRate * daysSinceLastViolation);
    return confidence * decayFactor;
  }

  /**
   * Calculate risk score based on multiple factors
   */
  static calculateRiskScore(factors: {
    confidence: number;
    severity: SeverityLevel;
    userTrustScore: number;
    recentViolations: number;
    accountAge: number; // in days
  }): number {
    const { confidence, severity, userTrustScore, recentViolations, accountAge } = factors;

    // Base risk from confidence and severity
    let risk = confidence * this.getSeverityWeight(severity) / 4.0;

    // Adjust for user trust (inverse relationship)
    risk *= (2 - userTrustScore);

    // Increase risk for recent violations
    risk *= (1 + recentViolations * 0.2);

    // Increase risk for new accounts
    const accountAgeMultiplier = accountAge < 7 ? 1.5 : accountAge < 30 ? 1.2 : 1.0;
    risk *= accountAgeMultiplier;

    return Math.max(0, Math.min(1, risk));
  }
}

export class TrustScorer {
  /**
   * Calculate user trust score based on various factors
   */
  static calculateTrustScore(factors: {
    accountAge: number; // in days
    serverTenure: number; // in days
    messageCount: number;
    violationCount: number;
    positiveInteractions: number;
    roleCount: number;
    verificationLevel: number; // 0-1
  }): number {
    const {
      accountAge,
      serverTenure,
      messageCount,
      violationCount,
      positiveInteractions,
      roleCount,
      verificationLevel
    } = factors;

    // Account age score (0-0.2)
    const ageScore = Math.min(0.2, accountAge / 365 * 0.2);

    // Server tenure score (0-0.15)
    const tenureScore = Math.min(0.15, serverTenure / 180 * 0.15);

    // Activity score (0-0.2)
    const activityScore = Math.min(0.2, Math.log10(messageCount + 1) / 4 * 0.2);

    // Violation penalty (0 to -0.3)
    const violationPenalty = Math.max(-0.3, -violationCount * 0.05);

    // Positive interactions score (0-0.15)
    const interactionScore = Math.min(0.15, positiveInteractions / 100 * 0.15);

    // Role diversity score (0-0.1)
    const roleScore = Math.min(0.1, roleCount / 10 * 0.1);

    // Verification score (0-0.2)
    const verificationScore = verificationLevel * 0.2;

    const totalScore = ageScore + tenureScore + activityScore + violationPenalty + 
                      interactionScore + roleScore + verificationScore;

    return Math.max(0, Math.min(1, totalScore));
  }

  /**
   * Update trust score based on new activity
   */
  static updateTrustScore(
    currentScore: number,
    activity: {
      type: 'positive' | 'negative' | 'neutral';
      impact: number; // 0-1
    }
  ): number {
    const { type, impact } = activity;
    
    let adjustment = 0;
    switch (type) {
      case 'positive':
        adjustment = impact * 0.05; // Max 5% increase
        break;
      case 'negative':
        adjustment = -impact * 0.1; // Max 10% decrease
        break;
      case 'neutral':
        adjustment = 0;
        break;
    }

    return Math.max(0, Math.min(1, currentScore + adjustment));
  }
}

export class ReputationScorer {
  /**
   * Calculate reputation score based on community interactions
   */
  static calculateReputationScore(metrics: {
    helpfulMessages: number;
    thanksReceived: number;
    reportsAgainst: number;
    reportsBy: number;
    moderatorNotes: number;
    communityVotes: number;
  }): number {
    const {
      helpfulMessages,
      thanksReceived,
      reportsAgainst,
      reportsBy,
      moderatorNotes,
      communityVotes
    } = metrics;

    // Positive contributions
    const positiveScore = (helpfulMessages * 0.1 + thanksReceived * 0.2 + communityVotes * 0.05) / 100;

    // Negative factors
    const negativeScore = (reportsAgainst * 0.3 + moderatorNotes * 0.2) / 100;

    // Reporting accuracy (positive if user makes good reports)
    const reportingScore = reportsBy > 0 ? Math.min(0.1, reportsBy * 0.01) : 0;

    const totalScore = positiveScore - negativeScore + reportingScore;
    
    return Math.max(-1, Math.min(1, totalScore));
  }
}