import { ModerationRule, RuleResult, Signal, RuleCategory, ActionType, SeverityLevel } from '../types';

export abstract class BaseRule implements ModerationRule {
  public abstract name: string;
  public abstract description: string;
  public abstract category: RuleCategory;
  
  public enabled: boolean = true;
  public priority: number = 1;

  abstract evaluate(signal: Signal): Promise<RuleResult>;

  /**
   * Create a standard rule result
   */
  protected createResult(
    triggered: boolean,
    confidence: number,
    reason: string,
    suggestedAction?: ActionType,
    severity?: SeverityLevel,
    metadata?: Record<string, any>
  ): RuleResult {
    return {
      triggered,
      confidence: Math.max(0, Math.min(1, confidence)),
      reason,
      suggestedAction,
      severity,
      metadata
    };
  }

  /**
   * Check if signal should be processed by this rule
   */
  protected shouldProcess(signal: Signal): boolean {
    // Override in subclasses for specific signal type filtering
    return true;
  }

  /**
   * Extract text content from signal for analysis
   */
  protected extractTextContent(signal: Signal): string {
    const data = signal.data;
    
    if (data.message?.content) {
      return data.message.content;
    }
    
    if (data.content) {
      return data.content;
    }
    
    return '';
  }

  /**
   * Get user ID from signal
   */
  protected getUserId(signal: Signal): string | undefined {
    return signal.userId || signal.data.user?.id || signal.data.author?.id;
  }

  /**
   * Check if user has exempt role
   */
  protected isUserExempt(signal: Signal, exemptRoles: string[]): boolean {
    const userRoles = signal.data.user?.roles || signal.data.author?.roles || [];
    return exemptRoles.some(role => userRoles.includes(role));
  }

  /**
   * Check if channel is exempt
   */
  protected isChannelExempt(signal: Signal, exemptChannels: string[]): boolean {
    return signal.channelId ? exemptChannels.includes(signal.channelId) : false;
  }

  /**
   * Calculate confidence based on multiple factors
   */
  protected calculateConfidence(factors: number[]): number {
    if (factors.length === 0) return 0;
    
    // Use weighted average with higher weights for higher values
    const weights = factors.map(f => f * f); // Square for emphasis
    const weightedSum = factors.reduce((sum, factor, i) => sum + factor * weights[i], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Normalize confidence score
   */
  protected normalizeConfidence(rawScore: number, maxScore: number): number {
    return Math.max(0, Math.min(1, rawScore / maxScore));
  }
}