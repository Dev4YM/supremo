import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { CommandsController } from './commands.controller';
import { CommandHandlerService } from './command-handler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { ActionsModule } from '../actions/actions.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [PrismaModule, forwardRef(() => DiscordModule), forwardRef(() => ActionsModule), AuthModule, AuditModule],
  controllers: [CommandsController],
  providers: [CommandsService, CommandHandlerService],
  exports: [CommandsService, CommandHandlerService],
})
export class CommandsModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private commandHandler: CommandHandlerService,
  ) {}

  onModuleInit() {
    // Set command handler in global scope for Discord service
    (global as any).commandHandler = this.commandHandler;
    
    // Inject command handler into Discord gateway
    try {
      const discordGateway = this.moduleRef.get('DiscordGateway', { strict: false });
      if (discordGateway && typeof discordGateway.setCommandHandler === 'function') {
        discordGateway.setCommandHandler(this.commandHandler);
      }
    } catch (e) {
      // Gateway not available yet, will be set via global
    }
  }
}

