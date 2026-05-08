import { Module } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { ScoringService } from './scoring.service';
import { SpamDetector } from './detectors/spam.detector';
import { ToxicityDetector } from './detectors/toxicity.detector';
import { LinksDetector } from './detectors/links.detector';
import { RaidDetector } from './detectors/raid.detector';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { PerspectiveClient } from './ml/perspective.client';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [
    IntelligenceService,
    ScoringService,
    SpamDetector,
    ToxicityDetector,
    LinksDetector,
    RaidDetector,
    PerspectiveClient,
  ],
  exports: [IntelligenceService, ScoringService],
})
export class IntelligenceModule {}

