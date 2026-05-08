import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ServerService } from './server.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('server')
@Controller('api/server')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class ServerController {
  constructor(
    private readonly serverService: ServerService,
    private readonly auditService: AuditService,
  ) {}

  @Get('info')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getServerInfo(@CurrentGuild() guildId: string) {
    return this.serverService.getServerInfo(guildId);
  }

  @Get('roles')
  @RequirePermission('ROLES_VIEW')
  async getRoles(@CurrentGuild() guildId: string) {
    return this.serverService.getRoles(guildId);
  }

  @Post('roles')
  @RequirePermission('ROLES_EDIT')
  async createRole(
    @Body() body: { name: string; color?: string; mentionable?: boolean; hoist?: boolean },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const result = await this.serverService.createRole(guildId, body);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'ROLE_CREATE',
      entityType: 'Role',
      entityId: result.id,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Put('roles/:id')
  @RequirePermission('ROLES_EDIT')
  async updateRole(
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string; mentionable?: boolean; hoist?: boolean },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldRole = await this.serverService.getRole(guildId, id);
    const result = await this.serverService.updateRole(guildId, id, body);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'ROLE_UPDATE',
      entityType: 'Role',
      entityId: id,
      oldValue: oldRole,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Delete('roles/:id')
  @RequirePermission('ROLES_EDIT')
  async deleteRole(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldRole = await this.serverService.getRole(guildId, id);
    const result = await this.serverService.deleteRole(guildId, id);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'ROLE_DELETE',
      entityType: 'Role',
      entityId: id,
      oldValue: oldRole,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { ...result, id: id };
  }

  @Get('channels')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getChannels(@CurrentGuild() guildId: string) {
    return this.serverService.getChannels(guildId);
  }

  @Post('channels')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createChannel(
    @Body() body: { name: string; type?: string; parentId?: string; topic?: string },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const result = await this.serverService.createChannel(guildId, body);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'CHANNEL_CREATE',
      entityType: 'Channel',
      entityId: result.id,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Put('channels/:id')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async updateChannel(
    @Param('id') id: string,
    @Body() body: { name?: string; topic?: string; parentId?: string },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldChannel = await this.serverService.getChannel(guildId, id);
    const result = await this.serverService.updateChannel(guildId, id, body);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'CHANNEL_UPDATE',
      entityType: 'Channel',
      entityId: id,
      oldValue: oldChannel,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Delete('channels/:id')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async deleteChannel(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldChannel = await this.serverService.getChannel(guildId, id);
    const result = await this.serverService.deleteChannel(guildId, id);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'CHANNEL_DELETE',
      entityType: 'Channel',
      entityId: id,
      oldValue: oldChannel,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { ...result, id: id };
  }

  @Get('audit-logs')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getAuditLogs(@Query('limit') limit: string | undefined, @CurrentGuild() guildId: string) {
    return this.serverService.getAuditLogs(guildId, parseInt(limit || '50'));
  }

  @Get('invites')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getInvites(@CurrentGuild() guildId: string) {
    return this.serverService.getInvites(guildId);
  }

  @Post('invites')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createInvite(
    @Body() body: { channelId: string; maxAge?: number; maxUses?: number; temporary?: boolean },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const result = await this.serverService.createInvite(guildId, body);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'INVITE_CREATE',
      entityType: 'Invite',
      entityId: result.code,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }
}
