import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Custom rate limiter guard that respects environment configuration
 * 
 * Note: Requires @nestjs/throttler package
 * Install with: npm install @nestjs/throttler
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: any,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting for health checks
    const request = context.switchToHttp().getRequest();
    if (request.url?.startsWith('/health') || request.url?.startsWith('/api/health')) {
      return true;
    }

    return super.canActivate(context);
  }

  protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: any): Promise<void> {
    throw new ThrottlerException('Too many requests, please try again later');
  }
}

