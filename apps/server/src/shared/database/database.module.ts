import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

// Re-export PrismaModule for shared use
@Module({
  imports: [PrismaModule],
  exports: [PrismaModule],
})
export class DatabaseModule {}


