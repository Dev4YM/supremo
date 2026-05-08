import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DiscordModule } from '../discord/discord.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => DiscordModule), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

