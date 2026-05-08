import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class ToxicityRule extends BaseRule {
  public name = 'toxicity-detection';
  public description = 'Detects toxic and harmful language';
  public category = RuleCategory.CONTENT_ANALYSIS;
  public priority = 4;

  // Simple toxicity keywords for demonstration
  private toxicKeywords = [
    'hate', 'toxic', 'harassment', 'abuse', 'threat', 'violence',
    'discriminat', 'racist', 'sexist', 'homophobic', 'transphobic'
  ];

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (!this.shouldProcess(signal)) {
      return this.createResult(false, 0, 'Signal not applicable for toxicity detection');
    }

    const content = this.extractTextContent(signal).toLowerCase();
    const userId = this.getUserId(signal);
    
    if (!content || !userId) {
      return this.createResult(false, 0, 'No content or user ID available');
    }

    const toxicityScore = this.analyzeToxicity(content);
    
    if (toxicityScore > 0.6) {
      const severity = this.determineSeverity(toxicityScore);
      const action = this.suggestAction(severity);
      
      return this.createResult(
        true,
        toxicityScore,
        this.generateReason(content, toxicityScore),
        action,
        severity,
        { toxicityScore, detectedKeywords: this.getMatchedKeywords(content) }
      );
    }

    return this.createResult(false, toxicityScore, 'Content does not appear to be toxic');
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.MESSAGE_SENT || signal.type === SignalType.MESSAGE_EDITED;
  }

  private analyzeToxicity(content: string): number {
    const words = content.split(/\s+/);
    let toxicMatches = 0;
    let totalWords = words.length;

    // Check for toxic keywords
    for (const word of words) {
      for (const toxicKeyword of this.toxicKeywords) {
        if (word.includes(toxicKeyword)) {
          toxicMatches++;
          break;
        }
      }
    }

    // Basic scoring based on keyword density
    let score = toxicMatches / Math.max(totalWords, 1);

    // Boost score for excessive caps (might indicate shouting/aggression)
    const capsRatio = this.calculateCapsRatio(content);
    if (capsRatio > 0.7) {
      score += 0.2;
    }

    // Boost score for excessive punctuation (might indicate aggression)
    const punctuationRatio = this.calculatePunctuationRatio(content);
    if (punctuationRatio > 0.3) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private calculateCapsRatio(content: string): number {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    return capsCount / letters.length;
  }

  private calculatePunctuationRatio(content: string): number {
    const punctuation = content.match(/[!?]/g) || [];
    return punctuation.length / Math.max(content.length, 1);
  }

  private getMatchedKeywords(content: string): string[] {
    const matched: string[] = [];
    const words = content.toLowerCase().split(/\s+/);

    for (const word of words) {
      for (const toxicKeyword of this.toxicKeywords) {
        if (word.includes(toxicKeyword) && !matched.includes(toxicKeyword)) {
          matched.push(toxicKeyword);
        }
      }
    }

    return matched;
  }

  private determineSeverity(score: number): SeverityLevel {
    if (score > 0.9) {
      return SeverityLevel.CRITICAL;
    } else if (score > 0.8) {
      return SeverityLevel.HIGH;
    } else if (score > 0.7) {
      return SeverityLevel.MEDIUM;
    } else {
      return SeverityLevel.LOW;
    }
  }

  private suggestAction(severity: SeverityLevel): ActionType {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return ActionType.BAN_USER;
      case SeverityLevel.HIGH:
        return ActionType.MUTE_USER;
      case SeverityLevel.MEDIUM:
        return ActionType.DELETE_MESSAGE;
      case SeverityLevel.LOW:
        return ActionType.FLAG;
      default:
        return ActionType.FLAG;
    }
  }

  private generateReason(content: string, score: number): string {
    const keywords = this.getMatchedKeywords(content);
    
    if (keywords.length > 0) {
      return `Toxic content detected (${Math.round(score * 100)}% confidence): Contains potentially harmful language`;
    }
    
    return `Potentially toxic content detected (${Math.round(score * 100)}% confidence)`;
  }
}