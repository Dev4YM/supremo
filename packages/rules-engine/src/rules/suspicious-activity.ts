import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class SuspiciousActivityRule extends BaseRule {
  public name = 'suspicious-activity';
  public description = 'Detects suspicious user behavior patterns';
  public category = RuleCategory.BEHAVIORAL;
  public priority = 3;

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (!this.shouldProcess(signal)) {
      return this.createResult(false, 0, 'Signal not applicable');
    }

    const content = this.extractTextContent(signal);
    const messageCount = Number(signal.data.messageCount ?? 0);
    const accountAgeDays = this.getAccountAgeDays(signal);
    const rapidMessages = Number(signal.data.messagesInWindow ?? 0);
    const windowSeconds = Number(signal.data.windowSeconds ?? 10);

    let score = 0;
    const indicators: string[] = [];

    if (accountAgeDays < 7 && content.length > 0) {
      score += 0.3;
      indicators.push('new_account_messaging');
    }

    if (rapidMessages >= 5 && windowSeconds <= 30) {
      score += 0.5;
      indicators.push('rapid_messaging');
    }

    if (messageCount === 0 && content.length > 50) {
      score += 0.2;
      indicators.push('first_message_long');
    }

    if (/(discord\.gift|nitro|free\s+money|@everyone)/i.test(content)) {
      score += 0.4;
      indicators.push('suspicious_content');
    }

    if (score < 0.4) {
      return this.createResult(false, score, 'No suspicious activity detected');
    }

    return this.createResult(
      true,
      Math.min(1, score),
      `Suspicious activity: ${indicators.join(', ')}`,
      ActionType.FLAG,
      score > 0.7 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM,
      { indicators, accountAgeDays, rapidMessages },
    );
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.MESSAGE_SENT || signal.type === SignalType.MESSAGE_EDITED;
  }

  private getAccountAgeDays(signal: Signal): number {
    const created = signal.data.accountCreated ?? signal.data.user?.createdAt;
    if (!created) return 365;
    const createdAt = created instanceof Date ? created : new Date(created);
    return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}
