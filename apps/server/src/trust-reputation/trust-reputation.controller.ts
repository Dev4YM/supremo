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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TrustReputationService } from './trust-reputation.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('trust-reputation')
@Controller('api/trust-reputation')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class TrustReputationController {
  constructor(
    private trustReputationService: TrustReputationService,
    private prisma: PrismaService,
  ) {}

  @Get('config')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getConfig(@CurrentGuild() guildId: string) {
    return this.trustReputationService.getConfig(guildId);
  }

  @Put('config')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async updateConfig(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.trustReputationService.updateConfig(guildId, data);
  }

  @Get('users/:userId')
  @RequirePermission('USERS_VIEW')
  async getUserTrustInfo(
    @CurrentGuild() guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.trustReputationService.getUserTrustInfo(guildId, userId);
  }

  @Post('users/:userId/calculate')
  @RequirePermission('USERS_VIEW')
  async calculateTrustScore(
    @CurrentGuild() guildId: string,
    @Param('userId') userId: string,
  ) {
    const score = await this.trustReputationService.calculateTrustScore(guildId, userId);
    return { trustScore: score };
  }

  @Post('users/:userId/assess-risk')
  @RequirePermission('USERS_VIEW')
  async assessRisk(
    @CurrentGuild() guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.trustReputationService.assessRisk(guildId, userId);
  }

  @Post('users/:userId/probation')
  @RequirePermission('USERS_EDIT')
  async placeOnProbation(
    @CurrentGuild() guildId: string,
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    const config = await this.trustReputationService.getConfig(guildId);
    return this.trustReputationService.placeOnProbation(
      guildId,
      userId,
      config.id,
      body.reason,
    );
  }

  @Delete('users/:userId/probation')
  @RequirePermission('USERS_EDIT')
  async removeProbation(
    @CurrentGuild() guildId: string,
    @Param('userId') userId: string,
    @CurrentUser() botUserId: string,
  ) {
    return this.trustReputationService.removeProbation(guildId, userId, botUserId);
  }

  @Get('channels/:channelId/rules')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getChannelRules(
    @CurrentGuild() guildId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.prisma.channelTrustRule.findUnique({
      where: {
        guildId_channelId: {
          guildId,
          channelId,
        },
      },
    });
  }

  @Post('channels/:channelId/rules')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createChannelRule(
    @CurrentGuild() guildId: string,
    @Param('channelId') channelId: string,
    @Body() rule: any,
  ) {
    const config = await this.trustReputationService.getConfig(guildId);
    return this.trustReputationService.createChannelRule(
      guildId,
      config.id,
      channelId,
      rule,
    );
  }

  @Post('exemptions')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createExemption(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Body() exemption: any,
  ) {
    const config = await this.trustReputationService.getConfig(guildId);
    return this.trustReputationService.createExemption(guildId, config.id, {
      ...exemption,
      createdBy: botUserId,
    });
  }

  @Get('risk-assessments')
  @RequirePermission('USERS_VIEW')
  async getRiskAssessments(
    @CurrentGuild() guildId: string,
    @Query('userId') userId?: string,
  ) {
    return this.prisma.riskAssessment.findMany({
      where: {
        guildId,
        ...(userId && { userId }),
      },
      include: { user: true },
      orderBy: { assessedAt: 'desc' },
      take: 100,
    });
  }

  @Get('probations')
  @RequirePermission('USERS_VIEW')
  async getProbations(@CurrentGuild() guildId: string) {
    return this.prisma.probationRecord.findMany({
      where: { guildId, status: 'active' },
      include: { user: true },
      orderBy: { startedAt: 'desc' },
    });
  }
}

