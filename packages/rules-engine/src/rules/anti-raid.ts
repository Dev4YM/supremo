import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class AntiRaidRule extends BaseRule {
  public name = 'anti-raid';
  public description = 'Protects against mass join attacks';
  public category = RuleCategory.SECURITY;
  public priority = 7;

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (signal.type !== SignalType.USER_JOINED) {
      return this.createResult(false, 0, 'Not a join event');
    }

    const recentJoins = Number(signal.data.recentJoins ?? signal.data.joinCount ?? 0);
    const threshold = Number(signal.data.joinThreshold ?? 10);
    const windowSeconds = Number(signal.data.windowSeconds ?? 60);

    if (recentJoins < threshold) {
      return this.createResult(false, 0, `Join rate ${recentJoins}/${threshold} within ${windowSeconds}s`);
    }

    const confidence = Math.min(1, recentJoins / Math.max(threshold, 1));
    const severity = confidence > 0.9 ? SeverityLevel.CRITICAL : confidence > 0.7 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM;

    return this.createResult(
      true,
      confidence,
      `Mass join detected: ${recentJoins} joins in ${windowSeconds}s (limit ${threshold})`,
      ActionType.ESCALATE,
      severity,
      { recentJoins, threshold, windowSeconds },
    );
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.USER_JOINED;
  }
}
