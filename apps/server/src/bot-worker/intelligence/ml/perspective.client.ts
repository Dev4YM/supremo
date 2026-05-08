import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Perspective API client for ML-powered toxicity detection
 * Documentation: https://developers.perspectiveapi.com/
 */
@Injectable()
export class PerspectiveClient {
  private readonly logger = new Logger(PerspectiveClient.name);
  private readonly apiKey?: string;
  private readonly enabled: boolean;
  private readonly apiUrl = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PERSPECTIVE_API_KEY');
    this.enabled =
      this.configService.get<string>('PERSPECTIVE_ENABLED', 'false') === 'true' &&
      !!this.apiKey;

    if (!this.enabled && this.configService.get<string>('PERSPECTIVE_ENABLED') === 'true') {
      this.logger.warn('Perspective API enabled but API key not found');
    }
  }

  async analyzeToxicity(text: string): Promise<number> {
    if (!this.enabled || !this.apiKey) {
      return 0;
    }

    if (!text || text.length < 3) {
      return 0;
    }

    try {
      const url = `${this.apiUrl}?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: { text },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {},
            IDENTITY_ATTACK: {},
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Perspective API error: ${response.status} - ${errorText}`);
        return 0;
      }

      const data = await response.json();
      
      // Get toxicity score (0-1 scale)
      const toxicityScore =
        data.attributeScores?.TOXICITY?.summaryScore?.value || 0;
      
      // Also consider severe toxicity
      const severeToxicityScore =
        data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0;
      
      // Use the higher of the two scores
      const finalScore = Math.max(toxicityScore, severeToxicityScore);
      
      return finalScore;
    } catch (error) {
      this.logger.error('Error calling Perspective API:', error);
      return 0;
    }
  }

  async analyzeDetailed(text: string): Promise<{
    toxicity: number;
    severeToxicity: number;
    insult: number;
    profanity: number;
    threat: number;
    identityAttack: number;
  }> {
    if (!this.enabled || !this.apiKey) {
      return {
        toxicity: 0,
        severeToxicity: 0,
        insult: 0,
        profanity: 0,
        threat: 0,
        identityAttack: 0,
      };
    }

    try {
      const url = `${this.apiUrl}?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: { text },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {},
            IDENTITY_ATTACK: {},
          },
        }),
      });

      if (!response.ok) {
        return {
          toxicity: 0,
          severeToxicity: 0,
          insult: 0,
          profanity: 0,
          threat: 0,
          identityAttack: 0,
        };
      }

      const data = await response.json();
      
      return {
        toxicity: data.attributeScores?.TOXICITY?.summaryScore?.value || 0,
        severeToxicity: data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0,
        insult: data.attributeScores?.INSULT?.summaryScore?.value || 0,
        profanity: data.attributeScores?.PROFANITY?.summaryScore?.value || 0,
        threat: data.attributeScores?.THREAT?.summaryScore?.value || 0,
        identityAttack: data.attributeScores?.IDENTITY_ATTACK?.summaryScore?.value || 0,
      };
    } catch (error) {
      this.logger.error('Error calling Perspective API:', error);
      return {
        toxicity: 0,
        severeToxicity: 0,
        insult: 0,
        profanity: 0,
        threat: 0,
        identityAttack: 0,
      };
    }
  }
}

