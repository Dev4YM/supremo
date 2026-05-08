import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { RuleEngineService } from './rule-engine.service';
import { IncidentsModule } from '../incidents/incidents.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';

@Module({
  imports: [IncidentsModule, TrustScoreModule],
  providers: [ModerationService, RuleEngineService],
  exports: [ModerationService, RuleEngineService],
})
export class ModerationModule {}

