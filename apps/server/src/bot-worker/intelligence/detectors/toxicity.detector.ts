import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PerspectiveClient } from '../ml/perspective.client';

interface Check {
  detected: boolean;
  confidence: number;
  type: string;
  evidence?: any;
}

@Injectable()
export class ToxicityDetector {
  private readonly logger = new Logger(ToxicityDetector.name);
  private readonly enabled: boolean;
  private readonly apiKey?: string;
  private readonly threshold: number;

  constructor(
    private configService: ConfigService,
    private perspectiveClient: PerspectiveClient,
  ) {
    this.enabled = this.configService.get<string>('PERSPECTIVE_ENABLED', 'false') === 'true';
    this.apiKey = this.configService.get<string>('PERSPECTIVE_API_KEY');
    this.threshold = parseFloat(this.configService.get<string>('ML_CONFIDENCE_THRESHOLD', '70')) / 100;
  }

  async detect(text: string): Promise<Check> {
    if (!text || text.length < 3) {
      return { detected: false, confidence: 0, type: 'TOXIC_CONTENT' };
    }

    // Rule-based detection first (fast)
    const ruleBasedScore = this.ruleBasedDetection(text);

    // If ML is enabled and rule-based score is high, use ML
    if (this.enabled && this.apiKey && ruleBasedScore > 0.5) {
      try {
        const mlScore = await this.mlDetection(text);
        const combinedScore = Math.max(ruleBasedScore, mlScore);

        if (combinedScore >= this.threshold) {
          return {
            detected: true,
            confidence: Math.round(combinedScore * 100),
            type: 'TOXIC_CONTENT',
            evidence: {
              ruleBasedScore,
              mlScore,
              text: text.substring(0, 100), // First 100 chars
            },
          };
        }
      } catch (error) {
        this.logger.warn('ML detection failed, using rule-based:', error);
      }
    }

    // Use rule-based if ML not available or failed
    if (ruleBasedScore >= this.threshold) {
      return {
        detected: true,
        confidence: Math.round(ruleBasedScore * 100),
        type: 'TOXIC_CONTENT',
        evidence: {
          ruleBasedScore,
          text: text.substring(0, 100),
        },
      };
    }

    return { detected: false, confidence: 0, type: 'TOXIC_CONTENT' };
  }

  private ruleBasedDetection(text: string): number {
    const lowerText = text.toLowerCase();

    // Profanity patterns
    const profanityPatterns = [
      /\b(fuck|shit|damn|bitch|asshole|bastard)\b/gi,
      /\b(nigga|nigger|fag|faggot)\b/gi,
    ];

    let score = 0;

    for (const pattern of profanityPatterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        score += matches.length * 0.2;
      }
    }

    // All caps (shouting)
    if (text === text.toUpperCase() && text.length > 10) {
      score += 0.1;
    }

    // Excessive punctuation
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    if (exclamationCount > 5 || questionCount > 5) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private async mlDetection(text: string): Promise<number> {
    try {
      const toxicityScore = await this.perspectiveClient.analyzeToxicity(text);
      return toxicityScore;
    } catch (error) {
      this.logger.error('ML detection error:', error);
      return 0;
    }
  }
}

