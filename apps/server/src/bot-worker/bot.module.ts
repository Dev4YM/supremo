import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../shared/queue/queue.module';
import { DatabaseModule } from '../shared/database/database.module';
import { DiscordModule } from '../discord/discord.module';
import { ModerationModule } from '../moderation/moderation.module';
import { UsersModule } from '../users/users.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { AutomationModule } from '../automation/automation.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { AntiRaidModule } from '../anti-raid/anti-raid.module';
import { AutoModModule } from '../auto-mod/auto-mod.module';
import { TrustReputationModule } from '../trust-reputation/trust-reputation.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MessagingModule } from '../messaging/messaging.module';
import { CommandsModule } from '../commands/commands.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { BotBootstrapService } from './bot-bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    DatabaseModule,
    QueueModule,
    CacheManagerModule,
    DiscordModule,
    ModerationModule,
    UsersModule,
    ConfigurationModule,
    AutomationModule,
    AntiRaidModule,
    AutoModModule,
    TrustReputationModule,
    OnboardingModule,
    AnalyticsModule,
    MessagingModule,
    CommandsModule,
    IntelligenceModule,
  ],
  providers: [BotBootstrapService],
})
export class BotModule {}

