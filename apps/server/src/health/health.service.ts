import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Redis client for health checks
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      // If REDIS_URL is provided but doesn't include password, inject it
      if (redisPassword && redisPassword.trim() !== '' && !redisUrl.includes('@')) {
        try {
          const url = new URL(redisUrl);
          // Reconstruct URL with password: redis://:password@host:port
          const urlWithPassword = `${url.protocol}//:${redisPassword}@${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
          this.redisClient = new Redis(urlWithPassword, {
            retryStrategy: () => null,
            maxRetriesPerRequest: 1,
          });
        } catch (error) {
          // If URL parsing fails, fall back to object config
          this.redisClient = new Redis({
            host: redisHost || 'localhost',
            port: redisPort,
            password: redisPassword,
            retryStrategy: () => null,
            maxRetriesPerRequest: 1,
          });
        }
      } else {
        this.redisClient = new Redis(redisUrl, {
          retryStrategy: () => null,
          maxRetriesPerRequest: 1,
        });
      }
    } else if (redisHost) {
      const redisConfig: any = {
        host: redisHost,
        port: redisPort,
        retryStrategy: () => null, // Don't retry for health checks
        maxRetriesPerRequest: 1,
      };
      
      // Only include password if it's actually set and not empty
      if (redisPassword && redisPassword.trim() !== '') {
        redisConfig.password = redisPassword;
      }
      
      this.redisClient = new Redis(redisConfig);
    }
  }

  async checkDatabase(): Promise<{ status: string; latency?: number }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'error',
      };
    }
  }

  async checkRedis(): Promise<{ status: string; latency?: number }> {
    if (!this.redisClient) {
      return {
        status: 'not_configured',
      };
    }

    try {
      const start = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - start;

      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'error',
      };
    }
  }

  async checkDiscord(): Promise<{ status: string }> {
    // Discord connection check would require DiscordService
    // For now, just check if bot token is configured
    const botToken = this.configService.get<string>('DISCORD_BOT_TOKEN');
    
    if (!botToken) {
      return {
        status: 'not_configured',
      };
    }

    // In a real implementation, you'd ping Discord API
    return {
      status: 'ok',
    };
  }

  async getHealthStatus(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    checks: {
      database: { status: string; latency?: number };
      redis: { status: string; latency?: number };
      discord: { status: string };
    };
  }> {
    const [database, redis, discord] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiscord(),
    ]);

    const allHealthy =
      database.status === 'ok' &&
      (redis.status === 'ok' || redis.status === 'not_configured') &&
      (discord.status === 'ok' || discord.status === 'not_configured');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database,
        redis,
        discord,
      },
    };
  }

  async getReadiness(): Promise<{ ready: boolean; checks: Record<string, boolean> }> {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();

    const checks = {
      database: database.status === 'ok',
      redis: redis.status === 'ok' || redis.status === 'not_configured',
    };

    const ready = checks.database && checks.redis;

    return {
      ready,
      checks,
    };
  }
}

