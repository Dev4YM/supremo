import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class SpamDetectionRule extends BaseRule {
  public name = 'spam-detection';
  public description = 'Detects spam messages and repetitive content';
  public category = RuleCategory.SPAM_DETECTION;
  public priority = 3;

  private recentMessages: Map<string, Array<{content: string, timestamp: number}>> = new Map();
  private readonly MESSAGE_HISTORY_LIMIT = 10;
  private readonly TIME_WINDOW = 60000; // 1 minute

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (!this.shouldProcess(signal)) {
      return this.createResult(false, 0, 'Signal not applicable for spam detection');
    }

    const content = this.extractTextContent(signal);
    const userId = this.getUserId(signal);
    
    if (!content || !userId) {
      return this.createResult(false, 0, 'No content or user ID available');
    }

    const spamFactors = this.analyzeSpamFactors(content, userId, signal.timestamp);
    const confidence = this.calculateSpamConfidence(spamFactors);
    
    if (confidence > 0.6) {
      const severity = this.determineSeverity(confidence, spamFactors);
      const action = this.suggestAction(severity, spamFactors);
      
      return this.createResult(
        true,
        confidence,
        this.generateReason(spamFactors),
        action,
        severity,
        { spamFactors }
      );
    }

    return this.createResult(false, confidence, 'Content does not appear to be spam');
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.MESSAGE_SENT || signal.type === SignalType.MESSAGE_EDITED;
  }

  private analyzeSpamFactors(content: string, userId: string, timestamp: Date): SpamFactors {
    const factors: SpamFactors = {
      repetitiveContent: 0,
      excessiveCaps: 0,
      excessivePunctuation: 0,
      rapidPosting: 0,
      duplicateContent: 0,
      suspiciousPatterns: 0,
      linkSpam: 0
    };

    // Analyze repetitive content
    factors.repetitiveContent = this.analyzeRepetitiveContent(content);
    
    // Analyze excessive caps
    factors.excessiveCaps = this.analyzeExcessiveCaps(content);
    
    // Analyze excessive punctuation
    factors.excessivePunctuation = this.analyzeExcessivePunctuation(content);
    
    // Analyze rapid posting
    factors.rapidPosting = this.analyzeRapidPosting(userId, timestamp);
    
    // Analyze duplicate content
    factors.duplicateContent = this.analyzeDuplicateContent(content, userId);
    
    // Analyze suspicious patterns
    factors.suspiciousPatterns = this.analyzeSuspiciousPatterns(content);
    
    // Analyze link spam
    factors.linkSpam = this.analyzeLinkSpam(content);

    // Update message history
    this.updateMessageHistory(userId, content, timestamp.getTime());

    return factors;
  }

  private analyzeRepetitiveContent(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 2) { // Ignore short words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    let maxRepetition = 0;
    for (const count of wordCounts.values()) {
      if (count > maxRepetition) {
        maxRepetition = count;
      }
    }

    // Score based on repetition ratio
    return Math.min(1, (maxRepetition - 1) / Math.max(1, words.length - 1));
  }

  private analyzeExcessiveCaps(content: string): number {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / letters.length;
    
    // Consider excessive if more than 70% caps and message is longer than 10 chars
    return letters.length > 10 && capsRatio > 0.7 ? Math.min(1, capsRatio) : 0;
  }

  private analyzeExcessivePunctuation(content: string): number {
    const punctuation = content.match(/[!?.,;:]/g) || [];
    const ratio = punctuation.length / Math.max(1, content.length);
    
    // Consider excessive if more than 20% punctuation
    return ratio > 0.2 ? Math.min(1, ratio * 2) : 0;
  }

  private analyzeRapidPosting(userId: string, timestamp: Date): number {
    const userHistory = this.recentMessages.get(userId) || [];
    const recentMessages = userHistory.filter(
      msg => timestamp.getTime() - msg.timestamp < this.TIME_WINDOW
    );

    // Score based on message frequency
    return Math.min(1, recentMessages.length / 5); // 5+ messages in 1 minute = max score
  }

  private analyzeDuplicateContent(content: string, userId: string): number {
    const userHistory = this.recentMessages.get(userId) || [];
    const normalizedContent = content.toLowerCase().trim();
    
    const duplicates = userHistory.filter(msg => 
      msg.content.toLowerCase().trim() === normalizedContent
    );

    return Math.min(1, duplicates.length / 3); // 3+ duplicates = max score
  }

  private analyzeSuspiciousPatterns(content: string): number {
    const patterns = [
      /(.)\1{4,}/g, // Character repeated 5+ times
      /[^\w\s]{3,}/g, // 3+ special characters in a row
      /\b\w*(\w)\1{2,}\w*\b/g, // Words with repeated characters
      /^.{1,3}$/g, // Very short messages
    ];

    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        score += 0.25;
      }
    }

    return Math.min(1, score);
  }

  private analyzeLinkSpam(content: string): number {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlPattern) || [];
    
    // Score based on number of links
    return Math.min(1, urls.length / 3); // 3+ links = max score
  }

  private calculateSpamConfidence(factors: SpamFactors): number {
    const weights = {
      repetitiveContent: 0.2,
      excessiveCaps: 0.15,
      excessivePunctuation: 0.1,
      rapidPosting: 0.25,
      duplicateContent: 0.2,
      suspiciousPatterns: 0.05,
      linkSpam: 0.05
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [factor, value] of Object.entries(factors)) {
      const weight = weights[factor as keyof SpamFactors] || 0;
      weightedSum += value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private determineSeverity(confidence: number, factors: SpamFactors): SeverityLevel {
    if (confidence > 0.9 || factors.rapidPosting > 0.8) {
      return SeverityLevel.HIGH;
    } else if (confidence > 0.7) {
      return SeverityLevel.MEDIUM;
    } else {
      return SeverityLevel.LOW;
    }
  }

  private suggestAction(severity: SeverityLevel, factors: SpamFactors): ActionType {
    if (severity === SeverityLevel.HIGH) {
      return factors.rapidPosting > 0.8 ? ActionType.MUTE_USER : ActionType.DELETE_MESSAGE;
    } else if (severity === SeverityLevel.MEDIUM) {
      return ActionType.DELETE_MESSAGE;
    } else {
      return ActionType.FLAG;
    }
  }

  private generateReason(factors: SpamFactors): string {
    const reasons = [];
    
    if (factors.repetitiveContent > 0.5) reasons.push('repetitive content');
    if (factors.excessiveCaps > 0.5) reasons.push('excessive caps');
    if (factors.rapidPosting > 0.5) reasons.push('rapid posting');
    if (factors.duplicateContent > 0.5) reasons.push('duplicate messages');
    if (factors.linkSpam > 0.5) reasons.push('link spam');
    
    return reasons.length > 0 
      ? `Spam detected: ${reasons.join(', ')}`
      : 'Spam-like patterns detected';
  }

  private updateMessageHistory(userId: string, content: string, timestamp: number): void {
    if (!this.recentMessages.has(userId)) {
      this.recentMessages.set(userId, []);
    }

    const history = this.recentMessages.get(userId)!;
    history.push({ content, timestamp });

    // Keep only recent messages
    const cutoff = timestamp - this.TIME_WINDOW;
    const filtered = history.filter(msg => msg.timestamp > cutoff);
    
    // Limit history size
    if (filtered.length > this.MESSAGE_HISTORY_LIMIT) {
      filtered.splice(0, filtered.length - this.MESSAGE_HISTORY_LIMIT);
    }

    this.recentMessages.set(userId, filtered);
  }
}

interface SpamFactors {
  repetitiveContent: number;
  excessiveCaps: number;
  excessivePunctuation: number;
  rapidPosting: number;
  duplicateContent: number;
  suspiciousPatterns: number;
  linkSpam: number;
}