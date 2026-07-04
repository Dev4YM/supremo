import { BaseRule } from './base-rule';
import { Signal, RuleResult, RuleCategory, ActionType, SeverityLevel, SignalType } from '../types';

export class PermissionEscalationRule extends BaseRule {
  public name = 'permission-escalation';
  public description = 'Detects unauthorized permission changes';
  public category = RuleCategory.SECURITY;
  public priority = 5;

  private dangerousPermissions = [
    'ADMINISTRATOR',
    'MANAGE_GUILD',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'BAN_MEMBERS',
    'KICK_MEMBERS',
    'MENTION_EVERYONE',
  ];

  async evaluate(signal: Signal): Promise<RuleResult> {
    if (signal.type !== SignalType.ROLE_ADDED && signal.type !== SignalType.CUSTOM) {
      return this.createResult(false, 0, 'Not a role change event');
    }

    const addedPermissions: string[] = signal.data.addedPermissions ?? signal.data.permissions ?? [];
    const roleName: string = signal.data.roleName ?? signal.data.role?.name ?? '';
    const actorId = signal.data.changedBy ?? signal.data.executorId;
    const targetUserId = this.getUserId(signal);
    const isSelfChange = actorId && targetUserId && actorId === targetUserId;

    const dangerousAdded = addedPermissions.filter((p) =>
      this.dangerousPermissions.some((d) => p.toUpperCase().includes(d)),
    );

    if (dangerousAdded.length === 0 && !/@everyone|admin|mod/i.test(roleName)) {
      return this.createResult(false, 0, 'No dangerous permission escalation');
    }

    let confidence = Math.min(1, dangerousAdded.length * 0.35 + (/@everyone/i.test(roleName) ? 0.3 : 0));
    if (isSelfChange) confidence = Math.min(1, confidence + 0.4);

    const severity = confidence > 0.8 ? SeverityLevel.CRITICAL : confidence > 0.5 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM;

    return this.createResult(
      true,
      confidence,
      `Permission escalation detected${roleName ? ` on role "${roleName}"` : ''}`,
      ActionType.LOG_INCIDENT,
      severity,
      { dangerousAdded, roleName, isSelfChange },
    );
  }

  protected shouldProcess(signal: Signal): boolean {
    return signal.type === SignalType.ROLE_ADDED || signal.type === SignalType.CUSTOM;
  }
}
