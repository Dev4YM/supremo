import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SeedManagerModule } from '../seed-manager/seed-manager.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [PrismaModule, AuthModule, SeedManagerModule, DiscordModule],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}

