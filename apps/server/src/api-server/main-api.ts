import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiModule } from './api.module';
import cookieParser from 'cookie-parser';
import { validateEnv } from '../config/env.validation';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

// Handle BigInt serialization for JSON responses
const originalJsonStringify = JSON.stringify;
JSON.stringify = function(value: any, replacer?: any, space?: any) {
  return originalJsonStringify(value, (key, val) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    return val;
  }, space);
};

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(ApiModule);

  // CORS configuration
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const corsOptions = isDevelopment
    ? {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Guild-Id'],
      }
    : {
        origin: process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
          : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Guild-Id'],
      };

  app.enableCors(corsOptions);
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation setup
  const config = new DocumentBuilder()
    .setTitle('Supremo Discord Bot API')
    .setDescription(
      'Comprehensive Discord moderation and automation platform API. ' +
      'All server-related endpoints require a guild ID via x-guild-id header or guildId query parameter.'
    )
    .setVersion('1.0')
    .addCookieAuth('session_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'session_token',
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-guild-id',
        description: 'Guild ID for server-related endpoints',
      },
      'guild-id',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('guilds', 'Guild management')
    .addTag('users', 'User management')
    .addTag('incidents', 'Incident management')
    .addTag('actions', 'Moderation actions')
    .addTag('cases', 'Case management')
    .addTag('tickets', 'Support tickets')
    .addTag('trust-reputation', 'Trust & reputation system')
    .addTag('onboarding', 'Member onboarding')
    .addTag('anti-raid', 'Anti-raid protection')
    .addTag('auto-mod', 'Auto-moderation')
    .addTag('analytics', 'Analytics & insights')
    .addTag('automation', 'Workflow automation')
    .addTag('commands', 'Bot commands')
    .addTag('messages', 'Message management')
    .addTag('server', 'Server information')
    .addTag('discord', 'Discord API integration')
    .addTag('configuration', 'Configuration management')
    .addTag('jobs', 'Scheduled jobs')
    .addTag('cache-manager', 'Cache management')
    .addTag('debug', 'Debug & monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Supremo API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  const logger = new Logger('API Server');
  logger.log(`🚀 API Server running on http://localhost:${port}`);
  logger.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();


