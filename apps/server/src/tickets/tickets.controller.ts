import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam, ApiFilterParams } from '../common/decorators/api-param.decorator';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  AddTicketMessageDto,
  CreateTicketCategoryDto,
  CreateSLADto,
  QueryTicketsDto,
} from './dto/ticket.dto';

@ApiTags('tickets')
@Controller('api/tickets')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get all tickets', description: 'Retrieves tickets with optional filtering' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async findAll(
    @CurrentGuild() guildId: string,
    @Query() query: QueryTicketsDto,
  ) {
    return this.ticketsService.findAll(guildId, query);
  }

  @Get('categories')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get ticket categories', description: 'Retrieves all ticket categories' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of ticket categories' })
  async getCategories(@CurrentGuild() guildId: string) {
    return this.ticketsService.getCategories(guildId);
  }

  @Get('sla-violations')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Check SLA violations', description: 'Retrieves tickets that have violated SLA' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of SLA violations' })
  async checkSLAViolations(@CurrentGuild() guildId: string) {
    return this.ticketsService.checkSLAViolations(guildId);
  }

  @Get(':id')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get ticket by ID', description: 'Retrieves a specific ticket' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Ticket found' })
  async findOne(@CurrentGuild() guildId: string, @Param('id') ticketId: string) {
    return this.ticketsService.findOne(guildId, ticketId);
  }

  @Post()
  @ApiOperation({ summary: 'Create ticket', description: 'Creates a new support ticket' })
  @ApiGuildParam()
  @ApiBody({ type: CreateTicketDto })
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  async create(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Body() data: CreateTicketDto,
  ) {
    const user = await this.prisma.botUser.findUnique({
      where: { id: botUserId },
      select: { discordId: true },
    });

    if (!user?.discordId) {
      throw new BadRequestException('User Discord ID not found');
    }

    return this.ticketsService.create(guildId, {
      ...data,
      userId: data.userId || botUserId,
      discordUserId: user.discordId,
    });
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to ticket', description: 'Adds a message to an existing ticket' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiBody({ type: AddTicketMessageDto })
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'Message added successfully' })
  async addMessage(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Param('id') ticketId: string,
    @Body() message: AddTicketMessageDto,
  ) {
    const user = await this.prisma.botUser.findUnique({
      where: { id: botUserId },
      select: { discordId: true },
    });

    if (!user?.discordId) {
      throw new BadRequestException('User Discord ID not found');
    }

    return this.ticketsService.addMessage(guildId, ticketId, {
      messageId: `temp-${Date.now()}`,
      authorId: user.discordId,
      authorType: 'moderator',
      content: message.content,
      attachments: [],
      isInternal: message.isInternal || false,
    });
  }

  @Put(':id/status')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Update ticket status', description: 'Updates the status of a ticket' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiBody({ type: UpdateTicketStatusDto })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Ticket status updated successfully' })
  async updateStatus(
    @CurrentGuild() guildId: string,
    @Param('id') ticketId: string,
    @CurrentUser() botUserId: string,
    @Body() body: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(guildId, ticketId, body.status, botUserId);
  }

  @Put(':id/assign')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Assign ticket', description: 'Assigns a ticket to a user' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiBody({ type: AssignTicketDto })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
  async assign(
    @CurrentGuild() guildId: string,
    @Param('id') ticketId: string,
    @Body() body: AssignTicketDto,
  ) {
    return this.ticketsService.assign(guildId, ticketId, body.assignedTo);
  }

  @Post(':id/transcript')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Generate ticket transcript', description: 'Generates a transcript of all ticket messages' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Transcript generated successfully' })
  async generateTranscript(
    @CurrentGuild() guildId: string,
    @Param('id') ticketId: string,
    @CurrentUser() botUserId: string,
  ) {
    return this.ticketsService.generateTranscript(guildId, ticketId, botUserId);
  }

  @Post('categories')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Create ticket category', description: 'Creates a new ticket category' })
  @ApiGuildParam()
  @ApiBody({ type: CreateTicketCategoryDto })
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(@CurrentGuild() guildId: string, @Body() data: CreateTicketCategoryDto) {
    return this.ticketsService.createCategory(guildId, data);
  }

  @Post('slas')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Create SLA', description: 'Creates a new SLA configuration' })
  @ApiGuildParam()
  @ApiBody({ type: CreateSLADto })
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'SLA created successfully' })
  async createSLA(@CurrentGuild() guildId: string, @Body() data: CreateSLADto) {
    return this.ticketsService.createSLA(guildId, {
      name: data.name,
      responseTime: data.responseTimeHours * 60,
      resolutionTime: data.resolutionTimeHours * 60,
    });
  }
}

