import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowContext } from './interfaces/action.interface';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async findAll(filters?: { guildId: string; enabled?: boolean; type?: string; triggerType?: string }) {
    const where: any = {
      guildId: filters?.guildId,
    };
    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.triggerType) {
      where.triggerType = filters.triggerType;
    }

    return this.prisma.automation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, guildId: string) {
    return this.prisma.automation.findFirst({
      where: { id, guildId },
    });
  }

  async create(data: {
    guildId: string;
    name: string;
    description?: string;
    type: string;
    triggerType: string;
    triggerConfig?: any;
    workflow: any;
    enabled?: boolean;
    priority?: number;
    cooldown?: number;
    createdBy?: string;
  }) {
    return this.prisma.automation.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        description: data.description,
        type: data.type,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig ? JSON.stringify(data.triggerConfig) : null,
        workflow: JSON.stringify(data.workflow),
        enabled: data.enabled !== undefined ? data.enabled : true,
        priority: data.priority || 0,
        cooldown: data.cooldown,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      type?: string;
      triggerType?: string;
      triggerConfig?: any;
      workflow?: any;
      enabled?: boolean;
      priority?: number;
      cooldown?: number;
      updatedBy?: string;
    },
    guildId: string,
  ) {
    // Verify automation belongs to guild first
    const automation = await this.findOne(id, guildId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
    if (data.triggerConfig !== undefined) {
      updateData.triggerConfig = data.triggerConfig ? JSON.stringify(data.triggerConfig) : null;
    }
    if (data.workflow !== undefined) {
      updateData.workflow = JSON.stringify(data.workflow);
    }
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.cooldown !== undefined) updateData.cooldown = data.cooldown;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    return this.prisma.automation.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, guildId: string) {
    // Verify automation belongs to guild
    const automation = await this.findOne(id, guildId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    return this.prisma.automation.delete({
      where: { id },
    });
  }

  async execute(id: string, context?: Partial<WorkflowContext>) {
    // Get automation to include guildId
    const automation = await this.findOne(id, context?.guildId || '');
    if (!automation) {
      throw new Error('Automation not found');
    }

    const fullContext: WorkflowContext = {
      guildId: automation.guildId,
      ...context,
      trigger: {
        type: 'manual',
        timestamp: new Date(),
      },
    } as WorkflowContext;

    const workflow = JSON.parse(automation.workflow);
    return this.workflowEngine.executeWorkflow(workflow, fullContext, id, 'manual');
  }

  async test(workflow: any, context?: Partial<WorkflowContext>) {
    const fullContext: WorkflowContext = {
      ...context,
      guildId: context?.guildId,
      trigger: {
        type: 'test',
        timestamp: new Date(),
      },
    } as WorkflowContext;

    return this.workflowEngine.executeWorkflow(workflow, fullContext, undefined, 'test');
  }
}

