import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { RealtimeGateway } from './realtime.gateway';
import { IncidentProcessor } from '../../shared/queue/processors/incident.processor';

@Injectable()
export class WebsocketBootstrapService implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    // Wire up RealtimeGateway to IncidentProcessor
    try {
      const incidentProcessor = this.moduleRef.get(IncidentProcessor, { strict: false });
      const realtimeGateway = this.moduleRef.get(RealtimeGateway, { strict: false });
      
      if (incidentProcessor && realtimeGateway) {
        incidentProcessor.setRealtimeGateway(realtimeGateway);
      }
    } catch (error) {
      // Silently fail if processors aren't available (e.g., in bot worker)
    }
  }
}


