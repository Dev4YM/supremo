import { Module, Global, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DebugService } from './debug.service';
import { DebugController } from './debug.controller';
import { DebugInterceptor } from './debug.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { setDebugService } from './debug.helper';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    DebugService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DebugInterceptor,
    },
  ],
  controllers: [DebugController],
  exports: [DebugService],
})
export class DebugModule implements OnModuleInit {
  constructor(private readonly debugService: DebugService) {}

  onModuleInit() {
    setDebugService(this.debugService);
  }
}

