import { Module, forwardRef } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowDebuggerService } from './workflow-debugger.service';
import { WorkflowVersioningService } from './workflow-versioning.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowResilienceService } from './workflow-resilience.service';
import { WorkflowCollaborationService } from './workflow-collaboration.service';
import { WorkflowCollaborationGateway } from './workflow-collaboration.gateway';
import { TriggerHandlerService } from './trigger-handler.service';
import { SchemaValidatorService } from './schema-validator.service';
import { PlaceholderService } from './placeholder.service';
import { WorkflowAdvancedService } from './workflow-advanced.service';
import { AutomationController } from './automation.controller';
import { TemplateController } from './template.controller';
import { WorkflowAdvancedController } from './workflow-advanced.controller';
import { ActionsModule } from './actions/actions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, ActionsModule, forwardRef(() => DiscordModule), AuthModule, AuditModule],
  controllers: [AutomationController, TemplateController, WorkflowAdvancedController],
  providers: [
    AutomationService,
    WorkflowEngineService,
    WorkflowDebuggerService,
    WorkflowVersioningService,
    WorkflowTemplateService,
    WorkflowResilienceService,
    WorkflowCollaborationService,
    WorkflowCollaborationGateway,
    TriggerHandlerService,
    SchemaValidatorService,
    PlaceholderService,
    WorkflowAdvancedService,
  ],
  exports: [
    AutomationService,
    WorkflowEngineService,
    WorkflowDebuggerService,
    WorkflowVersioningService,
    WorkflowTemplateService,
    WorkflowResilienceService,
    WorkflowCollaborationService,
    TriggerHandlerService,
    SchemaValidatorService,
    PlaceholderService,
    WorkflowAdvancedService,
  ],
})
export class AutomationModule {}

