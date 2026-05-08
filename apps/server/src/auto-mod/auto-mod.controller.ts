import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AutoModService } from './auto-mod.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('auto-mod')
@Controller('api/auto-mod')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class AutoModController {
  constructor(
    private autoModService: AutoModService,
    private prisma: PrismaService,
  ) {}

  @Get('rules')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  @ApiOperation({ summary: 'Get auto-mod rules', description: 'Retrieves all auto-moderation rules' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of auto-mod rules' })
  async getRules(@CurrentGuild() guildId: string) {
    return this.autoModService.getRules(guildId);
  }

  @Post('rules')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Create auto-mod rule', description: 'Creates a new auto-moderation rule' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.autoModService.createRule(guildId, data);
  }

  @Put('rules/:id')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Update auto-mod rule', description: 'Updates an existing auto-moderation rule' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  async updateRule(
    @CurrentGuild() guildId: string,
    @Param('id') ruleId: string,
    @Body() data: any,
  ) {
    return this.autoModService.updateRule(guildId, ruleId, data);
  }

  @Delete('rules/:id')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Delete auto-mod rule', description: 'Deletes an auto-moderation rule' })
  @ApiGuildParam()
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  async deleteRule(@CurrentGuild() guildId: string, @Param('id') ruleId: string) {
    return this.autoModService.deleteRule(guildId, ruleId);
  }

  @Get('offenders')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getOffenders(@CurrentGuild() guildId: string) {
    return this.prisma.offenderRecord.findMany({
      where: { guildId, escalated: true },
      include: { rule: true },
      orderBy: { violationCount: 'desc' },
      take: 100,
    });
  }

  @Get('scans')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getScans(@CurrentGuild() guildId: string) {
    return this.prisma.contentScan.findMany({
      where: { guildId, flagged: true },
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

