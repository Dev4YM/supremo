import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class ScamDetectionRule extends BaseRule {
  public name = 'scam-detection';
  public description = 'Detects scam and phishing attempts';
  public category = RuleCategory.SECURITY;
  public priority = 5;

  private scamKeywords = [
    'free nitro', 'free discord', 'click here', 'limited time',
    'congratulations', 'winner', 'prize', 'giveaway ended',
    'verify account', 'suspended', 'banned', 'urgent action',
    'bitcoin', 'crypto', 'investment', 'double your money'
  ];

  private suspiciousDomains = [
    'bit.ly', 'tinyurl.com', 'short.link', 'discord-nitro',
    'discrod', 'discordapp', 'stearn', 'steam-community'
  ];

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (!this.shouldProcess(signal)) {
      return this.createResult(false, 0, 'Signal not applicable for scam detection');
    }

    const content = this.extractTextContent(signal).toLowerCase();
    const userId = this.getUserId(signal);
    
    if (!content || !userId) {
      return this.createResult(false, 0, 'No content or user ID available');
    }

    const scamScore = this.analyzeScamIndicators(content, signal);
    
    if (scamScore > 0.6) {
      const severity = this.determineSeverity(scamScore);
      const action = this.suggestAction(severity);
      
      return this.createResult(
        true,
        scamScore,
        this.generateReason(scamScore),
        action,
        severity,
        { 
          scamScore, 
          indicators: this.getScamIndicators(content),
          hasLinks: this.hasLinks(content)
        }
      );
    }

    return this.createResult(false, scamScore, 'Content does not appear to be a scam');
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.MESSAGE_SENT || signal.type === SignalType.MESSAGE_EDITED;
  }

  private analyzeScamIndicators(content: string, signal: Signal): number {
    let score = 0;

    // Check for scam keywords
    score += this.analyzeScamKeywords(content) * 0.4;

    // Check for suspicious links
    score += this.analyzeSuspiciousLinks(content) * 0.5;

    // Check for urgency indicators
    score += this.analyzeUrgencyIndicators(content) * 0.3;

    // Check for fake Discord/Steam links
    score += this.analyzeFakeServiceLinks(content) * 0.6;

    // Check for new account (higher risk)
    if (this.isNewAccount(signal)) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  private analyzeScamKeywords(content: string): number {
    const words = content.split(/\s+/);
    let matches = 0;

    for (const word of words) {
      for (const keyword of this.scamKeywords) {
        if (content.includes(keyword)) {
          matches++;
          break;
        }
      }
    }

    return Math.min(1, matches / Math.max(words.length, 1) * 5);
  }

  private analyzeSuspiciousLinks(content: string): number {
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    let suspiciousCount = 0;

    for (const url of urls) {
      for (const domain of this.suspiciousDomains) {
        if (url.toLowerCase().includes(domain)) {
          suspiciousCount++;
          break;
        }
      }

      // Check for URL shorteners
      if (this.isUrlShortener(url)) {
        suspiciousCount++;
      }

      // Check for suspicious TLDs
      if (this.hasSuspiciousTLD(url)) {
        suspiciousCount++;
      }
    }

    return urls.length > 0 ? suspiciousCount / urls.length : 0;
  }

  private analyzeUrgencyIndicators(content: string): number {
    const urgencyPatterns = [
      /urgent/gi,
      /expires? (today|soon|in \d+ (hour|minute)s?)/gi,
      /act (now|fast|quickly)/gi,
      /limited time/gi,
      /hurry/gi,
      /don't (miss|wait)/gi
    ];

    let matches = 0;
    for (const pattern of urgencyPatterns) {
      if (pattern.test(content)) {
        matches++;
      }
    }

    return Math.min(1, matches / urgencyPatterns.length);
  }

  private analyzeFakeServiceLinks(content: string): number {
    const fakePatterns = [
      /discord[\-\.]?nitro/gi,
      /steam[\-\.]?community/gi,
      /discrod/gi,
      /discordapp[\-\.]?(com|net|org)/gi,
      /stearn/gi
    ];

    let matches = 0;
    for (const pattern of fakePatterns) {
      if (pattern.test(content)) {
        matches++;
      }
    }

    return matches > 0 ? 1 : 0;
  }

  private isUrlShortener(url: string): boolean {
    const shorteners = ['bit.ly', 'tinyurl', 't.co', 'short.link', 'ow.ly'];
    return shorteners.some(shortener => url.includes(shortener));
  }

  private hasSuspiciousTLD(url: string): boolean {
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.click'];
    return suspiciousTLDs.some(tld => url.includes(tld));
  }

  private hasLinks(content: string): boolean {
    return /https?:\/\/[^\s]+/.test(content);
  }

  private isNewAccount(signal: Signal): boolean {
    const discordId = signal.userId || signal.data.user?.id || signal.data.author?.id;
    if (!discordId || !/^\d{17,20}$/.test(discordId)) {
      return false;
    }
    try {
      const createdAt = Number((BigInt(discordId) >> 22n) + 1420070400000n);
      const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      return ageDays < 7;
    } catch {
      return false;
    }
  }

  private getScamIndicators(content: string): string[] {
    const indicators: string[] = [];

    if (this.hasLinks(content)) indicators.push('contains_links');
    if (/urgent|expires?|limited/gi.test(content)) indicators.push('urgency_language');
    if (/free|prize|winner/gi.test(content)) indicators.push('too_good_to_be_true');
    if (/verify|suspended|banned/gi.test(content)) indicators.push('fake_security_alert');

    return indicators;
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
    return `Potential scam detected (${Math.round(score * 100)}% confidence)`;
  }
}