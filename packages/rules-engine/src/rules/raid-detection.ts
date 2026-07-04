import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class RaidDetectionRule extends BaseRule {
  public name = 'raid-detection';
  public description = 'Detects coordinated raid attempts';
  public category = RuleCategory.SECURITY;
  public priority = 6;

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (signal.type !== SignalType.USER_JOINED) {
      return this.createResult(false, 0, 'Not a join event');
    }

    const similarNames = Number(signal.data.similarNameCount ?? 0);
    const noAvatarCount = Number(signal.data.noAvatarJoinCount ?? 0);
    const newAccountCount = Number(signal.data.newAccountJoinCount ?? 0);
    const joinBurst = Number(signal.data.joinBurst ?? 0);

    const factors = [
      similarNames >= 3 ? 0.8 : similarNames / 3,
      noAvatarCount >= 5 ? 0.7 : noAvatarCount / 5,
      newAccountCount >= 5 ? 0.9 : newAccountCount / 5,
      joinBurst >= 10 ? 1 : joinBurst / 10,
    ].filter((f) => f > 0);

    const confidence = this.calculateConfidence(factors);
    if (confidence < 0.5) {
      return this.createResult(false, confidence, 'No coordinated raid pattern detected');
    }

    const severity = confidence > 0.85 ? SeverityLevel.CRITICAL : confidence > 0.65 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM;
    return this.createResult(
      true,
      confidence,
      'Coordinated raid pattern detected',
      ActionType.ESCALATE,
      severity,
      { similarNames, noAvatarCount, newAccountCount, joinBurst },
    );
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.USER_JOINED;
  }
}
