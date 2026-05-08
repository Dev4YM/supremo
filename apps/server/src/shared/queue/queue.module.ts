import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { ActionProcessor } from './processors/action.processor';
import { IncidentProcessor } from './processors/incident.processor';
import { MLAnalysisProcessor } from './processors/ml-analysis.processor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        
        if (redisUrl) {
          // If REDIS_URL is provided, check if it includes password
          // If password is set in env but not in URL, inject it
          if (redisPassword && redisPassword.trim() !== '' && !redisUrl.includes('@')) {
            // Parse URL and inject password
            try {
              const url = new URL(redisUrl);
              // Reconstruct URL with password: redis://:password@host:port
              const urlWithPassword = `${url.protocol}//:${redisPassword}@${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
              return {
                redis: urlWithPassword,
              };
            } catch (error) {
              // If URL parsing fails, fall back to object config
            }
          }
          // Use REDIS_URL as-is (either has password or doesn't need it)
          return {
            redis: redisUrl,
          };
        }
        
        // Otherwise use individual config
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        
        const redisConfig: any = {
          host: redisHost,
          port: redisPort,
        };
        
        // Only include password if it's actually set and not empty
        if (redisPassword && redisPassword.trim() !== '') {
          redisConfig.password = redisPassword;
        }
        
        return {
          redis: redisConfig,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: 'actions',
      },
      {
        name: 'incidents',
      },
      {
        name: 'ml-analysis',
      },
    ),
  ],
  providers: [QueueService, ActionProcessor, IncidentProcessor, MLAnalysisProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

