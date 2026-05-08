import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { ActionRegistryService } from './actions/action-registry.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowDebuggerService } from './workflow-debugger.service';
import { WorkflowVersioningService } from './workflow-versioning.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlaceholderService } from './placeholder.service';
import { DiscordService } from '../discord/discord.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('automation')
@Controller('api/automations')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class AutomationController {
  constructor(
    private automationService: AutomationService,
    private actionRegistry: ActionRegistryService,
    private workflowEngine: WorkflowEngineService,
    private workflowDebugger: WorkflowDebuggerService,
    private workflowVersioning: WorkflowVersioningService,
    private prisma: PrismaService,
    private placeholderService: PlaceholderService,
    private discordService: DiscordService,
    private auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('AUTOMATIONS_VIEW')
  async findAll(@Query() query: any, @CurrentGuild() guildId: string) {
    return this.automationService.findAll({
      guildId,
      enabled: query.enabled === 'true' ? true : query.enabled === 'false' ? false : undefined,
      type: query.type,
      triggerType: query.triggerType,
    });
  }

  @Get('placeholders')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getPlaceholders(
    @Query('actionType') actionType: string | undefined,
    @Query('triggerType') triggerType: string | undefined,
    @CurrentGuild() guildId: string,
  ) {

    const placeholders = await this.placeholderService.getPlaceholders({
      actionType,
      triggerType,
      guildId,
    });

    return {
      placeholders,
      grouped: this.groupPlaceholdersByCategory(placeholders),
    };
  }

  @Get('actions/list')
  async listActions(@Query('category') category?: string) {
    const actions = category
      ? this.actionRegistry.getActionsByCategory(category)
      : this.actionRegistry.getAllActions();
    
    // Transform IAction to the format expected by frontend
    return actions.map((action) => ({
      type: action.type,
      name: action.name,
      description: action.description,
      icon: action.icon,
      category: action.category,
    }));
  }

  @Get('actions/:type')
  async getAction(@Param('type') type: string) {
    const action = this.actionRegistry.getAction(type);
    if (!action) {
      throw new Error('Action not found');
    }
    return {
      type: action.type,
      name: action.name,
      description: action.description,
      icon: action.icon,
      category: action.category,
      configSchema: action.getConfigSchema(),
    };
  }

  @Post('validate')
  async validateWorkflow(@Body() body: { workflow: any }) {
    const validation = await this.workflowEngine.validateWorkflow(body.workflow);
    return validation;
  }

  @Get(':id')
  @RequirePermission('AUTOMATIONS_VIEW')
  async findOne(@Param('id') id: string, @CurrentGuild() guildId: string) {
    const automation = await this.automationService.findOne(id, guildId);
    if (!automation) {
      throw new Error('Automation not found');
    }
    return automation;
  }

  @Post()
  @RequirePermission('AUTOMATIONS_CREATE')
  async create(
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    // Validate workflow if provided
    if (body.workflow) {
      const validation = await this.workflowEngine.validateWorkflow(body.workflow);
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors?.join('; ')}`);
      }
    }
    const automation = await this.automationService.create({ ...body, guildId, createdBy: botUserId });
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'AUTOMATION_CREATE',
      entityType: 'Automation',
      entityId: automation.id,
      newValue: automation,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return automation;
  }

  @Put(':id')
  @RequirePermission('AUTOMATIONS_EDIT')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    // Validate workflow if provided
    if (body.workflow) {
      const validation = await this.workflowEngine.validateWorkflow(body.workflow);
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors?.join('; ')}`);
      }
    }
    const oldAutomation = await this.automationService.findOne(id, guildId);
    const updated = await this.automationService.update(id, { ...body, updatedBy: botUserId }, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'AUTOMATION_UPDATE',
      entityType: 'Automation',
      entityId: id,
      oldValue: oldAutomation,
      newValue: updated,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return updated;
  }

  @Delete(':id')
  @RequirePermission('AUTOMATIONS_DELETE')
  async delete(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const automation = await this.automationService.findOne(id, guildId);
    await this.automationService.delete(id, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'AUTOMATION_DELETE',
      entityType: 'Automation',
      entityId: id,
      oldValue: automation,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { success: true };
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Body() body: any) {
    return this.automationService.execute(id, body.context);
  }

  @Post(':id/test')
  async test(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @Body() body: any,
  ) {
    const automation = await this.automationService.findOne(id, guildId);
    if (!automation) {
      throw new Error('Automation not found');
    }
    const workflow = JSON.parse(automation.workflow);
    return this.automationService.test(workflow, body.context);
  }

  @Get(':id/runs')
  async getRuns(@Param('id') id: string, @Query() query: any) {
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;

    return this.prisma.automationRun.findMany({
      where: { automationId: id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  @Get(':id/runs/:runId')
  async getRun(@Param('id') id: string, @Param('runId') runId: string) {
    return this.prisma.automationRun.findFirst({
      where: { id: runId, automationId: id },
    });
  }

  // Workflow Debugging Endpoints
  @Post(':id/debug/start')
  async startDebugSession(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @Body() body: { context?: any; breakpoints?: string[] }
  ) {
    const automation = await this.automationService.findOne(id, guildId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    const workflow = JSON.parse(automation.workflow);
    const context = body.context || {
      trigger: { type: 'debug', timestamp: new Date() },
    };

    const sessionId = this.workflowDebugger.startDebugSession(
      workflow,
      context,
      body.breakpoints || []
    );

    return { sessionId };
  }

  @Post('/debug/:sessionId/step')
  async debugStep(@Param('sessionId') sessionId: string) {
    return this.workflowDebugger.executeStep(sessionId);
  }

  @Post('/debug/:sessionId/continue')
  async debugContinue(@Param('sessionId') sessionId: string) {
    return this.workflowDebugger.continueExecution(sessionId);
  }

  @Get('/debug/:sessionId')
  async getDebugSession(@Param('sessionId') sessionId: string) {
    return this.workflowDebugger.getDebugSession(sessionId);
  }

  @Delete('/debug/:sessionId')
  async stopDebugSession(@Param('sessionId') sessionId: string) {
    this.workflowDebugger.stopDebugSession(sessionId);
    this.workflowDebugger.deleteDebugSession(sessionId);
    return { success: true };
  }

  @Post('/debug/:sessionId/breakpoint')
  async addBreakpoint(
    @Param('sessionId') sessionId: string,
    @Body() body: { blockId: string }
  ) {
    this.workflowDebugger.addBreakpoint(sessionId, body.blockId);
    return { success: true };
  }

  @Delete('/debug/:sessionId/breakpoint/:blockId')
  async removeBreakpoint(
    @Param('sessionId') sessionId: string,
    @Param('blockId') blockId: string
  ) {
    this.workflowDebugger.removeBreakpoint(sessionId, blockId);
    return { success: true };
  }

  // Workflow Analytics Endpoints
  @Get(':id/analytics')
  async getWorkflowAnalytics(
    @Param('id') id: string,
    @Query('limit') limit?: string
  ) {
    const analysis = await this.workflowDebugger.analyzeWorkflowPerformance(
      id,
      limit ? parseInt(limit) : 100
    );
    return analysis;
  }

  @Post('validate-detailed')
  async validateWorkflowDetailed(@Body() body: { workflow: any }) {
    return this.workflowDebugger.validateWorkflowDetailed(body.workflow);
  }

  // Workflow Versioning Endpoints
  @Post(':id/versions')
  async createVersion(
    @Param('id') id: string,
    @Body() body: { workflow: any; changelog: string; createdBy: string }
  ) {
    return this.workflowVersioning.createVersion(
      id,
      body.workflow,
      body.changelog,
      body.createdBy
    );
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.workflowVersioning.getVersions(id);
  }

  @Get(':id/versions/:versionId')
  async getVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string
  ) {
    return this.workflowVersioning.getVersion(versionId);
  }

  @Post(':id/versions/:versionId/restore')
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: { restoredBy: string }
  ) {
    await this.workflowVersioning.restoreVersion(id, versionId, body.restoredBy);
    return { success: true };
  }

  @Get(':id/versions/:versionId/export')
  async exportVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string
  ) {
    const exported = await this.workflowVersioning.exportVersion(versionId);
    return { data: exported };
  }

  @Post(':id/versions/import')
  async importVersion(
    @Param('id') id: string,
    @Body() body: { jsonData: string; importedBy: string }
  ) {
    return this.workflowVersioning.importVersion(id, body.jsonData, body.importedBy);
  }

  @Get(':id/versions/statistics')
  async getVersionStatistics(@Param('id') id: string) {
    return this.workflowVersioning.getVersionStatistics(id);
  }

  private groupPlaceholdersByCategory(placeholders: any[]) {
    const grouped: Record<string, any[]> = {};
    placeholders.forEach((placeholder) => {
      if (!grouped[placeholder.category]) {
        grouped[placeholder.category] = [];
      }
      grouped[placeholder.category].push(placeholder);
    });
    return grouped;
  }
}

