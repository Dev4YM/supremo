import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('onboarding')
@Controller('api/onboarding')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get('flow')
  @RequirePermission('GUILD_SETTINGS_VIEW')
  async getFlow(@CurrentGuild() guildId: string) {
    return this.onboardingService.getFlow(guildId);
  }

  @Put('flow')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async updateFlow(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.onboardingService.updateFlow(guildId, data);
  }

  @Post('welcome-messages')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createWelcomeMessage(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.onboardingService.createWelcomeMessage(guildId, data);
  }

  @Post('questions')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createQuestion(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.onboardingService.createQuestion(guildId, data);
  }

  @Post('dm-sequences')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createDMSequence(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.onboardingService.createDMSequence(guildId, data);
  }

  @Post('reaction-roles')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createReactionRole(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.onboardingService.createReactionRole(guildId, data);
  }

  @Post('role-menus')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createRoleMenu(@CurrentGuild() guildId: string, @Body() data: any) {
    return this.onboardingService.createRoleMenu(guildId, data);
  }

  @Post('temporary-roles')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async createTemporaryRole(
    @CurrentGuild() guildId: string,
    @Body() body: { userId: string; roleId: string; durationDays: number },
  ) {
    return this.onboardingService.createTemporaryRole(
      guildId,
      body.userId,
      body.roleId,
      body.durationDays,
    );
  }

  @Post('check-expired-roles')
  @RequirePermission('GUILD_SETTINGS_EDIT')
  async checkExpiredRoles(@CurrentGuild() guildId: string) {
    return this.onboardingService.checkExpiredTemporaryRoles(guildId);
  }
}

