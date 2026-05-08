import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { AuthModule } from '../auth/auth.module';
import { AutoModService } from './auto-mod.service';
import { AutoModController } from './auto-mod.controller';

@Module({
  imports: [PrismaModule, DiscordModule, AuthModule],
  providers: [AutoModService],
  controllers: [AutoModController],
  exports: [AutoModService],
})
export class AutoModModule {}

