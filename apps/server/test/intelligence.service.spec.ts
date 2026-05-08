import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntelligenceService } from '../src/bot-worker/intelligence/intelligence.service';
import { SpamDetector } from '../src/bot-worker/intelligence/detectors/spam.detector';
import { ToxicityDetector } from '../src/bot-worker/intelligence/detectors/toxicity.detector';
import { LinksDetector } from '../src/bot-worker/intelligence/detectors/links.detector';
import { RaidDetector } from '../src/bot-worker/intelligence/detectors/raid.detector';
import { ScoringService } from '../src/bot-worker/intelligence/scoring.service';
import { QueueService } from '../src/shared/queue/queue.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PerspectiveClient } from '../src/bot-worker/intelligence/ml/perspective.client';

describe('IntelligenceService', () => {
  let service: IntelligenceService;
  let spamDetector: SpamDetector;
  let toxicityDetector: ToxicityDetector;
  let linksDetector: LinksDetector;
  let raidDetector: RaidDetector;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    const mockQueueService = {
      addIncident: jest.fn(),
      addMLAnalysis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        SpamDetector,
        ToxicityDetector,
        LinksDetector,
        RaidDetector,
        ScoringService,
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PERSPECTIVE_ENABLED') return 'false';
              if (key === 'ML_CONFIDENCE_THRESHOLD') return '70';
              return undefined;
            }),
          },
        },
        {
          provide: PerspectiveClient,
          useValue: {
            analyzeToxicity: jest.fn().mockResolvedValue(0.5),
          },
        },
      ],
    }).compile();

    service = module.get<IntelligenceService>(IntelligenceService);
    spamDetector = module.get<SpamDetector>(SpamDetector);
    toxicityDetector = module.get<ToxicityDetector>(ToxicityDetector);
    linksDetector = module.get<LinksDetector>(LinksDetector);
    raidDetector = module.get<RaidDetector>(RaidDetector);
    queueService = module.get(QueueService) as jest.Mocked<QueueService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeEvent', () => {
    it('should return safe result for normal message', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'Hello, this is a normal message',
          channelId: 'test-channel',
        },
      };

      // Mock all detectors to return safe
      jest.spyOn(spamDetector, 'detect').mockResolvedValue({
        detected: false,
        confidence: 0,
        type: 'MESSAGE_SPAM',
      });

      const result = await service.analyzeEvent(event);

      expect(result.safe).toBe(true);
      expect(result.detected).toBeUndefined();
    });

    it('should detect spam messages', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'spam spam spam spam spam',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(spamDetector, 'detect').mockResolvedValue({
        detected: true,
        confidence: 80,
        type: 'MESSAGE_SPAM',
        evidence: { messageCount: 5 },
      });

      const result = await service.analyzeEvent(event);

      expect(result.detected).toBe(true);
      expect(result.type).toBe('MESSAGE_SPAM');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect toxic content', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'This is toxic content',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(toxicityDetector, 'detect').mockResolvedValue({
        detected: true,
        confidence: 85,
        type: 'TOXIC_CONTENT',
        evidence: { text: 'This is toxic content' },
      });

      const result = await service.analyzeEvent(event);

      expect(result.detected).toBe(true);
      expect(result.type).toBe('TOXIC_CONTENT');
    });

    it('should detect suspicious links', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'Check out this link: http://suspicious-site.com',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(linksDetector, 'detect').mockResolvedValue({
        detected: true,
        confidence: 70,
        type: 'SUSPICIOUS_LINK',
        evidence: { url: 'http://suspicious-site.com' },
      });

      const result = await service.analyzeEvent(event);

      expect(result.detected).toBe(true);
      expect(result.type).toBe('SUSPICIOUS_LINK');
    });

    it('should detect raid patterns', async () => {
      const event = {
        type: 'member_join' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          accountCreated: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        },
      };

      jest.spyOn(raidDetector, 'detectRaid').mockResolvedValue({
        detected: true,
        confidence: 90,
        type: 'RAID_DETECTED',
        evidence: { joinRate: 10 },
      });

      const result = await service.analyzeEvent(event);

      expect(result.detected).toBe(true);
      expect(result.type).toBe('RAID_DETECTED');
    });

    it('should queue incident for high confidence detections', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'spam spam spam',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(spamDetector, 'detect').mockResolvedValue({
        detected: true,
        confidence: 90,
        type: 'MESSAGE_SPAM',
        evidence: { messageCount: 10 },
      });

      await service.analyzeEvent(event);

      expect(queueService.addIncident).toHaveBeenCalled();
    });

    it('should calculate confidence score correctly', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'test message',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(spamDetector, 'detect').mockResolvedValue({
        detected: true,
        confidence: 80,
        type: 'MESSAGE_SPAM',
      });

      jest.spyOn(toxicityDetector, 'detect').mockResolvedValue({
        detected: true,
        confidence: 70,
        type: 'TOXIC_CONTENT',
      });

      const result = await service.analyzeEvent(event);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should determine severity correctly', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'test',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(raidDetector, 'detectRaid').mockResolvedValue({
        detected: true,
        confidence: 95,
        type: 'RAID_DETECTED',
      });

      const result = await service.analyzeEvent(event);

      expect(result.severity).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(result.severity);
    });

    it('should recommend actions based on severity', async () => {
      const event = {
        type: 'message' as const,
        guildId: 'test-guild',
        userId: 'test-user',
        data: {
          content: 'test',
          channelId: 'test-channel',
        },
      };

      jest.spyOn(raidDetector, 'detectRaid').mockResolvedValue({
        detected: true,
        confidence: 95,
        type: 'RAID_DETECTED',
      });

      const result = await service.analyzeEvent(event);

      expect(result.recommendedActions).toBeDefined();
      expect(Array.isArray(result.recommendedActions)).toBe(true);
    });
  });
});

