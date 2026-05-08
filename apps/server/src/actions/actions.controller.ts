import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/action.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('actions')
@Controller('api/actions')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class ActionsController {
  constructor(
    private readonly actionsService: ActionsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission('ACTIONS_EXECUTE')
  @ApiOperation({ summary: 'Execute action', description: 'Executes a moderation action' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'Action executed successfully' })
  async execute(
    @Body() createActionDto: CreateActionDto,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const action = await this.actionsService.executeAction({
      ...createActionDto,
      guildId,
    });

    await this.auditService.log({
      guildId,
      botUserId,
      action: 'ACTION_EXECUTE',
      entityType: 'Action',
      entityId: action.action.id,
      newValue: action.action,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return action;
  }

  @Get()
  @RequirePermission('ACTIONS_VIEW')
  @ApiOperation({ summary: 'Get all actions', description: 'Retrieves moderation actions' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of actions' })
  async findAll(@Query() query: any, @CurrentGuild() guildId: string) {
    return this.actionsService.getActions({
      guildId,
      userId: query.userId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }
}

