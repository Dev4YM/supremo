import { Module, forwardRef } from '@nestjs/common';
import { ActionRegistryService } from './action-registry.service';
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
import { DiscordModule } from '../../discord/discord.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessagingModule } from '../../messaging/messaging.module';
import { ActionsModule as ModerationActionsModule } from '../../actions/actions.module';
import { IncidentsModule } from '../../incidents/incidents.module';
import { TrustScoreModule } from '../../trust-score/trust-score.module';

@Module({
  imports: [
    forwardRef(() => DiscordModule),
    PrismaModule,
    MessagingModule,
    forwardRef(() => ModerationActionsModule),
    IncidentsModule,
    TrustScoreModule,
  ],
  providers: [
    ActionRegistryService,
    // Messaging actions
    SendMessageAction,
    SendDMAction,
    EditMessageAction,
    DeleteMessageAction,
    // Moderation actions
    AddRoleAction,
    RemoveRoleAction,
    TimeoutAction,
    WarnAction,
    CreateIncidentAction,
    // User actions
    UpdateTrustScoreAction,
    AddUserFlagAction,
    // Utility actions
    WaitAction,
    ConditionAction,
    CustomCodeAction,
    // Server actions
    CreateChannelAction,
    UpdateChannelAction,
    CreateRoleAction,
  ],
  exports: [ActionRegistryService],
})
export class ActionsModule {}

