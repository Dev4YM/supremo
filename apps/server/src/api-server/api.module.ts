import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../shared/queue/queue.module';
import { DatabaseModule } from '../shared/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { GuildsModule } from '../guilds/guilds.module';
import { AuditModule } from '../audit/audit.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { UsersModule } from '../users/users.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ActionsModule } from '../actions/actions.module';
import { MessagesModule } from '../messages/messages.module';
import { ServerModule } from '../server/server.module';
import { AutomationModule } from '../automation/automation.module';
import { JobsModule } from '../jobs/jobs.module';
import { CommandsModule } from '../commands/commands.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { SeedManagerModule } from '../seed-manager/seed-manager.module';
import { AntiRaidModule } from '../anti-raid/anti-raid.module';
import { AutoModModule } from '../auto-mod/auto-mod.module';
import { CasesModule } from '../cases/cases.module';
import { TrustReputationModule } from '../trust-reputation/trust-reputation.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DebugModule } from '../debug/debug.module';
import { ApiModule as ApiControllerModule } from '../api/api.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from '../health/health.module';
import { SetupModule } from '../setup/setup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    DatabaseModule,
    QueueModule,
    DebugModule,
    SeedManagerModule,
    SetupModule,
    CacheManagerModule,
    AuthModule,
    GuildsModule,
    AuditModule,
    IncidentsModule,
    UsersModule,
    ConfigurationModule,
    ActionsModule,
    ApiControllerModule,
    MessagesModule,
    ServerModule,
    AutomationModule,
    JobsModule,
    CommandsModule,
    AntiRaidModule,
    AutoModModule,
    CasesModule,
    TrustReputationModule,
    OnboardingModule,
    TicketsModule,
    AnalyticsModule,
    WebsocketModule,
    HealthModule,
  ],
})
export class ApiModule {}


