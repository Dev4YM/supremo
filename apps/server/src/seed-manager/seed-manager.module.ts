import { Module } from '@nestjs/common';
import { SeedManagerService } from './seed-manager.service';
import { SeedManagerController } from './seed-manager.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SeedManagerController],
  providers: [SeedManagerService],
  exports: [SeedManagerService],
})
export class SeedManagerModule {}

