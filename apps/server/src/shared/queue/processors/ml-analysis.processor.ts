import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { IntelligenceService } from '../../../bot-worker/intelligence/intelligence.service';

@Processor('ml-analysis')
export class MLAnalysisProcessor {
  private readonly logger = new Logger(MLAnalysisProcessor.name);
  private intelligenceService: IntelligenceService | null = null;

  setIntelligenceService(service: IntelligenceService) {
    this.intelligenceService = service;
  }

  @Process('analyze')
  async handleAnalysis(job: Job<any>) {
    this.logger.log(`Processing ML analysis job ${job.id}`);
    
    try {
      if (!this.intelligenceService) {
        this.logger.warn('IntelligenceService not available, skipping analysis');
        return { success: false, error: 'IntelligenceService not available' };
      }

      const { event } = job.data;
      
      // Analyze the event
      const result = await this.intelligenceService.analyzeEvent(event);
      
      this.logger.debug(`Analysis result: ${result.detected ? 'detected' : 'safe'}`);
      
      return { success: true, jobId: job.id, result };
    } catch (error) {
      this.logger.error(`Error processing ML analysis job ${job.id}:`, error);
      throw error;
    }
  }
}

