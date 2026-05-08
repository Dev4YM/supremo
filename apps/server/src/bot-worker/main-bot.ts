import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BotModule } from './bot.module';
import { validateEnv } from '../config/env.validation';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.createApplicationContext(BotModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bot Worker');
  logger.log('🤖 Bot Worker started');
  logger.log('📡 Listening for Discord events and queue jobs...');

  // Keep the application running
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start bot worker:', error);
  process.exit(1);
});


