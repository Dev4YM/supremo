import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class TrustScoreRule extends BaseRule {
  public name = 'trust-score';
  public description = 'Evaluates user trust score';
  public category = RuleCategory.TRUST_SYSTEM;
  public priority = 2;

  async evaluate(signal: Signal): Promise<RuleResult> {
    const trustScore = Number(
      signal.data.trustScore ?? signal.data.user?.trustScore ?? signal.data.userTrustScore ?? 100,
    );
    const maxScore = Number(signal.data.maxTrustScore ?? 100);
    const normalized = maxScore > 100 ? (trustScore / maxScore) * 100 : trustScore;
    const lowThreshold = Number(signal.data.lowTrustThreshold ?? 30);
    const criticalThreshold = Number(signal.data.criticalTrustThreshold ?? 15);

    if (normalized >= lowThreshold) {
      return this.createResult(false, 0, `Trust score ${Math.round(normalized)} is acceptable`);
    }

    const confidence = normalized <= criticalThreshold
      ? 0.9
      : (lowThreshold - normalized) / Math.max(lowThreshold - criticalThreshold, 1);

    const severity = normalized <= criticalThreshold
      ? SeverityLevel.HIGH
      : SeverityLevel.MEDIUM;

    return this.createResult(
      true,
      confidence,
      `Low trust score: ${Math.round(normalized)}/${maxScore}`,
      ActionType.FLAG,
      severity,
      { trustScore: normalized, lowThreshold, criticalThreshold },
    );
  }
}
