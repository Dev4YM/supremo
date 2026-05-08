import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor('incidents')
export class IncidentProcessor {
  private readonly logger = new Logger(IncidentProcessor.name);
  private realtimeGateway: any; // Will be injected lazily to avoid circular dependency

  constructor(
    private prisma: PrismaService,
  ) {}

  setRealtimeGateway(gateway: any) {
    this.realtimeGateway = gateway;
  }

  @Process('create_incident')
  async handleIncident(job: Job<any>) {
    this.logger.log(`Processing incident job ${job.id}`);
    
    try {
      const incidentData = job.data;
      
      // Map severity to enum
      const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
        'low': 'LOW',
        'medium': 'MEDIUM',
        'high': 'HIGH',
        'critical': 'CRITICAL',
      };
      const severity = severityMap[incidentData.severity?.toLowerCase()] || 'MEDIUM';

      // Map type to IncidentType enum
      const incidentType = incidentData.type || 'CUSTOM_RULE';

      // Save incident to database
      const incident = await this.prisma.incident.create({
        data: {
          guildId: incidentData.guildId,
          userId: incidentData.userId,
          type: incidentType as any,
          severity: severity,
          confidence: incidentData.confidence || 50, // 0-100
          evidence: incidentData.evidence || {},
          recommendedActions: incidentData.recommendedActions || [],
          status: 'PENDING',
          // Legacy fields
          ruleTriggered: incidentData.type || 'CUSTOM_RULE',
          reasoning: incidentData.reasoning || 'Automated detection',
        },
        include: {
          user: {
            select: {
              discordId: true,
              username: true,
              trustScore: true,
              warningCount: true,
            },
          },
        },
      });
      
      this.logger.log(`Incident created: ${incident.id} for guild ${incidentData.guildId}`);
      
      // Broadcast via WebSocket if gateway is available
      if (this.realtimeGateway) {
        this.realtimeGateway.broadcastIncident(incidentData.guildId, {
          id: incident.id,
          type: incidentData.type,
          severity: incident.severity,
          confidence: incidentData.confidence,
          status: incident.status,
          createdAt: incident.createdAt,
          // Use type assertion - Prisma include types aren't always inferred correctly by TypeScript
          user: (incident as any).user || null,
        });
      }
      
      return { success: true, jobId: job.id, incidentId: incident.id };
    } catch (error) {
      this.logger.error(`Error processing incident job ${job.id}:`, error);
      throw error;
    }
  }
}

