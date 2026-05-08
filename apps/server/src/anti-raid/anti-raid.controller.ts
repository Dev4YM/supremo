import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AntiRaidService } from './anti-raid.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('anti-raid')
@Controller('api/anti-raid')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class AntiRaidController {
  constructor(
    private antiRaidService: AntiRaidService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get anti-raid configuration
   */
  @Get('config')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get anti-raid configuration', description: 'Retrieves anti-raid settings' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Anti-raid configuration' })
  async getConfig(@CurrentGuild() guildId: string) {
    return this.antiRaidService.getConfig(guildId);
  }

  /**
   * Update anti-raid configuration
   */
  @Put('config')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Update anti-raid configuration', description: 'Updates anti-raid settings' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateConfig(
    @CurrentGuild() guildId: string,
    @Body() data: any,
  ) {
    return this.antiRaidService.updateConfig(guildId, data);
  }

  /**
   * Get join rate limits
   */
  @Get('join-rate')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getJoinRate(@CurrentGuild() guildId: string) {
    // This would typically be called internally, but exposed for monitoring
    const config = await this.antiRaidService.getConfig(guildId);
    const rateLimits = await this.prisma.joinRateLimit.findMany({
      where: { guildId },
      orderBy: { windowStart: 'desc' },
      take: 10,
    });

    return {
      config: {
        enabled: config.joinRateLimitEnabled,
        limit: config.joinRateLimit,
        window: config.joinRateWindow,
      },
      recent: rateLimits,
    };
  }

  /**
   * Get verification flows
   */
  @Get('verification')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getVerificationFlows(@CurrentGuild() guildId: string) {
    const config = await this.antiRaidService.getConfig(guildId);
    return this.prisma.verificationFlow.findMany({
      where: { guildId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Complete verification
   */
  @Post('verification/:token/complete')
  @HttpCode(HttpStatus.OK)
  async completeVerification(@Param('token') token: string) {
    return this.antiRaidService.completeVerification(token);
  }

  /**
   * Get lockdown state
   */
  @Get('lockdown')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getLockdown(@CurrentGuild() guildId: string) {
    return this.antiRaidService.getLockdownState(guildId);
  }

  /**
   * Set lockdown mode
   */
  @Post('lockdown')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async setLockdown(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Body() body: { enabled: boolean; reason: string; restrictions?: any },
  ) {
    return this.antiRaidService.setLockdown(
      guildId,
      body.enabled,
      body.reason,
      botUserId,
      body.restrictions,
    );
  }

  /**
   * Get role change alerts
   */
  @Get('role-alerts')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getRoleAlerts(@CurrentGuild() guildId: string) {
    return this.prisma.roleChangeAlert.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get audit log watches
   */
  @Get('audit-watches')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getAuditWatches(@CurrentGuild() guildId: string) {
    return this.antiRaidService.getAuditLogWatches(guildId);
  }

  /**
   * Create audit log watch
   */
  @Post('audit-watches')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createAuditWatch(
    @CurrentGuild() guildId: string,
    @Body() body: { actionType: string; severity?: string; alertChannelId?: string },
  ) {
    return this.antiRaidService.createAuditLogWatch(
      guildId,
      body.actionType,
      body.severity || 'medium',
      body.alertChannelId,
    );
  }
}

