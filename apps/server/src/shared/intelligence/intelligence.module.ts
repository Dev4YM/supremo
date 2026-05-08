import { Module } from '@nestjs/common';
import { UserIntelligenceService } from './user-intelligence.service';
import { LearningService } from './learning.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserIntelligenceService, LearningService],
  exports: [UserIntelligenceService, LearningService],
})
export class SharedIntelligenceModule {}

