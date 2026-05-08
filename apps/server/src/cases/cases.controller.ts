import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam, ApiFilterParams } from '../common/decorators/api-param.decorator';

@ApiTags('cases')
@Controller('api/cases')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class CasesController {
  constructor(private casesService: CasesService) {}

  @Get()
  @RequirePermission('INCIDENTS_VIEW')
  @ApiOperation({ summary: 'Get all cases', description: 'Retrieves cases with optional filtering' })
  @ApiGuildParam()
  @ApiFilterParams()
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of cases' })
  async findAll(
    @CurrentGuild() guildId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('userId') userId?: string,
  ) {
    return this.casesService.findAll(guildId, {
      status,
      type,
      assignedTo,
      userId,
    });
  }

  @Get(':id')
  @RequirePermission('INCIDENTS_VIEW')
  @ApiOperation({ summary: 'Get case by ID', description: 'Retrieves a specific case' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Case found' })
  async findOne(@CurrentGuild() guildId: string, @Param('id') caseId: string) {
    return this.casesService.findOne(guildId, caseId);
  }

  @Post()
  @RequirePermission('INCIDENTS_CREATE')
  async create(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Body() data: any,
  ) {
    return this.casesService.create(guildId, {
      ...data,
      createdBy: botUserId,
    });
  }

  @Put(':id')
  @RequirePermission('INCIDENTS_EDIT')
  async update(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
    @Body() data: any,
  ) {
    return this.casesService.update(guildId, caseId, data, botUserId);
  }

  @Post(':id/assign')
  @RequirePermission('INCIDENTS_EDIT')
  async assign(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
    @Body() body: { assignedTo: string },
  ) {
    return this.casesService.assign(guildId, caseId, body.assignedTo, botUserId);
  }

  @Post(':id/resolve')
  @RequirePermission('INCIDENTS_RESOLVE')
  async resolve(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
    @Body() body: { notes?: string },
  ) {
    return this.casesService.resolve(guildId, caseId, botUserId, body.notes);
  }

  @Post(':id/close')
  @RequirePermission('INCIDENTS_RESOLVE')
  async close(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
  ) {
    return this.casesService.close(guildId, caseId, botUserId);
  }

  @Post(':id/reopen')
  @RequirePermission('INCIDENTS_RESOLVE')
  async reopen(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
  ) {
    return this.casesService.reopen(guildId, caseId, botUserId);
  }

  @Post(':id/evidence')
  @RequirePermission('INCIDENTS_EDIT')
  async addEvidence(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
    @Body() evidence: any,
  ) {
    return this.casesService.addEvidence(guildId, caseId, {
      ...evidence,
      uploadedBy: botUserId,
    });
  }

  @Post(':id/notes')
  @RequirePermission('INCIDENTS_EDIT')
  async addNote(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @CurrentUser() botUserId: string,
    @Body() note: any,
  ) {
    return this.casesService.addNote(guildId, caseId, {
      ...note,
      createdBy: botUserId,
    });
  }

  @Post(':id/appeals')
  async createAppeal(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @Body() appeal: any,
  ) {
    return this.casesService.createAppeal(guildId, caseId, appeal);
  }

  @Put(':id/appeals/:appealId')
  @RequirePermission('INCIDENTS_RESOLVE')
  async reviewAppeal(
    @CurrentGuild() guildId: string,
    @Param('id') caseId: string,
    @Param('appealId') appealId: string,
    @CurrentUser() botUserId: string,
    @Body() review: any,
  ) {
    return this.casesService.reviewAppeal(guildId, caseId, appealId, {
      ...review,
      reviewedBy: botUserId,
    });
  }

  @Get(':id/export')
  @RequirePermission('INCIDENTS_VIEW')
  async exportCase(@CurrentGuild() guildId: string, @Param('id') caseId: string) {
    return this.casesService.exportCase(guildId, caseId);
  }

  @Delete('expired')
  @RequirePermission('INCIDENTS_DELETE')
  async deleteExpired(@CurrentGuild() guildId: string) {
    return this.casesService.deleteExpired(guildId);
  }
}

