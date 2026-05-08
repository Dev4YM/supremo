import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class WorkflowAdvancedService {
  private readonly logger = new Logger(WorkflowAdvancedService.name);

  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
  ) {}

  /**
   * Create workflow approval step
   */
  async createApproval(
    guildId: string,
    automationId: string,
    stepId: string,
    approverId: string,
    approverType: 'user' | 'role' = 'user',
  ) {
    // Validate automation belongs to guild
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, guildId },
    });
    if (!automation) {
      throw new Error('Automation not found or does not belong to this guild');
    }

    return this.prisma.workflowApproval.create({
      data: {
        automationId,
        stepId,
        approverId,
        approverType,
        status: 'pending',
      },
    });
  }

  /**
   * Approve workflow step
   */
  async approveStep(guildId: string, approvalId: string, approvedBy: string, notes?: string) {
    // Validate approval belongs to guild
    const approval = await this.prisma.workflowApproval.findUnique({
      where: { id: approvalId },
      include: { automation: true },
    });
    if (!approval || approval.automation.guildId !== guildId) {
      throw new Error('Approval not found or does not belong to this guild');
    }

    return this.prisma.workflowApproval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        notes,
      },
    });
  }

  /**
   * Reject workflow step
   */
  async rejectStep(guildId: string, approvalId: string, rejectedBy: string, notes?: string) {
    // Validate approval belongs to guild
    const approval = await this.prisma.workflowApproval.findUnique({
      where: { id: approvalId },
      include: { automation: true },
    });
    if (!approval || approval.automation.guildId !== guildId) {
      throw new Error('Approval not found or does not belong to this guild');
    }

    return this.prisma.workflowApproval.update({
      where: { id: approvalId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        notes,
      },
    });
  }

  /**
   * Check if step requires approval
   */
  async requiresApproval(automationId: string, stepId: string): Promise<boolean> {
    const approval = await this.prisma.workflowApproval.findFirst({
      where: {
        automationId,
        stepId,
        status: 'pending',
      },
    });

    return !!approval;
  }

  /**
   * Create workflow retry configuration
   */
  async createRetry(
    guildId: string,
    automationId: string,
    stepId: string,
    config: {
      maxRetries?: number;
      retryDelay?: number;
      backoffType?: 'linear' | 'exponential';
    },
  ) {
    // Validate automation belongs to guild
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, guildId },
    });
    if (!automation) {
      throw new Error('Automation not found or does not belong to this guild');
    }

    // Check if exists
    const existing = await this.prisma.workflowRetry.findFirst({
      where: {
        automationId,
        stepId,
      },
    });

    if (existing) {
      return this.prisma.workflowRetry.update({
        where: { id: existing.id },
        data: config,
      });
    }

    return this.prisma.workflowRetry.create({
      data: {
        automationId,
        stepId,
        maxRetries: config.maxRetries || 3,
        retryDelay: config.retryDelay || 1000,
        backoffType: config.backoffType || 'linear',
        enabled: true,
      },
    });
  }

  /**
   * Execute retry logic
   */
  async executeRetry(
    automationId: string,
    stepId: string,
    attempt: number,
    action: () => Promise<any>,
  ): Promise<any> {
    const retryConfig = await this.prisma.workflowRetry.findFirst({
      where: {
        automationId,
        stepId,
        enabled: true,
      },
    });

    if (!retryConfig || attempt > retryConfig.maxRetries) {
      throw new Error(`Max retries exceeded for step ${stepId}`);
    }

    try {
      return await action();
    } catch (error) {
      this.logger.warn(`Step ${stepId} failed, attempt ${attempt}/${retryConfig.maxRetries}`);

      // Calculate delay
      let delay = retryConfig.retryDelay;
      if (retryConfig.backoffType === 'exponential') {
        delay = retryConfig.retryDelay * Math.pow(2, attempt - 1);
      } else {
        delay = retryConfig.retryDelay * attempt;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry
      return this.executeRetry(automationId, stepId, attempt + 1, action);
    }
  }

  /**
   * Create compensation action (undo)
   */
  async createCompensation(
    guildId: string,
    automationId: string,
    runId: string,
    originalAction: any,
    compensation: any,
  ) {
    // Validate automation belongs to guild
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, guildId },
    });
    if (!automation) {
      throw new Error('Automation not found or does not belong to this guild');
    }

    return this.prisma.compensationAction.create({
      data: {
        automationId,
        runId,
        originalAction: JSON.stringify(originalAction),
        compensation: JSON.stringify(compensation),
        status: 'pending',
      },
    });
  }

  /**
   * Execute compensation action
   */
  async executeCompensation(guildId: string, compensationId: string) {
    const compensation = await this.prisma.compensationAction.findUnique({
      where: { id: compensationId },
      include: { automation: true },
    });

    if (!compensation) {
      throw new Error('Compensation action not found');
    }

    if (compensation.automation.guildId !== guildId) {
      throw new Error('Compensation action does not belong to this guild');
    }

    if (compensation.status !== 'pending') {
      throw new Error('Compensation already executed');
    }

    try {
      const compensationAction = JSON.parse(compensation.compensation);
      // Execute compensation logic here
      // This would depend on the action type

      await this.prisma.compensationAction.update({
        where: { id: compensationId },
        data: {
          status: 'executed',
          executedAt: new Date(),
        },
      });

      return compensation;
    } catch (error) {
      await this.prisma.compensationAction.update({
        where: { id: compensationId },
        data: {
          status: 'failed',
        },
      });

      throw error;
    }
  }

  /**
   * Create integration config
   */
  async createIntegration(guildId: string, data: {
    type: string;
    name: string;
    config: any;
  }) {
    return this.prisma.integrationConfig.create({
      data: {
        guildId,
        ...data,
        config: JSON.stringify(data.config),
      },
    });
  }

  /**
   * Create webhook endpoint
   */
  async createWebhook(guildId: string, data: {
    url: string;
    secret?: string;
    events: string[];
    integrationId?: string;
  }) {
    return this.prisma.webhookEndpoint.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(guildId: string, webhookId: string, event: string, payload: any) {
    const webhook = await this.prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.enabled) {
      return;
    }

    if (webhook.guildId !== guildId) {
      throw new Error('Webhook does not belong to this guild');
    }

    if (!webhook.events.includes(event) && !webhook.events.includes('*')) {
      return;
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret && {
            'X-Webhook-Secret': webhook.secret,
          }),
        },
        body: JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error triggering webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Get integrations for guild
   */
  async getIntegrations(guildId: string) {
    return this.prisma.integrationConfig.findMany({
      where: { guildId, enabled: true },
      include: {
        webhooks: true,
      },
    });
  }

  /**
   * Update integration config
   */
  async updateIntegration(guildId: string, integrationId: string, data: any) {
    const integration = await this.prisma.integrationConfig.findFirst({
      where: { id: integrationId, guildId },
    });
    if (!integration) {
      throw new Error('Integration not found or does not belong to this guild');
    }

    return this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: {
        ...data,
        config: data.config ? JSON.stringify(data.config) : integration.config,
      },
    });
  }

  /**
   * Delete integration config
   */
  async deleteIntegration(guildId: string, integrationId: string) {
    const integration = await this.prisma.integrationConfig.findFirst({
      where: { id: integrationId, guildId },
    });
    if (!integration) {
      throw new Error('Integration not found or does not belong to this guild');
    }

    return this.prisma.integrationConfig.delete({
      where: { id: integrationId },
    });
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(guildId: string, webhookId: string, data: any) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, guildId },
    });
    if (!webhook) {
      throw new Error('Webhook not found or does not belong to this guild');
    }

    return this.prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data,
    });
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(guildId: string, webhookId: string) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, guildId },
    });
    if (!webhook) {
      throw new Error('Webhook not found or does not belong to this guild');
    }

    return this.prisma.webhookEndpoint.delete({
      where: { id: webhookId },
    });
  }

  /**
   * Get approvals for automation
   */
  async getApprovals(guildId: string, automationId?: string) {
    const where: any = {};
    if (automationId) {
      // Validate automation belongs to guild
      const automation = await this.prisma.automation.findFirst({
        where: { id: automationId, guildId },
      });
      if (!automation) {
        throw new Error('Automation not found or does not belong to this guild');
      }
      where.automationId = automationId;
    } else {
      // Get all automations for guild and their approvals
      const automations = await this.prisma.automation.findMany({
        where: { guildId },
        select: { id: true },
      });
      where.automationId = { in: automations.map((a) => a.id) };
    }

    return this.prisma.workflowApproval.findMany({
      where,
      include: {
        automation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get retries for automation
   */
  async getRetries(guildId: string) {
    // Get all automations for guild and their retries
    const automations = await this.prisma.automation.findMany({
      where: { guildId },
      select: { id: true },
    });

    return this.prisma.workflowRetry.findMany({
      where: {
        automationId: { in: automations.map((a) => a.id) },
      },
      include: {
        automation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get compensations for automation
   */
  async getCompensations(guildId: string) {
    // Get all automations for guild and their compensations
    const automations = await this.prisma.automation.findMany({
      where: { guildId },
      select: { id: true },
    });

    return this.prisma.compensationAction.findMany({
      where: {
        automationId: { in: automations.map((a) => a.id) },
      },
      include: {
        automation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get webhooks for guild
   */
  async getWebhooks(guildId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

