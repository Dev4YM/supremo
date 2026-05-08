import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { IncidentsService } from '../../../incidents/incidents.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CreateIncidentAction extends BaseAction {
  type = 'create_incident';
  name = 'Create Incident';
  description = 'Create a moderation incident';
  icon = '📋';
  category = 'moderation';

  constructor(
    private incidentsService: IncidentsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const discordId = config.userId || context.user?.discordId;
      const ruleTriggered = config.ruleTriggered || context.automation?.name || 'Automated Rule';
      const confidenceScore = config.confidenceScore || 0.5;
      const recommendedAction = config.recommendedAction || 'note';
      const reasoning = config.reasoning || `Triggered by automation: ${context.automation?.name || 'Unknown'}`;
      const evidence = config.evidence || (context.message?.id ? [context.message.id] : []);

      if (!discordId) {
        return this.failure('User ID is required');
      }

      if (!context.guildId) {
        return this.failure('Guild ID is required');
      }
      // Find user by discordId to get database ID
      const user = await this.prisma.user.findUnique({
        where: {
          guildId_discordId: {
            guildId: context.guildId,
            discordId,
          },
        },
      });

      if (!user) {
        return this.failure('User not found');
      }

      const incident = await this.incidentsService.createIncident({
        guildId: context.guildId!,
        userId: user.id,
        ruleTriggered,
        evidence,
        confidenceScore,
        recommendedAction,
        reasoning,
      });

      return this.success({ incidentId: incident.id, incident });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to create incident', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return true;
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
        ruleTriggered: { type: 'string', description: 'Rule that triggered this incident' },
        confidenceScore: { type: 'number', description: 'Confidence score (0-1)', default: 0.5 },
        recommendedAction: { 
          type: 'string', 
          enum: ['warn', 'timeout', 'note', 'none'],
          default: 'note',
        },
        reasoning: { type: 'string', description: 'Reasoning for the incident' },
        evidence: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of message IDs as evidence',
        },
      },
    };
  }
}

