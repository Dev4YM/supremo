import { Controller, Get, Post, Put, Delete, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GuildsService } from './guilds.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { RequirePermission } from '../auth/guards/permission.guard';
import { ApiStandardResponses } from '../common/decorators/api-response.decorator';
import { UpdateBrandingDto, BrandingResponseDto } from './dto/branding.dto';

@ApiTags('guilds')
@Controller('api/guilds')
@UseGuards(SessionGuard)
export class GuildsController {
  constructor(private guildsService: GuildsService) {}

  /**
   * Get all guilds user has access to
   */
  @Get()
  async getUserGuilds(@CurrentUser() botUserId: string) {
    return this.guildsService.getUserGuilds(botUserId);
  }

  /**
   * Connect a Discord guild
   */
  @Post(':discordGuildId/connect')
  async connectGuild(
    @Param('discordGuildId') discordGuildId: string,
    @CurrentUser() botUserId: string,
  ) {
    return this.guildsService.connectGuild(discordGuildId, botUserId);
  }

  /**
   * Invite a user to a guild
   */
  @Post(':guildId/invite')
  async inviteUser(
    @Param('guildId') guildId: string,
    @Body() body: { botUserId: string; roleKey?: string },
    @CurrentUser() invitedBy: string,
  ) {
    return this.guildsService.inviteUser(guildId, body.botUserId, invitedBy, body.roleKey);
  }

  /**
   * Get branding configuration for current guild
   */
  @Get('branding')
  @UseGuards(SessionGuard, GuildGuard)
  @ApiOperation({ summary: 'Get guild branding configuration' })
  @ApiResponse({ type: BrandingResponseDto })
  async getBranding(@CurrentGuild() guildId: string) {
    return this.guildsService.getBranding(guildId);
  }

  /**
   * Update branding configuration for current guild
   */
  @Put('branding')
  @UseGuards(SessionGuard, GuildGuard, PermissionGuard)
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Update guild branding configuration' })
  @ApiResponse({ type: BrandingResponseDto })
  async updateBranding(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.guildsService.updateBranding(guildId, botUserId, dto);
  }

  /**
   * Reset branding to defaults
   */
  @Delete('branding')
  @UseGuards(SessionGuard, GuildGuard, PermissionGuard)
  @RequirePermission('GUILD_SETTINGS_EDIT')
  @ApiOperation({ summary: 'Reset guild branding to defaults' })
  async resetBranding(
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
  ) {
    await this.guildsService.resetBranding(guildId, botUserId);
    return { message: 'Branding reset successfully' };
  }
}

