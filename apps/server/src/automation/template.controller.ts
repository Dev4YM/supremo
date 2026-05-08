import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationService } from './automation.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('automation')
@Controller('api/templates')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class TemplateController {
  constructor(
    private prisma: PrismaService,
    private automationService: AutomationService,
    private auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('AUTOMATIONS_VIEW')
  async findAll(@Query('category') category?: string, @CurrentGuild() guildId?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }
    // Filter by guild if provided
    if (guildId) {
      where.guildId = guildId;
    }
    return this.prisma.automationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  @Get(':key')
  @RequirePermission('AUTOMATIONS_VIEW')
  async findOne(@Param('key') key: string, @CurrentGuild() guildId?: string) {
    const where: any = { key };
    if (guildId) {
      where.guildId = guildId;
    }
    const template = await this.prisma.automationTemplate.findFirst({
      where,
    });
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  @Post(':key/instantiate')
  @RequirePermission('AUTOMATIONS_CREATE')
  async instantiate(
    @Param('key') key: string,
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
  ) {
    const where: any = { key };
    if (guildId) {
      where.guildId = guildId;
    }
    const template = await this.prisma.automationTemplate.findFirst({
      where,
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Parse workflow from template
    const defaultWorkflow = template.workflow ? JSON.parse(template.workflow) : {};
    
    // Get configurable fields schema
    const configurableFields = template.configSchema 
      ? JSON.parse(template.configSchema) 
      : {};

    // Merge configurable fields with body values
    const finalConfig: any = {};
    Object.keys(configurableFields).forEach((field) => {
      finalConfig[field] = body[field] !== undefined ? body[field] : (configurableFields[field].default || '');
    });

    // Replace placeholders in workflow with provided values
    const workflow = this.substituteParameters(
      body.workflow || defaultWorkflow,
      finalConfig,
    );

    // Create automation from template
    const automation = await this.automationService.create({
      name: body.name || `${template.name} - ${new Date().toISOString()}`,
      description: body.description || template.description || '',
      type: body.type || 'trigger_based',
      triggerType: body.triggerType || 'manual',
      triggerConfig: body.triggerConfig ? JSON.parse(body.triggerConfig) : undefined,
      workflow,
      enabled: body.enabled !== undefined ? body.enabled : true,
      priority: body.priority || 0,
      cooldown: body.cooldown,
      createdBy: botUserId,
      guildId,
    });

    // Audit log
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'AUTOMATION_CREATE',
      entityType: 'Automation',
      entityId: automation.id,
      newValue: automation,
    });

    return automation;
  }

  private substituteParameters(obj: any, params: Record<string, any>): any {
    if (typeof obj === 'string') {
      // Replace {paramName} with actual values
      let result = obj;
      Object.keys(params).forEach((key) => {
        const pattern = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(pattern, String(params[key]));
      });
      return result;
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.substituteParameters(item, params));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      Object.keys(obj).forEach((key) => {
        result[key] = this.substituteParameters(obj[key], params);
      });
      return result;
    }
    return obj;
  }
}

