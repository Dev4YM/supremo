import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incident.dto';

/**
 * Service for managing incidents (auto-moderation violations)
 */
@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new incident
   * 
   * @param data - Incident data including guildId
   * @returns Created incident with user information
   */
  async createIncident(data: CreateIncidentDto & { guildId: string }) {
    // Determine severity based on confidence score (0-100)
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const confidence = data.confidenceScore || 0;
    if (confidence >= 80) {
      severity = 'HIGH';
    } else if (confidence >= 50) {
      severity = 'MEDIUM';
    }

    // Map ruleTriggered to IncidentType
    const incidentType = this.mapRuleToIncidentType(data.ruleTriggered);

    return this.prisma.incident.create({
      data: {
        guildId: data.guildId,
        userId: data.userId,
        type: incidentType as any,
        severity: severity,
        confidence: confidence, // Already 0-100 from DTO
        evidence: Array.isArray(data.evidence) ? { messages: data.evidence } : (data.evidence || {}),
        recommendedActions: data.recommendedAction ? [{ type: data.recommendedAction }] : [],
        // Legacy fields
        ruleTriggered: data.ruleTriggered,
        reasoning: data.reasoning,
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
  }

  /**
   * Map rule name to IncidentType enum
   */
  private mapRuleToIncidentType(ruleTriggered: string): string {
    const rule = ruleTriggered?.toUpperCase() || '';
    if (rule.includes('SPAM') || rule.includes('MESSAGE')) return 'MESSAGE_SPAM';
    if (rule.includes('JOIN')) return 'JOIN_SPAM';
    if (rule.includes('MENTION')) return 'MENTION_SPAM';
    if (rule.includes('LINK') || rule.includes('URL')) return 'SUSPICIOUS_LINK';
    if (rule.includes('TOXIC') || rule.includes('PROFANITY')) return 'TOXIC_CONTENT';
    if (rule.includes('RAID')) return 'RAID_DETECTED';
    if (rule.includes('NEW') || rule.includes('ACCOUNT')) return 'NEW_ACCOUNT';
    return 'CUSTOM_RULE';
  }

  /**
   * Get all incidents with optional filtering
   * 
   * @param filters - Filter options including guildId, status, userId, limit, offset
   * @returns List of incidents with user information
   */
  async findAll(filters?: {
    guildId: string;
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      guildId: filters?.guildId,
    };
    
    if (filters?.status) {
      // Convert status to uppercase to match enum (PENDING, REVIEWING, etc.)
      where.status = filters.status.toUpperCase();
    }
    
    if (filters?.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: filters.userId },
      });
      if (user) {
        where.userId = user.id;
      }
    }

    return this.prisma.incident.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  /**
   * Get a single incident by ID
   * 
   * @param id - Incident ID
   * @param guildId - Guild ID for validation
   * @returns Incident with user information
   * @throws NotFoundException if incident not found
   */
  async findOne(id: string, guildId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, guildId },
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

    if (!incident) {
      throw new NotFoundException(`Incident ${id} not found in guild ${guildId}`);
    }

    return incident;
  }

  /**
   * Update an existing incident
   * 
   * @param id - Incident ID
   * @param data - Update data
   * @param guildId - Guild ID for validation
   * @returns Updated incident
   * @throws NotFoundException if incident not found
   */
  async updateIncident(id: string, data: UpdateIncidentDto, guildId: string) {
    // First verify the incident belongs to this guild
    const incident = await this.prisma.incident.findFirst({
      where: { id, guildId },
    });

    if (!incident) {
      throw new NotFoundException(`Incident ${id} not found in guild ${guildId}`);
    }

    // Map status to enum if provided
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };
    
    if (data.status) {
      updateData.status = data.status.toUpperCase() as any;
    }

    return this.prisma.incident.update({
      where: { id },
      data: updateData,
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
  }

  /**
   * Approve an incident and execute recommended actions
   * 
   * @param id - Incident ID
   * @param moderatorId - Moderator user ID
   * @param notes - Optional approval notes
   * @param guildId - Guild ID
   * @returns Updated incident
   * @throws NotFoundException if incident not found
   */
  async approveIncident(id: string, moderatorId: string, notes: string | undefined, guildId: string) {
    this.logger.log(`Approving incident ${id} by moderator ${moderatorId}`);
    
    await this.updateIncident(id, {
      status: 'approved',
      resolvedBy: moderatorId,
      resolvedAt: new Date(),
      moderatorNotes: notes,
    }, guildId);

    return this.findOne(id, guildId);
  }

  /**
   * Reject an incident without taking action
   * 
   * @param id - Incident ID
   * @param moderatorId - Moderator user ID
   * @param notes - Optional rejection notes
   * @param guildId - Guild ID
   * @returns Updated incident
   * @throws NotFoundException if incident not found
   */
  async rejectIncident(id: string, moderatorId: string, notes: string | undefined, guildId: string) {
    this.logger.log(`Rejecting incident ${id} by moderator ${moderatorId}`);
    
    await this.updateIncident(id, {
      status: 'rejected',
      resolvedBy: moderatorId,
      resolvedAt: new Date(),
      moderatorNotes: notes,
    }, guildId);

    return this.findOne(id, guildId);
  }
}

