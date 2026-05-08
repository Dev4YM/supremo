import { Controller, Get, Put, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CacheManagerService } from './cache-manager.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('cache-manager')
@Controller('api/cache-manager')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class CacheManagerController {
  constructor(private cacheManagerService: CacheManagerService) {}

  /**
   * Get all cache configurations with statistics
   */
  @Get('configs')
  @RequirePermission('CACHE_MANAGE')
  async getAllConfigs(@CurrentGuild() guildId: string) {
    return this.cacheManagerService.getAllConfigs(guildId);
  }

  /**
   * Get specific cache configuration
   */
  @Get('configs/:key')
  @RequirePermission('CACHE_MANAGE')
  async getConfig(@Param('key') key: string, @CurrentGuild() guildId: string) {
    return this.cacheManagerService.getConfig(key, guildId);
  }

  /**
   * Update cache configuration
   */
  @Put('configs/:key')
  @RequirePermission('CACHE_MANAGE')
  async updateConfig(
    @Param('key') key: string,
    @Body()
    data: {
      enabled?: boolean;
      ttl?: number;
      autoRefresh?: boolean;
      priority?: number;
      maxSize?: number;
      strategy?: string;
      metadata?: any;
    },
    @CurrentGuild() guildId: string,
  ) {
    return this.cacheManagerService.updateConfig(key, data, guildId);
  }

  /**
   * Get cache statistics
   */
  @Get('stats/:key')
  async getStatistics(@Param('key') key: string) {
    return this.cacheManagerService.getStatistics(key);
  }

  /**
   * Get overall cache manager statistics
   */
  @Get('stats')
  async getOverallStatistics(@CurrentGuild() guildId: string) {
    return this.cacheManagerService.getOverallStatistics(guildId);
  }

  /**
   * Trigger manual cache refresh
   */
  @Post('refresh/:key')
  async refreshCache(
    @Param('key') key: string,
    @Body() body: { triggeredBy?: string } = {},
  ) {
    const triggeredBy = body.triggeredBy || 'web-admin';
    return this.cacheManagerService.triggerRefresh(key, 'manual', triggeredBy);
  }

  /**
   * Clear specific cache
   */
  @Delete('clear/:key')
  async clearCache(@Param('key') key: string) {
    await this.cacheManagerService.clear(key);
    return { success: true, message: `Cache ${key} cleared successfully` };
  }

  /**
   * Clear all caches
   */
  @Delete('clear')
  async clearAllCaches() {
    await this.cacheManagerService.clear();
    return { success: true, message: 'All caches cleared successfully' };
  }

  /**
   * Get refresh logs for a cache
   */
  @Get('logs/:key')
  async getRefreshLogs(
    @Param('key') key: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.cacheManagerService.getRefreshLogs(key, limitNum);
  }
}

