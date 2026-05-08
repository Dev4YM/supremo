import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Throttler configuration factory
 * 
 * Note: Requires @nestjs/throttler package
 * Install with: npm install @nestjs/throttler
 * 
 * Then uncomment the ThrottlerModule import in api.module.ts
 */
export const throttlerConfig = (configService: ConfigService): ThrottlerModuleOptions => {
  const limit = parseInt(configService.get<string>('RATE_LIMIT_MAX', '100'), 10);
  const ttl = parseInt(configService.get<string>('RATE_LIMIT_WINDOW', '60'), 10) * 1000; // Convert to ms

  return {
    throttlers: [
      {
        name: 'default',
        limit,
        ttl,
      },
    ],
  };
};

