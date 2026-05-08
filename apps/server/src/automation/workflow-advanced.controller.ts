import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowAdvancedService } from './workflow-advanced.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('automation')
@Controller('api/workflow')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class WorkflowAdvancedController {
  constructor(private workflowAdvancedService: WorkflowAdvancedService) {}

  @Post('approvals')
  @RequirePermission('AUTOMATIONS_EDIT')
  async createApproval(
    @CurrentGuild() guildId: string,
    @Body() body: {
      automationId: string;
      stepId: string;
      approverId: string;
      approverType?: 'user' | 'role';
    },
  ) {
    return this.workflowAdvancedService.createApproval(
      guildId,
      body.automationId,
      body.stepId,
      body.approverId,
      body.approverType,
    );
  }

  @Put('approvals/:id/approve')
  @RequirePermission('AUTOMATIONS_EDIT')
  async approveStep(
    @CurrentGuild() guildId: string,
    @Param('id') approvalId: string,
    @CurrentUser() botUserId: string,
    @Body() body: { notes?: string },
  ) {
    return this.workflowAdvancedService.approveStep(guildId, approvalId, botUserId, body.notes);
  }

  @Put('approvals/:id/reject')
  @RequirePermission('AUTOMATIONS_EDIT')
  async rejectStep(
    @CurrentGuild() guildId: string,
    @Param('id') approvalId: string,
    @CurrentUser() botUserId: string,
    @Body() body: { notes?: string },
  ) {
    return this.workflowAdvancedService.rejectStep(guildId, approvalId, botUserId, body.notes);
  }

  @Get('retries')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getRetries(@CurrentGuild() guildId: string) {
    return this.workflowAdvancedService.getRetries(guildId);
  }

  @Post('retries')
  @RequirePermission('AUTOMATIONS_EDIT')
  async createRetry(
    @CurrentGuild() guildId: string,
    @Body() body: {
      automationId: string;
      stepId: string;
      maxRetries?: number;
      retryDelay?: number;
      backoffType?: 'linear' | 'exponential';
    },
  ) {
    return this.workflowAdvancedService.createRetry(
      guildId,
      body.automationId,
      body.stepId,
      {
        maxRetries: body.maxRetries,
        retryDelay: body.retryDelay,
        backoffType: body.backoffType,
      },
    );
  }

  @Get('compensations')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getCompensations(@CurrentGuild() guildId: string) {
    return this.workflowAdvancedService.getCompensations(guildId);
  }

  @Post('compensations')
  @RequirePermission('AUTOMATIONS_EDIT')
  async createCompensation(
    @CurrentGuild() guildId: string,
    @Body() body: {
      automationId: string;
      runId: string;
      originalAction: any;
      compensation: any;
    },
  ) {
    return this.workflowAdvancedService.createCompensation(
      guildId,
      body.automationId,
      body.runId,
      body.originalAction,
      body.compensation,
    );
  }

  @Post('compensations/:id/execute')
  @RequirePermission('AUTOMATIONS_EDIT')
  async executeCompensation(
    @CurrentGuild() guildId: string,
    @Param('id') compensationId: string,
  ) {
    return this.workflowAdvancedService.executeCompensation(guildId, compensationId);
  }

  @Get('integrations')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getIntegrations(@CurrentGuild() guildId: string) {
    return this.workflowAdvancedService.getIntegrations(guildId);
  }

  @Get('approvals')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getApprovals(
    @CurrentGuild() guildId: string,
    @Query('automationId') automationId?: string,
  ) {
    return this.workflowAdvancedService.getApprovals(guildId, automationId);
  }

  @Post('integrations')
  @RequirePermission('AUTOMATIONS_EDIT')
  async createIntegration(
    @CurrentGuild() guildId: string,
    @Body() data: any,
  ) {
    return this.workflowAdvancedService.createIntegration(guildId, data);
  }

  @Put('integrations/:id')
  @RequirePermission('AUTOMATIONS_EDIT')
  async updateIntegration(
    @CurrentGuild() guildId: string,
    @Param('id') integrationId: string,
    @Body() data: any,
  ) {
    return this.workflowAdvancedService.updateIntegration(guildId, integrationId, data);
  }

  @Delete('integrations/:id')
  @RequirePermission('AUTOMATIONS_EDIT')
  async deleteIntegration(
    @CurrentGuild() guildId: string,
    @Param('id') integrationId: string,
  ) {
    return this.workflowAdvancedService.deleteIntegration(guildId, integrationId);
  }

  @Get('webhooks')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getWebhooks(@CurrentGuild() guildId: string) {
    return this.workflowAdvancedService.getWebhooks(guildId);
  }

  @Post('webhooks')
  @RequirePermission('AUTOMATIONS_EDIT')
  async createWebhook(
    @CurrentGuild() guildId: string,
    @Body() data: any,
  ) {
    return this.workflowAdvancedService.createWebhook(guildId, data);
  }

  @Put('webhooks/:id')
  @RequirePermission('AUTOMATIONS_EDIT')
  async updateWebhook(
    @CurrentGuild() guildId: string,
    @Param('id') webhookId: string,
    @Body() data: any,
  ) {
    return this.workflowAdvancedService.updateWebhook(guildId, webhookId, data);
  }

  @Delete('webhooks/:id')
  @RequirePermission('AUTOMATIONS_EDIT')
  async deleteWebhook(
    @CurrentGuild() guildId: string,
    @Param('id') webhookId: string,
  ) {
    return this.workflowAdvancedService.deleteWebhook(guildId, webhookId);
  }

  @Post('webhooks/:id/trigger')
  @RequirePermission('AUTOMATIONS_EDIT')
  async triggerWebhook(
    @CurrentGuild() guildId: string,
    @Param('id') webhookId: string,
    @Body() body: { event: string; payload: any },
  ) {
    return this.workflowAdvancedService.triggerWebhook(
      guildId,
      webhookId,
      body.event,
      body.payload,
    );
  }
}

