import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('commands')
@Controller('api/commands')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class CommandsController {
  constructor(
    private commandsService: CommandsService,
    private auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('COMMANDS_VIEW')
  async getAll(@Query() query: any, @CurrentGuild() guildId: string) {
    return this.commandsService.getAll({
      guildId,
      category: query.category,
      isSystem: query.isSystem === 'true' ? true : query.isSystem === 'false' ? false : undefined,
      enabled: query.enabled === 'true' ? true : query.enabled === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('COMMANDS_VIEW')
  async getOne(@Param('id') id: string, @CurrentGuild() guildId: string) {
    return this.commandsService.getOne(id, guildId);
  }

  @Get(':id/stats')
  @RequirePermission('COMMANDS_VIEW')
  async getStats(@Param('id') id: string, @CurrentGuild() guildId: string) {
    return this.commandsService.getCommandStats(id, guildId);
  }

  @Post()
  @RequirePermission('COMMANDS_CREATE')
  async create(
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const command = await this.commandsService.createCommand({ ...body, guildId, createdBy: botUserId });
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'COMMAND_CREATE',
      entityType: 'BotCommand',
      entityId: command.id,
      newValue: command,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return command;
  }

  @Put(':id')
  @RequirePermission('COMMANDS_EDIT')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldCommand = await this.commandsService.getOne(id, guildId);
    const updated = await this.commandsService.update(id, body, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'COMMAND_UPDATE',
      entityType: 'BotCommand',
      entityId: id,
      oldValue: oldCommand,
      newValue: updated,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return updated;
  }

  @Delete(':id')
  @RequirePermission('COMMANDS_DELETE')
  async delete(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const command = await this.commandsService.getOne(id, guildId);
    await this.commandsService.delete(id, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'COMMAND_DELETE',
      entityType: 'BotCommand',
      entityId: id,
      oldValue: command,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { success: true };
  }

  // Permission endpoints
  @Post(':id/permissions')
  @RequirePermission('COMMANDS_PERMISSIONS_EDIT')
  async setPermission(
    @Param('id') commandId: string,
    @Body() body: { roleId: string; roleName: string; restrictions?: any },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const result = await this.commandsService.setPermission(
      commandId,
      body.roleId,
      body.roleName,
      body.restrictions,
      guildId,
    );
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'COMMAND_PERMISSION_SET',
      entityType: 'CommandPermission',
      entityId: result.id,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Put(':id/permissions/:roleId')
  @RequirePermission('COMMANDS_PERMISSIONS_EDIT')
  async updatePermission(
    @Param('id') commandId: string,
    @Param('roleId') roleId: string,
    @Body() body: { canExecute: boolean; restrictions?: any },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const result = await this.commandsService.updatePermission(
      commandId,
      roleId,
      body.canExecute,
      body.restrictions,
      guildId,
    );
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'COMMAND_PERMISSION_UPDATE',
      entityType: 'CommandPermission',
      entityId: result.id,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Delete(':id/permissions/:roleId')
  @RequirePermission('COMMANDS_PERMISSIONS_EDIT')
  async removePermission(
    @Param('id') commandId: string,
    @Param('roleId') roleId: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    await this.commandsService.removePermission(commandId, roleId, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'COMMAND_PERMISSION_REMOVE',
      entityType: 'CommandPermission',
      entityId: `${commandId}_${roleId}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { success: true };
  }
}
