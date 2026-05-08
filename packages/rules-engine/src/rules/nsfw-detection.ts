import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class NSFWDetectionRule extends BaseRule {
  public name = 'nsfw-detection';
  public description = 'Detects NSFW (Not Safe For Work) content';
  public category = RuleCategory.CONTENT_ANALYSIS;
  public priority = 3;

  // NSFW keywords for basic detection
  private nsfwKeywords = [
    'nsfw', 'adult', 'explicit', 'sexual', 'nude', 'naked', 'porn',
    'xxx', 'sex', 'erotic', 'intimate', 'mature'
  ];

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (!this.shouldProcess(signal)) {
      return this.createResult(false, 0, 'Signal not applicable for NSFW detection');
    }

    const content = this.extractTextContent(signal).toLowerCase();
    const userId = this.getUserId(signal);
    
    if (!content || !userId) {
      return this.createResult(false, 0, 'No content or user ID available');
    }

    const nsfwScore = this.analyzeNSFW(content, signal);
    
    if (nsfwScore > 0.5) {
      const severity = this.determineSeverity(nsfwScore);
      const action = this.suggestAction(severity);
      
      return this.createResult(
        true,
        nsfwScore,
        this.generateReason(nsfwScore),
        action,
        severity,
        { nsfwScore, hasAttachments: this.hasAttachments(signal) }
      );
    }

    return this.createResult(false, nsfwScore, 'Content does not appear to be NSFW');
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.MESSAGE_SENT || signal.type === SignalType.MESSAGE_EDITED;
  }

  private analyzeNSFW(content: string, signal: Signal): number {
    let score = 0;

    // Check for NSFW keywords
    const keywordScore = this.analyzeKeywords(content);
    score += keywordScore * 0.6;

    // Check for attachments (images/videos might be NSFW)
    if (this.hasAttachments(signal)) {
      score += 0.3;
    }

    // Check for suspicious links
    const linkScore = this.analyzeSuspiciousLinks(content);
    score += linkScore * 0.4;

    // Check for excessive suggestive language patterns
    const patternScore = this.analyzeSuggestivePatterns(content);
    score += patternScore * 0.3;

    return Math.min(1, score);
  }

  private analyzeKeywords(content: string): number {
    const words = content.split(/\s+/);
    let matches = 0;

    for (const word of words) {
      for (const keyword of this.nsfwKeywords) {
        if (word.includes(keyword)) {
          matches++;
          break;
        }
      }
    }

    return Math.min(1, matches / Math.max(words.length, 1) * 10);
  }

  private hasAttachments(signal: Signal): boolean {
    const message = signal.data.message;
    return message?.attachments?.length > 0 || 
           message?.embeds?.length > 0;
  }

  private analyzeSuspiciousLinks(content: string): number {
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    let suspiciousCount = 0;

    const suspiciousDomains = [
      'onlyfans', 'pornhub', 'xvideos', 'redtube', 'youporn',
      'chaturbate', 'cam4', 'livejasmin'
    ];

    for (const url of urls) {
      for (const domain of suspiciousDomains) {
        if (url.toLowerCase().includes(domain)) {
          suspiciousCount++;
          break;
        }
      }
    }

    return Math.min(1, suspiciousCount / Math.max(urls.length, 1));
  }

  private analyzeSuggestivePatterns(content: string): number {
    const suggestivePatterns = [
      /\b(hot|sexy|horny|naughty)\b/gi,
      /\b(daddy|mommy)\b/gi,
      /[😈🍆🍑💦🔥]+/g,
      /\b(dm me|private message)\b/gi
    ];

    let matches = 0;
    for (const pattern of suggestivePatterns) {
      if (pattern.test(content)) {
        matches++;
      }
    }

    return Math.min(1, matches / suggestivePatterns.length);
  }

  private determineSeverity(score: number): SeverityLevel {
    if (score > 0.9) {
      return SeverityLevel.HIGH;
    } else if (score > 0.7) {
      return SeverityLevel.MEDIUM;
    } else {
      return SeverityLevel.LOW;
    }
  }

  private suggestAction(severity: SeverityLevel): ActionType {
    switch (severity) {
      case SeverityLevel.HIGH:
        return ActionType.DELETE_MESSAGE;
      case SeverityLevel.MEDIUM:
        return ActionType.DELETE_MESSAGE;
      case SeverityLevel.LOW:
        return ActionType.FLAG;
      default:
        return ActionType.FLAG;
    }
  }

  private generateReason(score: number): string {
    return `NSFW content detected (${Math.round(score * 100)}% confidence)`;
  }
}