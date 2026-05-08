import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('audit')
@Controller('api/audit')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermission('ACTIONS_VIEW')
  @ApiOperation({
    summary: 'Guild dashboard audit logs',
    description: 'Returns persisted AuditLog rows for the current guild (Prisma), newest first.',
  })
  @ApiGuildParam()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of audit log entries' })
  async guildLogs(
    @CurrentGuild() guildId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 1), 500) : 100;
    const skip = offset ? Math.max(parseInt(offset, 10) || 0, 0) : 0;
    return this.auditService.getGuildLogs(guildId, take, skip);
  }
}
