import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class SuspiciousActivityRule extends BaseRule {
  public name = 'suspicious-activity';
  public description = 'Detects suspicious user behavior patterns';
  public category = RuleCategory.BEHAVIORAL;
  public priority = 3;

  async evaluate(signal: Signal): Promise<RuleResult> {
    // Placeholder implementation
    return this.createResult(false, 0, 'Suspicious activity detection not implemented yet');
  }
}