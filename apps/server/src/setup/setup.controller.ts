import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { ApiStandardResponses } from '../common/decorators/api-response.decorator';

@ApiTags('setup')
@Controller('api/setup')
export class SetupController {
  constructor(private setupService: SetupService) {}

  /**
   * Get setup status - indicates if system is ready for use
   */
  @Get('status')
  @ApiOperation({ 
    summary: 'Get setup status', 
    description: 'Returns system readiness: RBAC seeded, users exist, guild count' 
  })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'Setup status' })
  async getStatus() {
    return this.setupService.getStatus();
  }
}
