import { Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { CacheManagerController } from './cache-manager.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CacheManagerController],
  providers: [CacheManagerService],
  exports: [CacheManagerService],
})
export class CacheManagerModule {}

