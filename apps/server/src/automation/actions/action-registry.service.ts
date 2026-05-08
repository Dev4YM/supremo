import { Injectable, Logger } from '@nestjs/common';
import { IAction, WorkflowContext, ActionResult } from '../interfaces/action.interface';
import { SendMessageAction } from './messaging/send-message.action';
import { SendDMAction } from './messaging/send-dm.action';
import { EditMessageAction } from './messaging/edit-message.action';
import { DeleteMessageAction } from './messaging/delete-message.action';
import { AddRoleAction } from './moderation/add-role.action';
import { RemoveRoleAction } from './moderation/remove-role.action';
import { TimeoutAction } from './moderation/timeout.action';
import { WarnAction } from './moderation/warn.action';
import { CreateIncidentAction } from './moderation/create-incident.action';
import { UpdateTrustScoreAction } from './user/update-trust-score.action';
import { AddUserFlagAction } from './user/add-user-flag.action';
import { WaitAction } from './utility/wait.action';
import { ConditionAction } from './utility/condition.action';
import { CustomCodeAction } from './utility/custom-code.action';
import { CreateChannelAction } from './server/create-channel.action';
import { UpdateChannelAction } from './server/update-channel.action';
import { CreateRoleAction } from './server/create-role.action';

@Injectable()
export class ActionRegistryService {
  private readonly logger = new Logger(ActionRegistryService.name);
  private actions: Map<string, IAction> = new Map();

  constructor(
    // Messaging actions
    private sendMessageAction: SendMessageAction,
    private sendDMAction: SendDMAction,
    private editMessageAction: EditMessageAction,
    private deleteMessageAction: DeleteMessageAction,
    // Moderation actions
    private addRoleAction: AddRoleAction,
    private removeRoleAction: RemoveRoleAction,
    private timeoutAction: TimeoutAction,
    private warnAction: WarnAction,
    private createIncidentAction: CreateIncidentAction,
    // User actions
    private updateTrustScoreAction: UpdateTrustScoreAction,
    private addUserFlagAction: AddUserFlagAction,
    // Utility actions
    private waitAction: WaitAction,
    private conditionAction: ConditionAction,
    private customCodeAction: CustomCodeAction,
    // Server actions
    private createChannelAction: CreateChannelAction,
    private updateChannelAction: UpdateChannelAction,
    private createRoleAction: CreateRoleAction,
  ) {
    this.registerActions();
  }

  private registerActions() {
    // Register all built-in actions
    const allActions: IAction[] = [
      this.sendMessageAction,
      this.sendDMAction,
      this.editMessageAction,
      this.deleteMessageAction,
      this.addRoleAction,
      this.removeRoleAction,
      this.timeoutAction,
      this.warnAction,
      this.createIncidentAction,
      this.updateTrustScoreAction,
      this.addUserFlagAction,
      this.waitAction,
      this.conditionAction,
      this.customCodeAction,
      this.createChannelAction,
      this.updateChannelAction,
      this.createRoleAction,
    ];

    allActions.forEach((action) => {
      this.actions.set(action.type, action);
      this.logger.log(`Registered action: ${action.type} (${action.name})`);
    });
  }

  getAction(type: string): IAction | undefined {
    return this.actions.get(type);
  }

  getAllActions(): IAction[] {
    return Array.from(this.actions.values());
  }

  getActionsByCategory(category: string): IAction[] {
    return this.getAllActions().filter((action) => action.category === category);
  }

  async executeAction(
    type: string,
    context: WorkflowContext,
    config: any,
  ): Promise<ActionResult> {
    const action = this.getAction(type);
    if (!action) {
      return {
        success: false,
        error: `Action type "${type}" not found`,
      };
    }

    if (!action.validate(config)) {
      return {
        success: false,
        error: `Invalid configuration for action "${type}"`,
      };
    }

    try {
      return await action.execute(context, config);
    } catch (error: any) {
      this.logger.error(`Error executing action ${type}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        metadata: { error: error.toString() },
      };
    }
  }
}

