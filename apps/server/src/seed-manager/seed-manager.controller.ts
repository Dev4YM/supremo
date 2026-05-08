import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SeedManagerService } from './seed-manager.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { ApiStandardResponses } from '../common/decorators/api-response.decorator';

@ApiTags('seed-manager')
@Controller('api/seed-manager')
@UseGuards(SessionGuard, PermissionGuard)
export class SeedManagerController {
  constructor(private seedManagerService: SeedManagerService) {}

  /**
   * Get current seed status
   */
  @Get('status')
  @RequirePermission('SEED_MANAGE')
  async getStatus() {
    return this.seedManagerService.getStatus();
  }

  /**
   * Seed all categories
   */
  @Post('seed-all')
  @RequirePermission('SEED_MANAGE')
  async seedAll(@Query('force') force?: string) {
    const forceReseed = force === 'true' || force === '1';
    return this.seedManagerService.seedAll(forceReseed);
  }

  /**
   * Seed specific category
   */
  @Post('seed/:category')
  @RequirePermission('SEED_MANAGE')
  async seedCategory(
    @Param('category') category: string,
    @Query('force') force?: string,
  ) {
    const forceReseed = force === 'true' || force === '1';
    const count = await this.seedManagerService.seedCategory(category, forceReseed);
    return {
      success: true,
      category,
      itemsCreated: count,
    };
  }

  /**
   * Reset all seed data (dangerous!)
   */
  @Delete('reset-all')
  @RequirePermission('SEED_MANAGE')
  async resetAll() {
    await this.seedManagerService.resetAll();
    return {
      success: true,
      message: 'All seed data has been reset',
    };
  }
}

