import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { DiscordModule } from './discord/discord.module';
import { ModerationModule } from './moderation/moderation.module';
import { IncidentsModule } from './incidents/incidents.module';
import { UsersModule } from './users/users.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { ActionsModule } from './actions/actions.module';
import { TrustScoreModule } from './trust-score/trust-score.module';
import { ApiModule } from './api/api.module';
import { MessagesModule } from './messages/messages.module';
import { ServerModule } from './server/server.module';
import { AutomationModule } from './automation/automation.module';
import { JobsModule } from './jobs/jobs.module';
import { MessagingModule } from './messaging/messaging.module';
import { CommandsModule } from './commands/commands.module';
import { CacheManagerModule } from './cache-manager/cache-manager.module';
import { SeedManagerModule } from './seed-manager/seed-manager.module';
import { AuthModule } from './auth/auth.module';
import { GuildsModule } from './guilds/guilds.module';
import { AuditModule } from './audit/audit.module';
import { AntiRaidModule } from './anti-raid/anti-raid.module';
import { AutoModModule } from './auto-mod/auto-mod.module';
import { CasesModule } from './cases/cases.module';
import { TrustReputationModule } from './trust-reputation/trust-reputation.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TicketsModule } from './tickets/tickets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DebugModule } from './debug/debug.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    DebugModule,
    SeedManagerModule,
    CacheManagerModule,
    DiscordModule,
    ModerationModule,
    IncidentsModule,
    UsersModule,
    ConfigurationModule,
    ActionsModule,
    TrustScoreModule,
    ApiModule,
    MessagesModule,
    ServerModule,
    AutomationModule,
    JobsModule,
    MessagingModule,
    CommandsModule,
    AuthModule,
    GuildsModule,
    AuditModule,
    AntiRaidModule,
    AutoModModule,
    CasesModule,
    TrustReputationModule,
    OnboardingModule,
    TicketsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}

