import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  /** Map dashboard / query-param enums to Prisma `Case.status` (lowercase). */
  private normalizeCaseStatusFilter(status: string): string {
    const key = status.trim().toUpperCase();
    const map: Record<string, string> = {
      OPEN: 'open',
      IN_PROGRESS: 'investigating',
      ASSIGNED: 'open',
      INVESTIGATING: 'investigating',
      RESOLVED: 'resolved',
      CLOSED: 'closed',
      APPEALED: 'appealed',
    };
    return map[key] ?? status.trim().toLowerCase();
  }

  private normalizeCaseTypeFilter(type: string): string {
    const key = type.trim().toUpperCase();
    const map: Record<string, string> = {
      MODERATION: 'moderation',
      APPEAL: 'appeal',
      REPORT: 'report',
      WARNING: 'warning',
      TECHNICAL: 'technical',
      OTHER: 'other',
    };
    return map[key] ?? type.trim().toLowerCase();
  }

  private normalizeCaseSeverity(value: string): string {
    const key = value.trim().toUpperCase();
    const map: Record<string, string> = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    };
    return map[key] ?? value.trim().toLowerCase();
  }

  async findAll(guildId: string, filters?: {
    status?: string;
    type?: string;
    assignedTo?: string;
    userId?: string;
  }) {
    const where: {
      guildId: string;
      status?: string;
      type?: string;
      assignedTo?: string;
      userId?: string;
    } = { guildId };

    if (filters?.status) {
      where.status = this.normalizeCaseStatusFilter(filters.status);
    }
    if (filters?.type) {
      where.type = this.normalizeCaseTypeFilter(filters.type);
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return this.prisma.case.findMany({
      where,
      include: {
        user: true,
        evidenceItems: true,
        notes: true,
        appeals: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(guildId: string, caseId: string) {
    const case_ = await this.prisma.case.findFirst({
      where: { id: caseId, guildId },
      include: {
        user: true,
        evidenceItems: true,
        notes: true,
        appeals: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!case_) {
      throw new NotFoundException('Case not found');
    }

    return case_;
  }

  /**
   * Create a new case. Provide either `userId` (internal User id) or `subjectDiscordId`
   * (Discord snowflake for this guild); the latter will find-or-create a `User` row.
   */
  async create(
    guildId: string,
    data: {
      userId?: string;
      subjectDiscordId?: string;
      subjectUsername?: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      evidence?: string[];
      createdBy: string;
      assignedTo?: string;
    },
  ) {
    let userId = data.userId;
    if (!userId && data.subjectDiscordId) {
      const discordId = data.subjectDiscordId.trim();
      let user = await this.prisma.user.findUnique({
        where: { guildId_discordId: { guildId, discordId } },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            guildId,
            discordId,
            username: (data.subjectUsername || 'unknown').slice(0, 80),
          },
        });
      }
      userId = user.id;
    }

    if (!userId) {
      throw new BadRequestException('Case requires userId or subjectDiscordId');
    }

    const type = this.normalizeCaseTypeFilter(data.type);
    const severity = this.normalizeCaseSeverity(data.severity);

    // Get next case number
    const lastCase = await this.prisma.case.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
    });

    const caseNumber = lastCase ? lastCase.caseNumber + 1 : 1;

    const case_ = await this.prisma.case.create({
      data: {
        guildId,
        caseNumber,
        userId,
        type,
        severity,
        title: data.title,
        description: data.description,
        evidence: data.evidence || [],
        createdBy: data.createdBy,
        assignedTo: data.assignedTo,
        status: 'open',
      },
      include: {
        user: true,
      },
    });

    // Create history entry
    await this.prisma.caseHistory.create({
      data: {
        caseId: case_.id,
        action: 'created',
        performedBy: data.createdBy,
        newValue: JSON.stringify(case_),
      },
    });

    return case_;
  }

  /**
   * Update a case
   */
  async update(
    guildId: string,
    caseId: string,
    data: Partial<any>,
    updatedBy: string,
  ) {
    const oldCase = await this.findOne(guildId, caseId);

    const updatedCase = await this.prisma.case.update({
      where: { id: caseId },
      data,
      include: {
        user: true,
      },
    });

    // Create history entry
    await this.prisma.caseHistory.create({
      data: {
        caseId,
        action: 'updated',
        performedBy: updatedBy,
        oldValue: JSON.stringify(oldCase),
        newValue: JSON.stringify(updatedCase),
      },
    });

    return updatedCase;
  }

  /**
   * Assign case to moderator
   */
  async assign(guildId: string, caseId: string, assignedTo: string, assignedBy: string) {
    return this.update(guildId, caseId, { assignedTo }, assignedBy);
  }

  /**
   * Resolve a case
   */
  async resolve(
    guildId: string,
    caseId: string,
    resolvedBy: string,
    notes?: string,
  ) {
    return this.update(
      guildId,
      caseId,
      {
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date(),
        moderatorNotes: notes,
      },
      resolvedBy,
    );
  }

  /**
   * Close a case
   */
  async close(guildId: string, caseId: string, closedBy: string) {
    return this.update(
      guildId,
      caseId,
      {
        status: 'closed',
        closedAt: new Date(),
      },
      closedBy,
    );
  }

  /**
   * Reopen a case
   */
  async reopen(guildId: string, caseId: string, reopenedBy: string) {
    return this.update(
      guildId,
      caseId,
      {
        status: 'open',
        resolvedBy: null,
        resolvedAt: null,
      },
      reopenedBy,
    );
  }

  /**
   * Add evidence to a case
   */
  async addEvidence(
    guildId: string,
    caseId: string,
    evidence: {
      type: string;
      url: string;
      description?: string;
      uploadedBy: string;
    },
  ) {
    await this.findOne(guildId, caseId); // Verify case exists

    const evidenceItem = await this.prisma.caseEvidence.create({
      data: {
        caseId,
        ...evidence,
      },
    });

    // Update case evidence array
    const case_ = await this.findOne(guildId, caseId);
    await this.prisma.case.update({
      where: { id: caseId },
      data: {
        evidence: [...(case_.evidence || []), evidenceItem.url],
      },
    });

    return evidenceItem;
  }

  /**
   * Add note to a case
   */
  async addNote(
    guildId: string,
    caseId: string,
    note: {
      content: string;
      isInternal: boolean;
      createdBy: string;
    },
  ) {
    await this.findOne(guildId, caseId); // Verify case exists

    return this.prisma.caseNote.create({
      data: {
        caseId,
        ...note,
      },
    });
  }

  /**
   * Create an appeal
   */
  async createAppeal(
    guildId: string,
    caseId: string,
    appeal: {
      userId: string;
      reason: string;
    },
  ) {
    const case_ = await this.findOne(guildId, caseId);

    const appealRecord = await this.prisma.caseAppeal.create({
      data: {
        caseId,
        ...appeal,
        status: 'pending',
      },
    });

    // Update case status
    await this.update(guildId, caseId, { status: 'appealed' }, appeal.userId);

    // Create history entry
    await this.prisma.caseHistory.create({
      data: {
        caseId,
        action: 'appealed',
        performedBy: appeal.userId,
        newValue: JSON.stringify(appealRecord),
      },
    });

    return appealRecord;
  }

  /**
   * Review an appeal
   */
  async reviewAppeal(
    guildId: string,
    caseId: string,
    appealId: string,
    review: {
      status: 'approved' | 'rejected';
      reviewNotes?: string;
      reviewedBy: string;
    },
  ) {
    const appeal = await this.prisma.caseAppeal.findFirst({
      where: { id: appealId, caseId },
    });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    const updatedAppeal = await this.prisma.caseAppeal.update({
      where: { id: appealId },
      data: {
        ...review,
        reviewedAt: new Date(),
      },
    });

    // If approved, update case status
    if (review.status === 'approved') {
      await this.update(guildId, caseId, { status: 'open' }, review.reviewedBy);
    }

    return updatedAppeal;
  }

  /**
   * Export case data
   */
  async exportCase(guildId: string, caseId: string) {
    const case_ = await this.findOne(guildId, caseId);

    return {
      case: case_,
      exportDate: new Date(),
      format: 'json',
    };
  }

  /**
   * Delete expired cases
   */
  async deleteExpired(guildId: string) {
    const expiredCases = await this.prisma.case.findMany({
      where: {
        guildId,
        expiresAt: { lte: new Date() },
        status: { not: 'closed' },
      },
    });

    for (const case_ of expiredCases) {
      await this.prisma.case.update({
        where: { id: case_.id },
        data: { status: 'closed' },
      });
    }

    return { deleted: expiredCases.length };
  }
}

