import { Controller, Get, Param, Query, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserResponseDto, UserProfileResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('api/users')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('USERS_VIEW')
  @ApiOperation({ 
    summary: 'Get all users in the guild',
    description: 'Retrieves a paginated list of users. Optionally syncs from Discord if sync=true.',
  })
  @ApiGuildParam()
  @ApiQuery({ name: 'sync', required: false, type: Boolean, description: 'Sync users from Discord' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of users to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of users to skip' })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [UserResponseDto],
  })
  async findAll(@Query() query: QueryUsersDto, @CurrentGuild() guildId: string) {
    const shouldSync = query.sync === true;
    
    return this.usersService.findAll({
      guildId,
      limit: query.limit,
      offset: query.offset,
      syncFromDiscord: shouldSync,
    });
  }

  @Get('discord')
  @RequirePermission('USERS_VIEW')
  @ApiOperation({ 
    summary: 'Get all Discord members',
    description: 'Retrieves all Discord members from the guild (not synced to database)',
  })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'List of Discord members',
    type: [Object],
  })
  async getAllDiscordMembers(@CurrentGuild() guildId: string) {
    return this.usersService.getAllDiscordMembers(guildId);
  }

  @Post('sync')
  @RequirePermission('USERS_SYNC')
  @ApiOperation({ 
    summary: 'Sync members from Discord',
    description: 'Manually syncs all Discord members to the database',
  })
  @ApiGuildParam()
  @ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Force refresh even if recently synced' })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    schema: {
      example: {
        success: true,
        message: 'Members synced successfully',
      },
    },
  })
  async syncMembers(@Query('force') force: string | undefined, @CurrentGuild() guildId: string) {
    const forceRefresh = force === 'true' || force === '1';
    await this.usersService.syncDiscordMembers(guildId, forceRefresh);
    return { success: true, message: 'Members synced successfully' };
  }

  @Get('discord/:discordId')
  @RequirePermission('USERS_VIEW')
  @ApiOperation({ 
    summary: 'Get user by Discord ID',
    description: 'Retrieves a user by their Discord ID',
  })
  @ApiGuildParam()
  @ApiParam({ name: 'discordId', description: 'Discord user ID', example: '123456789012345678' })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  async findByDiscordId(@Param('discordId') discordId: string, @CurrentGuild() guildId: string) {
    return this.usersService.findByDiscordId(discordId, guildId);
  }

  @Get('discord/:discordId/profile')
  @RequirePermission('USERS_VIEW')
  @ApiOperation({ 
    summary: 'Get user profile',
    description: 'Retrieves detailed user profile including roles, permissions, and history',
  })
  @ApiGuildParam()
  @ApiParam({ name: 'discordId', description: 'Discord user ID', example: '123456789012345678' })
  @ApiGuildResponses()
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserProfileResponseDto,
  })
  async getProfile(@Param('discordId') discordId: string, @CurrentGuild() guildId: string) {
    return this.usersService.getUserProfile(discordId, guildId);
  }
}

