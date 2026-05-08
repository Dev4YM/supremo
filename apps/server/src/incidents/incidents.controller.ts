import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto, UpdateIncidentDto, ApproveIncidentDto, RejectIncidentDto } from './dto/incident.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { RequirePermission, PermissionGuard } from '../auth/guards/permission.guard';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam, ApiPaginationParams } from '../common/decorators/api-param.decorator';

@ApiTags('incidents')
@Controller('api/incidents')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('INCIDENTS_VIEW')
  @ApiOperation({ 
    summary: 'Get all incidents',
    description: 'Retrieves a paginated list of incidents with optional filtering',
  })
  @ApiGuildParam()
  @ApiPaginationParams()
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'RESOLVED'], description: 'Filter by status' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'List of incidents',
    type: [Object],
  })
  async findAll(
    @Query() query: any,
    @CurrentGuild() guildId: string,
  ) {
    return this.incidentsService.findAll({
      guildId,
      status: query.status,
      userId: query.userId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('INCIDENTS_VIEW')
  @ApiOperation({ 
    summary: 'Get incident by ID',
    description: 'Retrieves a specific incident by its ID',
  })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Incident ID', example: 'incident-uuid' })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'Incident found',
    type: Object,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
  ) {
    return this.incidentsService.findOne(id, guildId);
  }

  @Post()
  @RequirePermission('INCIDENTS_VIEW')
  @ApiOperation({ 
    summary: 'Create incident',
    description: 'Creates a new incident',
  })
  @ApiGuildParam()
  @ApiBody({ type: CreateIncidentDto })
  @ApiGuildResponses()
  @ApiResponse({
    status: 201,
    description: 'Incident created successfully',
    type: Object,
  })
  async create(
    @Body() createIncidentDto: CreateIncidentDto,
    @CurrentGuild() guildId: string,
  ) {
    const incident = await this.incidentsService.createIncident({
      ...createIncidentDto,
      guildId,
    });
    return incident;
  }

  @Put(':id')
  @RequirePermission('INCIDENTS_RESOLVE')
  @ApiOperation({ 
    summary: 'Update incident',
    description: 'Updates an existing incident',
  })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Incident ID', example: 'incident-uuid' })
  @ApiBody({ type: UpdateIncidentDto })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'Incident updated successfully',
    type: Object,
  })
  async update(
    @Param('id') id: string,
    @Body() updateIncidentDto: UpdateIncidentDto,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldIncident = await this.incidentsService.findOne(id, guildId);
    const updated = await this.incidentsService.updateIncident(id, updateIncidentDto, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'INCIDENT_UPDATE',
      entityType: 'Incident',
      entityId: id,
      oldValue: oldIncident,
      newValue: updated,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return updated;
  }

  @Post(':id/approve')
  @RequirePermission('INCIDENTS_RESOLVE')
  @ApiOperation({ 
    summary: 'Approve incident',
    description: 'Approves an incident and executes recommended actions',
  })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Incident ID', example: 'incident-uuid' })
  @ApiBody({ type: ApproveIncidentDto })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'Incident approved successfully',
    type: Object,
  })
  async approve(
    @Param('id') id: string,
    @Body() body: ApproveIncidentDto,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldIncident = await this.incidentsService.findOne(id, guildId);
    const approved = await this.incidentsService.approveIncident(id, body.moderatorId, body.notes, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'INCIDENT_APPROVE',
      entityType: 'Incident',
      entityId: id,
      oldValue: oldIncident,
      newValue: approved,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return approved;
  }

  @Post(':id/reject')
  @RequirePermission('INCIDENTS_RESOLVE')
  @ApiOperation({ 
    summary: 'Reject incident',
    description: 'Rejects an incident without taking action',
  })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Incident ID', example: 'incident-uuid' })
  @ApiBody({ type: RejectIncidentDto })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'Incident rejected successfully',
    type: Object,
  })
  async reject(
    @Param('id') id: string,
    @Body() body: RejectIncidentDto,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldIncident = await this.incidentsService.findOne(id, guildId);
    const rejected = await this.incidentsService.rejectIncident(id, body.moderatorId, body.notes, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'INCIDENT_REJECT',
      entityType: 'Incident',
      entityId: id,
      oldValue: oldIncident,
      newValue: rejected,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return rejected;
  }
}

