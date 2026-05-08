import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async findAll(guildId: string, filters?: {
    status?: string;
    type?: string;
    assignedTo?: string;
    userId?: string;
  }) {
    return this.prisma.case.findMany({
      where: {
        guildId,
        ...filters,
      },
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
   * Create a new case
   */
  async create(guildId: string, data: {
    userId: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    evidence?: string[];
    createdBy: string;
    assignedTo?: string;
  }) {
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
        ...data,
        evidence: data.evidence || [],
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

