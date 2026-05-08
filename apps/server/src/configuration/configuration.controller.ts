import { Controller, Get, Post, Put, Body, Param, Query, Logger, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { MessagesService } from '../messages/messages.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('configuration')
@Controller('api/configuration')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class ConfigurationController {
  private readonly logger = new Logger(ConfigurationController.name);

  constructor(
    private readonly configService: ConfigurationService,
    private readonly messagesService: MessagesService,
    private readonly auditService: AuditService,
  ) {}

  @Get('configs')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getConfigs(@Query('category') category: string | undefined, @CurrentGuild() guildId: string) {
    return this.configService.getAllConfigs(guildId, category);
  }

  @Get('configs/:key')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getConfig(@Param('key') key: string, @CurrentGuild() guildId: string) {
    const value = await this.configService.getConfig(guildId, key);
    return { key, value };
  }

  @Post('configs')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async setConfig(
    @Body() body: { key: string; value: string; description?: string; category?: string },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldConfig = await this.configService.getConfig(guildId, body.key).catch(() => null);
    const result = await this.configService.setConfig(guildId, body.key, body.value, body.description, body.category);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'CONFIG_UPDATE',
      entityType: 'Configuration',
      entityId: body.key,
      oldValue: oldConfig ? { key: body.key, value: oldConfig } : null,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Get('messages')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getMessages(@CurrentGuild() guildId: string) {
    return this.configService.getAllStaticMessages(guildId);
  }

  @Get('messages/:key')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getMessage(@Param('key') key: string, @CurrentGuild() guildId: string) {
    return this.configService.getStaticMessage(guildId, key);
  }

  @Post('messages')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async setMessage(
    @Body() body: { key: string; content: string; channelId?: string; enabled?: boolean; updateExisting?: boolean },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldMessage = await this.configService.getStaticMessage(guildId, body.key).catch(() => null);
    const result = await this.configService.setStaticMessage(guildId, body.key, body.content, body.channelId, body.enabled);
    
    // If updateExisting is true and channel is set, update existing Discord messages
    if (body.updateExisting && (body.channelId || result.channelId)) {
      try {
        await this.messagesService.updateStaticMessage(body.key, body.content, body.channelId || result.channelId || undefined, guildId);
      } catch (error) {
        // Log but don't fail the request
        this.logger.error('Failed to update existing messages:', error);
      }
    }
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'STATIC_MESSAGE_UPDATE',
      entityType: 'StaticMessage',
      entityId: body.key,
      oldValue: oldMessage,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    return result;
  }

  @Put('messages/:key/toggle')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async toggleMessage(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldMessage = await this.configService.getStaticMessage(guildId, key);
    const result = await this.configService.toggleStaticMessage(guildId, key, body.enabled);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'STATIC_MESSAGE_TOGGLE',
      entityType: 'StaticMessage',
      entityId: key,
      oldValue: oldMessage,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }
}
