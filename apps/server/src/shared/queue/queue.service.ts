import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface ActionQueueJob {
  type: 'execute_action' | 'create_incident' | 'ml_analyze';
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('actions') private actionsQueue: Queue,
    @InjectQueue('incidents') private incidentsQueue: Queue,
    @InjectQueue('ml-analysis') private mlAnalysisQueue: Queue,
  ) {}

  async addAction(job: ActionQueueJob) {
    const priorityMap = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    return this.actionsQueue.add('execute_action', job.payload, {
      priority: priorityMap[job.priority],
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async addIncident(incident: any, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium') {
    const priorityMap = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    return this.incidentsQueue.add('create_incident', incident, {
      priority: priorityMap[priority],
      attempts: 3,
    });
  }

  async addMLAnalysis(data: any) {
    return this.mlAnalysisQueue.add('analyze', data, {
      attempts: 2,
      timeout: 10000, // 10 second timeout for ML analysis
    });
  }

  getActionsQueue(): Queue {
    return this.actionsQueue;
  }

  getIncidentsQueue(): Queue {
    return this.incidentsQueue;
  }

  getMLAnalysisQueue(): Queue {
    return this.mlAnalysisQueue;
  }
}


