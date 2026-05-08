import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [PrismaModule, forwardRef(() => DiscordModule), AuthModule, AuditModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private analyticsService: AnalyticsService,
  ) {}

  onModuleInit() {
    // Set up lazy injection to avoid circular dependencies
    try {
      const discordGateway = this.moduleRef.get('DiscordGateway', { strict: false });
      if (discordGateway && typeof discordGateway.setAnalyticsService === 'function') {
        discordGateway.setAnalyticsService(this.analyticsService);
      }
    } catch (e) {
      // Service not available yet, will be set later
    }
  }
}

