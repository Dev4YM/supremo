import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DiscordService } from '../discord/discord.service';
import { ActionProcessor } from '../shared/queue/processors/action.processor';
import { IntelligenceService } from './intelligence/intelligence.service';
import { MLAnalysisProcessor } from '../shared/queue/processors/ml-analysis.processor';

@Injectable()
export class BotBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BotBootstrapService.name);

  constructor(
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing Bot Worker services...');

    // Wire up DiscordService to ActionProcessor
    await this.wireActionProcessor();

    // Wire up IntelligenceService to MLAnalysisProcessor
    await this.wireMLProcessor();

    this.logger.log('✅ Bot Worker services initialized successfully');
  }

  private async wireActionProcessor() {
    try {
      const actionProcessor = this.moduleRef.get(ActionProcessor, { strict: false });
      const discordService = this.moduleRef.get(DiscordService, { strict: false });
      
      if (actionProcessor && discordService) {
        actionProcessor.setDiscordService(discordService);
        this.logger.log('✅ DiscordService wired to ActionProcessor');
      } else {
        this.logger.warn('⚠️  Could not wire ActionProcessor (services not found)');
      }
    } catch (error) {
      this.logger.error('❌ Error wiring ActionProcessor:', error);
    }
  }

  private async wireMLProcessor() {
    try {
      const mlProcessor = this.moduleRef.get(MLAnalysisProcessor, { strict: false });
      const intelligenceService = this.moduleRef.get(IntelligenceService, { strict: false });
      
      if (mlProcessor && intelligenceService) {
        mlProcessor.setIntelligenceService(intelligenceService);
        this.logger.log('✅ IntelligenceService wired to MLAnalysisProcessor');
      } else {
        this.logger.warn('⚠️  Could not wire MLAnalysisProcessor (services not found)');
      }
    } catch (error) {
      this.logger.error('❌ Error wiring MLAnalysisProcessor:', error);
    }
  }
}


