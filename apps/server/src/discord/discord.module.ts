import { Module, forwardRef } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordGateway } from './discord.gateway';
import { DiscordController } from './discord.controller';
import { MessageHandlerService } from './message-handler.service';
import { WelcomeService } from './welcome.service';
import { MessageBuilderService } from '../messaging/message-builder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ModerationModule } from '../moderation/moderation.module';
import { UsersModule } from '../users/users.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { AutomationModule } from '../automation/automation.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../shared/queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    forwardRef(() => CacheManagerModule),
    ModerationModule,
    UsersModule,
    forwardRef(() =>ConfigurationModule),
    forwardRef(() => AutomationModule),
    AuthModule,
  ],
  controllers: [DiscordController],
  providers: [DiscordService, DiscordGateway, MessageHandlerService, WelcomeService, MessageBuilderService],
  exports: [DiscordService, DiscordGateway],
})
export class DiscordModule {}

