import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { DebugService } from './debug.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';

@ApiTags('Debug')
@Controller('api/debug')
@UseGuards(SessionGuard, PermissionGuard)
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  @Get('status')
  @RequirePermission('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get debug service status' })
  @ApiResponse({ status: 200, description: 'Debug status' })
  getStatus() {
    const logs = this.debugService.getLogs({ limit: 1 });
    return {
      enabled: this.debugService.isEnabled(),
      totalLogs: logs.length > 0 ? (this.debugService as any).logs?.size || 0 : 0,
      maxLogs: parseInt(process.env.DEBUG_MAX_LOGS || '10000', 10),
      retentionHours: parseInt(process.env.DEBUG_RETENTION_HOURS || '24', 10),
    };
  }

  @Post('enable')
  @RequirePermission('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable debug service' })
  @ApiResponse({ status: 200, description: 'Debug service enabled' })
  enable() {
    this.debugService.enable();
    return { success: true, message: 'Debug service enabled' };
  }

  @Post('disable')
  @RequirePermission('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable debug service' })
  @ApiResponse({ status: 200, description: 'Debug service disabled' })
  disable() {
    this.debugService.disable();
    return { success: true, message: 'Debug service disabled' };
  }

  @Get('logs')
  @RequirePermission('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get debug logs with filters' })
  @ApiQuery({ name: 'type', required: false, type: [String], description: 'Filter by log type' })
  @ApiQuery({ name: 'category', required: false, type: [String], description: 'Filter by category' })
  @ApiQuery({ name: 'serviceName', required: false, type: [String], description: 'Filter by service name' })
  @ApiQuery({ name: 'functionName', required: false, type: [String], description: 'Filter by function name' })
  @ApiQuery({ name: 'path', required: false, type: [String], description: 'Filter by HTTP path' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'guildId', required: false, type: String, description: 'Filter by guild ID' })
  @ApiQuery({ name: 'minDuration', required: false, type: Number, description: 'Minimum duration in ms' })
  @ApiQuery({ name: 'includeErrors', required: false, type: Boolean, description: 'Include only errors' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'List of debug logs' })
  getLogs(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('serviceName') serviceName?: string,
    @Query('functionName') functionName?: string,
    @Query('path') path?: string,
    @Query('userId') userId?: string,
    @Query('guildId') guildId?: string,
    @Query('minDuration') minDuration?: string,
    @Query('includeErrors') includeErrors?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.debugService.getLogs({
      type: type ? type.split(',') : undefined,
      category: category ? category.split(',') : undefined,
      serviceName: serviceName ? serviceName.split(',') : undefined,
      functionName: functionName ? functionName.split(',') : undefined,
      path: path ? path.split(',') : undefined,
      userId,
      guildId,
      minDuration: minDuration ? parseInt(minDuration, 10) : undefined,
      includeErrors: includeErrors === 'true' ? true : includeErrors === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('logs/:id')
  @RequirePermission('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get debug log by ID' })
  @ApiParam({ name: 'id', description: 'Log ID' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Debug log entry' })
  getLogById(@Param('id') id: string) {
    const log = this.debugService.getLogById(id);
    if (!log) {
      return { error: 'Log not found' };
    }
    return log;
  }

  @Get('stats')
  @RequirePermission('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get debug statistics' })
  @ApiQuery({ name: 'startTime', required: false, type: String, description: 'Start time (ISO string)' })
  @ApiQuery({ name: 'endTime', required: false, type: String, description: 'End time (ISO string)' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Debug statistics' })
  getStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const timeRange = startTime && endTime
      ? { start: new Date(startTime), end: new Date(endTime) }
      : undefined;
    return this.debugService.getStats(timeRange);
  }

  @Post('sessions')
  @RequirePermission('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Create debug session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        filters: {
          type: 'object',
          properties: {
            types: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            services: { type: 'array', items: { type: 'string' } },
            functions: { type: 'array', items: { type: 'string' } },
            paths: { type: 'array', items: { type: 'string' } },
            minDuration: { type: 'number' },
            includeErrors: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiGuildResponses()
  @ApiResponse({ status: 201, description: 'Debug session created' })
  createSession(@Body() body: { name: string; filters?: any }) {
    const sessionId = this.debugService.createSession(body.name, body.filters);
    return { sessionId, message: 'Debug session created' };
  }

  @Delete('logs')
  @RequirePermission('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear debug logs' })
  @ApiQuery({ name: 'olderThan', required: false, type: String, description: 'Clear logs older than (ISO string)' })
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Logs cleared' })
  clearLogs(@Query('olderThan') olderThan?: string) {
    const deleted = this.debugService.clearLogs(
      olderThan ? new Date(olderThan) : undefined
    );
    return { success: true, deleted, message: `Cleared ${deleted} log entries` };
  }
}

