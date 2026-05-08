import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvConfig {
  // Required
  DATABASE_URL: string;
  DISCORD_BOT_TOKEN?: string; // Only required for bot worker
  
  // Recommended
  SESSION_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  
  // Optional
  PROCESS_TYPE?: string; // 'api' | 'bot' | 'all'
  API_PORT?: string;
  WS_PORT?: string;
  NODE_ENV?: string;
  CORS_ORIGINS?: string;
  /** Base URL of the Next.js app (Discord OAuth GET callback redirects here). */
  WEB_URL?: string;
  FRONTEND_URL?: string;
  /** Force session cookie Secure flag: 'true' | 'false' | omit (defaults: true in production). */
  COOKIE_SECURE?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_URL?: string;
  LOG_LEVEL?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW?: string;
}

/**
 * Validates required environment variables on startup
 */
export function validateEnv(): EnvConfig {
  const processType = process.env.PROCESS_TYPE || 'all';
  
  const required = ['DATABASE_URL'];
  
  // DISCORD_BOT_TOKEN only required for bot worker or all mode
  if (processType === 'bot' || processType === 'all') {
    required.push('DISCORD_BOT_TOKEN');
  }

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error(`Process type: ${processType}`);
    logger.error('Please check your .env file or copy .env.example to .env');
    process.exit(1);
  }
  
  // Validate PROCESS_TYPE
  const validProcessTypes = ['api', 'bot', 'all'];
  if (process.env.PROCESS_TYPE && !validProcessTypes.includes(process.env.PROCESS_TYPE)) {
    logger.warn(`Invalid PROCESS_TYPE: ${process.env.PROCESS_TYPE}. Should be one of: ${validProcessTypes.join(', ')}`);
    logger.warn('Defaulting to "all"');
    process.env.PROCESS_TYPE = 'all';
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    logger.warn('DATABASE_URL should start with postgresql://');
  }

  // Warn about optional but recommended variables
  const recommended = [
    'SESSION_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'WEB_URL',
  ];

  const missingRecommended: string[] = [];

  for (const key of recommended) {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  }

  if (missingRecommended.length > 0) {
    logger.warn(`Recommended environment variables not set: ${missingRecommended.join(', ')}`);
    logger.warn('Some features may not work correctly without these variables');
    logger.warn('OAuth login and session management require SESSION_SECRET, DISCORD_CLIENT_ID, and DISCORD_CLIENT_SECRET');
  }

  if (!process.env.WEB_URL?.trim() && !process.env.FRONTEND_URL?.trim()) {
    logger.warn(
      'WEB_URL (or FRONTEND_URL) is not set; Discord OAuth GET /api/auth/discord/callback will redirect to http://localhost:7634/auth/callback',
    );
  }

  // Validate SESSION_SECRET format if provided
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32) {
      logger.warn('SESSION_SECRET should be at least 32 characters long for security');
      logger.warn('Generate a secure secret: openssl rand -base64 32');
    }
  } else {
    logger.error('SESSION_SECRET is required for production. Set it in your .env file');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Validate API_PORT if provided
  if (process.env.API_PORT) {
    const port = parseInt(process.env.API_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      logger.error(`Invalid API_PORT: ${process.env.API_PORT}. Must be between 1 and 65535`);
      process.exit(1);
    }
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    logger.warn(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Should be one of: ${validEnvs.join(', ')}`);
  }

  // Validate CORS_ORIGINS format if provided
  if (process.env.CORS_ORIGINS) {
    const origins = process.env.CORS_ORIGINS.split(',');
    const invalidOrigins = origins.filter(origin => {
      const trimmed = origin.trim();
      return !trimmed.startsWith('http://') && !trimmed.startsWith('https://');
    });
    if (invalidOrigins.length > 0) {
      logger.warn(`Invalid CORS origins detected: ${invalidOrigins.join(', ')}`);
      logger.warn('CORS origins should start with http:// or https://');
    }
  }

  logger.log('Environment validation passed');

  // Validate Redis configuration
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    logger.warn('Redis configuration not found. Queue system requires Redis.');
    logger.warn('Set REDIS_HOST and REDIS_PORT, or REDIS_URL');
    if (processType === 'api' || processType === 'all') {
      logger.warn(
        `PROCESS_TYPE=${processType}: Bull queues (actions, incidents, ml-analysis) cannot process jobs until Redis is configured.`,
      );
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    SESSION_SECRET: process.env.SESSION_SECRET,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    PROCESS_TYPE: process.env.PROCESS_TYPE || 'all',
    API_PORT: process.env.API_PORT,
    WS_PORT: process.env.WS_PORT,
    NODE_ENV: process.env.NODE_ENV,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    WEB_URL: process.env.WEB_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    COOKIE_SECURE: process.env.COOKIE_SECURE,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_URL: process.env.REDIS_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
  };
}

