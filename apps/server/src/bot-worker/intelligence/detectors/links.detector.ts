import { Injectable, Logger } from '@nestjs/common';

interface Check {
  detected: boolean;
  confidence: number;
  type: string;
  evidence?: any;
}

@Injectable()
export class LinksDetector {
  private readonly logger = new Logger(LinksDetector.name);
  private readonly suspiciousDomains = [
    'discord.gg',
    'discord.com/invite',
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'short.link',
  ];

  async detect(event: any): Promise<Check> {
    if (!event.data?.content) {
      return { detected: false, confidence: 0, type: 'SUSPICIOUS_LINK' };
    }

    const content = event.data.content;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];

    if (urls.length === 0) {
      return { detected: false, confidence: 0, type: 'SUSPICIOUS_LINK' };
    }

    // Check for suspicious domains
    const suspiciousUrls = urls.filter((url) =>
      this.suspiciousDomains.some((domain) => url.includes(domain)),
    );

    if (suspiciousUrls.length > 0) {
      return {
        detected: true,
        confidence: 60 + suspiciousUrls.length * 10,
        type: 'SUSPICIOUS_LINK',
        evidence: {
          urlCount: urls.length,
          suspiciousCount: suspiciousUrls.length,
          suspiciousUrls: suspiciousUrls.slice(0, 3), // First 3
        },
      };
    }

    // Check for multiple links (potential spam)
    if (urls.length > 3) {
      return {
        detected: true,
        confidence: 50,
        type: 'SUSPICIOUS_LINK',
        evidence: {
          urlCount: urls.length,
          reason: 'Multiple links detected',
        },
      };
    }

    return { detected: false, confidence: 0, type: 'SUSPICIOUS_LINK' };
  }
}

