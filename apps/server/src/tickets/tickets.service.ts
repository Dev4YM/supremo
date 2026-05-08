import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async findAll(guildId: string, filters?: {
    status?: string;
    categoryId?: string;
    assignedTo?: string;
    userId?: string;
  }) {
    return this.prisma.ticket.findMany({
      where: {
        guildId,
        ...filters,
      },
      include: {
        category: true,
        sla: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(guildId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, guildId },
      include: {
        category: true,
        sla: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        transcripts: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async create(guildId: string, data: {
    userId: string;
    discordUserId: string;
    categoryId?: string;
    title: string;
    priority?: string;
  }) {
    const lastTicket = await this.prisma.ticket.findFirst({
      where: { guildId },
      orderBy: { ticketNumber: 'desc' },
    });
    const ticketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

    let category = null;
    let sla = null;
    if (data.categoryId) {
      category = await this.prisma.ticketCategory.findFirst({
        where: { id: data.categoryId, guildId },
        include: { sla: true },
      });
      sla = category?.sla || null;
    }

    let slaDeadline: Date | null = null;
    if (sla) {
      slaDeadline = new Date();
      slaDeadline.setMinutes(slaDeadline.getMinutes() + sla.responseTime);
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        guildId,
        ticketNumber,
        categoryId: data.categoryId,
        userId: data.userId,
        discordUserId: data.discordUserId,
        title: data.title,
        priority: data.priority || 'medium',
        status: 'open',
        slaId: sla?.id,
        slaDeadline,
        assignedTo: category?.autoAssignTo || null,
      },
      include: {
        category: true,
        sla: true,
      },
    });

    await this.createTicketChannel(guildId, ticket);

    return ticket;
  }

  private async createTicketChannel(guildId: string, ticket: any) {
    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    const category = ticket.category;
    if (!category || !category.channelId) return;

    try {
      const parentChannel = await this.discordService.getChannel(category.channelId);
      if (!parentChannel || !parentChannel.isTextBased()) return;

      const thread = await parentChannel.threads.create({
        name: `ticket-${ticket.ticketNumber}: ${ticket.title}`,
        autoArchiveDuration: 1440,
      });

      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          channelId: thread.id,
          threadId: thread.id,
        },
      });

      await thread.send(
        `**Ticket #${ticket.ticketNumber}**\n` +
        `Created by: <@${ticket.discordUserId}>\n` +
        `Priority: ${ticket.priority}\n` +
        `Status: ${ticket.status}\n\n` +
        `Please describe your issue below.`,
      );
    } catch (error) {
      this.logger.error(`Error creating ticket channel: ${error}`);
    }
  }

  async addMessage(
    guildId: string,
    ticketId: string,
    message: {
      messageId: string;
      authorId: string;
      authorType: 'user' | 'moderator' | 'system';
      content: string;
      attachments?: string[];
      isInternal?: boolean;
    },
  ) {
    await this.findOne(guildId, ticketId);

    return this.prisma.ticketMessage.create({
      data: {
        ticketId,
        ...message,
        attachments: message.attachments || [],
      },
    });
  }

  async updateStatus(
    guildId: string,
    ticketId: string,
    status: string,
    updatedBy: string,
  ) {
    const updateData: any = { status };

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    } else if (status === 'closed') {
      updateData.closedAt = new Date();
    }

    return this.prisma.ticket.update({
      where: { id: ticketId, guildId },
      data: updateData,
    });
  }

  async assign(guildId: string, ticketId: string, assignedTo: string) {
    return this.prisma.ticket.update({
      where: { id: ticketId, guildId },
      data: { assignedTo },
    });
  }

  async generateTranscript(guildId: string, ticketId: string, generatedBy: string) {
    const ticket = await this.findOne(guildId, ticketId);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${ticket.ticketNumber} Transcript</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .message { margin-bottom: 15px; padding: 10px; border-left: 3px solid #007bff; }
          .message.internal { border-left-color: #ffc107; }
          .author { font-weight: bold; color: #007bff; }
          .timestamp { color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Ticket #${ticket.ticketNumber}: ${ticket.title}</h1>
          <p>Status: ${ticket.status} | Priority: ${ticket.priority}</p>
          <p>Created: ${ticket.createdAt.toISOString()}</p>
        </div>
    `;

    for (const msg of ticket.messages) {
      html += `
        <div class="message ${msg.isInternal ? 'internal' : ''}">
          <div class="author">${msg.authorType}: ${msg.authorId}</div>
          <div class="timestamp">${msg.createdAt.toISOString()}</div>
          <div>${msg.content}</div>
        </div>
      `;
    }

    html += `</body></html>`;

    const transcript = await this.prisma.ticketTranscript.create({
      data: {
        ticketId,
        format: 'html',
        content: html,
        generatedBy,
      },
    });

    return transcript;
  }

  async getCategories(guildId: string) {
    return this.prisma.ticketCategory.findMany({
      where: { guildId, enabled: true },
      include: { sla: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(guildId: string, data: any) {
    return this.prisma.ticketCategory.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  async createSLA(guildId: string, data: {
    name: string;
    responseTime: number;
    resolutionTime: number;
  }) {
    return this.prisma.ticketSLA.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  async checkSLAViolations(guildId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        guildId,
        status: { in: ['open', 'waiting'] },
        slaDeadline: { lte: new Date() },
      },
      include: { sla: true },
    });

    return tickets.map((ticket) => ({
      ticket,
      violation: ticket.slaDeadline && ticket.slaDeadline < new Date(),
      overdueMinutes: ticket.slaDeadline
        ? Math.floor((Date.now() - ticket.slaDeadline.getTime()) / (1000 * 60))
        : 0,
    }));
  }
}

