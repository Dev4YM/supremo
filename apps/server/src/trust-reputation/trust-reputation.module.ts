import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { TrustReputationService } from './trust-reputation.service';
import { TrustReputationController } from './trust-reputation.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, DiscordModule, AuthModule, AuditModule],
  providers: [TrustReputationService],
  controllers: [TrustReputationController],
  exports: [TrustReputationService],
})
export class TrustReputationModule {}

