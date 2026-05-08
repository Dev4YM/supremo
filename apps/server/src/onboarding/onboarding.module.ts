import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [PrismaModule, forwardRef(() => DiscordModule), AuthModule, AuditModule],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private onboardingService: OnboardingService,
  ) {}

  onModuleInit() {
    // Set up lazy injection to avoid circular dependencies
    try {
      const welcomeService = this.moduleRef.get('WelcomeService', { strict: false });
      if (welcomeService && typeof welcomeService.setOnboardingService === 'function') {
        welcomeService.setOnboardingService(this.onboardingService);
      }
    } catch (e) {
      // Service not available yet, will be set later
    }
  }
}

