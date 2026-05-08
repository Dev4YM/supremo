import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('analytics')
@Controller('api/analytics')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('member-growth')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get member growth metrics', description: 'Retrieves member growth analytics' })
  @ApiGuildParam()
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days', example: 30 })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Member growth metrics' })
  async getMemberGrowth(
    @CurrentGuild() guildId: string,
    @Query('days') days: string = '30',
  ) {
    const daysNum = parseInt(days, 10);
    return this.analyticsService.getMemberGrowth(guildId, daysNum);
  }

  @Get('activity')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get activity metrics', description: 'Retrieves server activity analytics' })
  @ApiGuildParam()
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days', example: 30 })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Activity metrics' })
  async getActivity(
    @CurrentGuild() guildId: string,
    @Query('days') days: string = '30',
  ) {
    const daysNum = parseInt(days, 10);
    return this.analyticsService.getActivityMetrics(guildId, daysNum);
  }

  @Get('engagement')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get engagement heatmap', description: 'Retrieves engagement heatmap data' })
  @ApiGuildParam()
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days', example: 7 })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Engagement heatmap' })
  async getEngagement(
    @CurrentGuild() guildId: string,
    @Query('days') days: string = '7',
  ) {
    const daysNum = parseInt(days, 10);
    return this.analyticsService.getEngagementHeatmap(guildId, daysNum);
  }

  @Get('mod-workload')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getModWorkload(
    @CurrentGuild() guildId: string,
    @Query('days') days: string = '30',
  ) {
    const daysNum = parseInt(days, 10);
    return this.analyticsService.getModWorkloadMetrics(guildId, daysNum);
  }

  @Get('automation')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getAutomationMetrics(
    @CurrentGuild() guildId: string,
    @Query('automationId') automationId?: string,
    @Query('days') days: string = '30',
  ) {
    const daysNum = parseInt(days, 10);
    return this.analyticsService.getAutomationMetrics(guildId, automationId, daysNum);
  }

  @Get('anomalies')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getAnomalies(
    @CurrentGuild() guildId: string,
    @Query('acknowledged') acknowledged?: string,
  ) {
    return this.analyticsService.getAnomalyAlerts(
      guildId,
      acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
    );
  }

  @Post('snapshot')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async createSnapshot(
    @CurrentGuild() guildId: string,
    @Query('type') type: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.analyticsService.getSnapshot(guildId, type);
  }

  @Post('detect-anomalies')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async detectAnomalies(@CurrentGuild() guildId: string) {
    return this.analyticsService.detectAnomalies(guildId);
  }

  @Get('health')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get health metrics', description: 'Retrieves server health metrics for dashboard' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Health metrics' })
  async getHealthMetrics(@CurrentGuild() guildId: string) {
    return this.analyticsService.getHealthMetrics(guildId);
  }
}

