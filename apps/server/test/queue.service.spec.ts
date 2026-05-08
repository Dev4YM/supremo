import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '../src/shared/queue/queue.service';
import { getQueueToken } from '@nestjs/bull';

describe('QueueService', () => {
  let service: QueueService;
  let actionsQueue: any;
  let incidentsQueue: any;
  let mlAnalysisQueue: any;

  beforeEach(async () => {
    actionsQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    incidentsQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-2' }),
    };
    mlAnalysisQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-3' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('actions'),
          useValue: actionsQueue,
        },
        {
          provide: getQueueToken('incidents'),
          useValue: incidentsQueue,
        },
        {
          provide: getQueueToken('ml-analysis'),
          useValue: mlAnalysisQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addAction', () => {
    it('should add action to queue with correct priority for high priority', async () => {
      const job = {
        type: 'execute_action' as const,
        payload: {
          type: 'timeout',
          guildId: 'test',
          userId: 'test',
          parameters: { duration: 3600 },
        },
        priority: 'high' as const,
      };

      await service.addAction(job);

      expect(actionsQueue.add).toHaveBeenCalledWith('execute_action', job.payload, {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });

    it('should add action with medium priority', async () => {
      const job = {
        type: 'execute_action' as const,
        payload: {
          type: 'warn',
          guildId: 'test',
          userId: 'test',
          parameters: {},
        },
        priority: 'medium' as const,
      };

      await service.addAction(job);

      expect(actionsQueue.add).toHaveBeenCalledWith('execute_action', job.payload, {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });

    it('should add action with low priority', async () => {
      const job = {
        type: 'execute_action' as const,
        payload: {
          type: 'log_only',
          guildId: 'test',
          userId: 'test',
          parameters: {},
        },
        priority: 'low' as const,
      };

      await service.addAction(job);

      expect(actionsQueue.add).toHaveBeenCalledWith('execute_action', job.payload, {
        priority: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });

    it('should handle critical priority actions', async () => {
      const job = {
        type: 'execute_action' as const,
        payload: {
          type: 'ban',
          guildId: 'test',
          userId: 'test',
          parameters: {},
        },
        priority: 'critical' as const,
      };

      await service.addAction(job);

      expect(actionsQueue.add).toHaveBeenCalledWith('execute_action', job.payload, {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });
  });

  describe('addIncident', () => {
    it('should add incident to queue with medium priority', async () => {
      const incident = {
        guildId: 'test-guild',
        type: 'MESSAGE_SPAM',
        severity: 'medium' as const,
        confidence: 75,
        evidence: {},
        recommendedActions: [],
      };

      await service.addIncident(incident, 'medium');

      expect(incidentsQueue.add).toHaveBeenCalledWith('create_incident', incident, {
        priority: 3,
        attempts: 3,
      });
    });

    it('should add critical incident with high priority', async () => {
      const incident = {
        guildId: 'test-guild',
        type: 'RAID_DETECTED',
        severity: 'critical' as const,
        confidence: 95,
        evidence: {},
        recommendedActions: [],
      };

      await service.addIncident(incident, 'critical');

      expect(incidentsQueue.add).toHaveBeenCalledWith('create_incident', incident, {
        priority: 1,
        attempts: 3,
      });
    });

    it('should add high severity incident with appropriate priority', async () => {
      const incident = {
        guildId: 'test-guild',
        type: 'TOXIC_CONTENT',
        severity: 'high' as const,
        confidence: 85,
        evidence: {},
        recommendedActions: [],
      };

      await service.addIncident(incident, 'high');

      expect(incidentsQueue.add).toHaveBeenCalledWith('create_incident', incident, {
        priority: 2,
        attempts: 3,
      });
    });

    it('should add low severity incident with lower priority', async () => {
      const incident = {
        guildId: 'test-guild',
        type: 'NEW_ACCOUNT',
        severity: 'low' as const,
        confidence: 40,
        evidence: {},
        recommendedActions: [],
      };

      await service.addIncident(incident, 'low');

      expect(incidentsQueue.add).toHaveBeenCalledWith('create_incident', incident, {
        priority: 5,
        attempts: 3,
      });
    });
  });

  describe('addMLAnalysis', () => {
    it('should add ML analysis job to queue', async () => {
      const analysis = {
        guildId: 'test-guild',
        userId: 'test-user',
        text: 'Sample text for analysis',
        type: 'toxicity' as const,
      };

      await service.addMLAnalysis(analysis);

      expect(mlAnalysisQueue.add).toHaveBeenCalledWith('analyze_text', analysis, {
        priority: 8,
        attempts: 2,
        timeout: 30000,
      });
    });

    it('should handle ML analysis with different types', async () => {
      const analysis = {
        guildId: 'test-guild',
        userId: 'test-user',
        text: 'Sample text',
        type: 'sentiment' as const,
      };

      await service.addMLAnalysis(analysis);

      expect(mlAnalysisQueue.add).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle queue errors gracefully', async () => {
      actionsQueue.add.mockRejectedValueOnce(new Error('Queue error'));

      const job = {
        type: 'execute_action' as const,
        payload: {
          type: 'timeout',
          guildId: 'test',
          userId: 'test',
          parameters: {},
        },
        priority: 'high' as const,
      };

      await expect(service.addAction(job)).rejects.toThrow('Queue error');
    });
  });
});

