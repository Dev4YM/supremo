import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('messages')
@Controller('api/messages')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly auditService: AuditService,
  ) {}

  @Get('sent')
  @RequirePermission('MESSAGES_VIEW')
  async getSentMessages(@Query() query: any, @CurrentGuild() guildId: string) {
    return this.messagesService.getSentMessages({
      guildId,
      channelId: query.channelId,
      staticMessageKey: query.staticMessageKey,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Post('static/:key/send')
  @RequirePermission('MESSAGES_SEND')
  async sendStaticMessage(
    @Param('key') key: string,
    @Body() body: { channelId?: string; replaceExisting?: boolean },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const result = await this.messagesService.sendStaticMessage(
      key,
      body.channelId,
      body.replaceExisting !== false,
      guildId,
    );
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'MESSAGE_SEND',
      entityType: 'SentMessage',
      entityId: result.id,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Put('static/:key/update')
  @RequirePermission('MESSAGES_SEND')
  async updateStaticMessage(
    @Param('key') key: string,
    @Body() body: { content: string; channelId?: string },
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldMessage = await this.messagesService.getStaticMessage(key, guildId);
    const result = await this.messagesService.updateStaticMessage(key, body.content, body.channelId, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'MESSAGE_UPDATE',
      entityType: 'StaticMessage',
      entityId: key,
      oldValue: oldMessage,
      newValue: result,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return result;
  }

  @Delete('sent/:id')
  @RequirePermission('MESSAGES_DELETE')
  async deleteSentMessage(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const message = await this.messagesService.getSentMessage(id, guildId);
    await this.messagesService.deleteSentMessage(id, guildId);
    
    await this.auditService.log({
      guildId,
      botUserId,
      action: 'MESSAGE_DELETE',
      entityType: 'SentMessage',
      entityId: id,
      oldValue: message,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { success: true };
  }
}
