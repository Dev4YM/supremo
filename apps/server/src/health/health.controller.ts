import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns basic health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check', description: 'Checks if service is ready to accept traffic' })
  @ApiResponse({ status: 200, description: 'Readiness status' })
  @ApiResponse({ status: 503, description: 'Service not ready' })
  async ready() {
    const readiness = await this.healthService.getReadiness();

    if (!readiness.ready) {
      return {
        status: 503,
        ...readiness,
      };
    }

    return readiness;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check', description: 'Checks if service is alive' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns detailed health status including all service checks',
  })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async detailed() {
    return this.healthService.getHealthStatus();
  }
}

