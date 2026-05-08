import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { AntiRaidService } from './anti-raid.service';
import { AntiRaidController } from './anti-raid.controller';
import { AutoModModule } from '../auto-mod/auto-mod.module';
import { AuthModule } from '../auth/auth.module';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [PrismaModule, forwardRef(() => DiscordModule), AutoModModule, AuthModule],
  providers: [AntiRaidService],
  controllers: [AntiRaidController],
  exports: [AntiRaidService],
})
export class AntiRaidModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private antiRaidService: AntiRaidService,
  ) {}

  onModuleInit() {
    // Set up lazy injection to avoid circular dependencies
    try {
      const discordGateway = this.moduleRef.get('DiscordGateway', { strict: false });
      if (discordGateway && typeof discordGateway.setAntiRaidService === 'function') {
        discordGateway.setAntiRaidService(this.antiRaidService);
      }

      const welcomeService = this.moduleRef.get('WelcomeService', { strict: false });
      if (welcomeService && typeof welcomeService.setAntiRaidService === 'function') {
        welcomeService.setAntiRaidService(this.antiRaidService);
      }

      const autoModService = this.moduleRef.get('AutoModService', { strict: false });
      const messageHandler = this.moduleRef.get('MessageHandlerService', { strict: false });
      if (messageHandler && autoModService && typeof messageHandler.setAutoModService === 'function') {
        messageHandler.setAutoModService(autoModService);
      }
    } catch (e) {
      // Services not available yet, will be set later
    }
  }
}
