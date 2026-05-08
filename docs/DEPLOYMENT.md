# 🚀 Deployment Guide

## Overview

This guide covers deploying Supremo Discord Bot in various environments, from local development to production-scale deployments.

## 📋 Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: Stable internet connection

**Recommended for Production:**
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: High-bandwidth connection
- **Load Balancer**: For multiple instances

### Software Dependencies

- **Node.js**: 18+ (LTS recommended)
- **PostgreSQL**: 12+
- **Redis**: 6+ (optional but recommended)
- **Docker**: 20+ (for containerized deployment)
- **Git**: For source code management

## 🏠 Local Development

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/supremo-discord-bot.git
cd supremo-discord-bot

# Install dependencies for all packages
npm install

# Build shared packages
npm run build:packages
```

### 2. Environment Configuration

**Backend Configuration (`apps/server/.env`):**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/supremo_db"

# Discord
DISCORD_TOKEN="your_bot_token_here"
DISCORD_CLIENT_ID="your_client_id_here"
DISCORD_CLIENT_SECRET="your_client_secret_here"

# JWT
JWT_SECRET="your_jwt_secret_here"
JWT_EXPIRES_IN="7d"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Application
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Logging
LOG_LEVEL="debug"
LOG_FORMAT="pretty"
```

**Frontend Configuration (`apps/web/.env.local`):**
```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"

# Discord OAuth
NEXT_PUBLIC_DISCORD_CLIENT_ID="your_client_id_here"
NEXT_PUBLIC_DISCORD_REDIRECT_URI="http://localhost:3000/auth/callback"

# Application
NEXT_PUBLIC_APP_NAME="Supremo Bot"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

### 3. Database Setup

```bash
# Navigate to server directory
cd apps/server

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database (optional)
npm run prisma:seed
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd apps/server
npm run start:dev

# Terminal 2 - Frontend  
cd apps/web
npm run dev

# Or start both with single command from root
npm run dev
```

### 5. Access Applications

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/docs

## 🐳 Docker Deployment

### 1. Using Docker Compose (Recommended)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: supremo_db
      POSTGRES_USER: supremo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U supremo"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  backend:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    environment:
      - DATABASE_URL=postgresql://supremo:${DB_PASSWORD}@postgres:5432/supremo_db
      - REDIS_URL=redis://redis:6379
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Dashboard
  frontend:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
      - NEXT_PUBLIC_DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

**Environment File (`.env`):**
```env
# Database
DB_PASSWORD=your_secure_password_here

# Discord
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Security
JWT_SECRET=your_jwt_secret_here
```

### 2. Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d --force-recreate
```

### 3. Individual Docker Containers

**Backend Dockerfile (`apps/server/Dockerfile`):**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/*/package*.json ./packages/*/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build packages and application
RUN npm run build:packages
RUN npm run build --workspace=apps/server

FROM node:18-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S supremo -u 1001

USER supremo

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

## ☁️ Cloud Deployment

### 1. Heroku Deployment

**Prepare for Heroku:**
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create applications
heroku create supremo-bot-api
heroku create supremo-bot-web

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev -a supremo-bot-api

# Add Redis addon
heroku addons:create heroku-redis:hobby-dev -a supremo-bot-api
```

**Procfile (root directory):**
```
web: npm start --workspace=apps/web
api: npm start --workspace=apps/server
```

**Deploy:**
```bash
# Set environment variables
heroku config:set DISCORD_TOKEN=your_token -a supremo-bot-api
heroku config:set JWT_SECRET=your_secret -a supremo-bot-api

# Deploy
git push heroku main
```

### 2. Railway Deployment

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod --workspace=apps/server",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3. DigitalOcean App Platform

**app.yaml:**
```yaml
name: supremo-discord-bot
services:
- name: api
  source_dir: /
  github:
    repo: yourusername/supremo-discord-bot
    branch: main
  run_command: npm run start:prod --workspace=apps/server
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DATABASE_URL
    scope: RUN_TIME
    type: SECRET
  - key: DISCORD_TOKEN
    scope: RUN_TIME
    type: SECRET
  
- name: web
  source_dir: /
  run_command: npm run start --workspace=apps/web
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  envs:
  - key: NEXT_PUBLIC_API_URL
    scope: BUILD_AND_RUN_TIME
    value: ${api.PUBLIC_URL}

databases:
- name: supremo-db
  engine: PG
  version: "13"
```

### 4. AWS Deployment

**Using AWS ECS with Fargate:**

```yaml
# docker-compose.aws.yml
version: '3.8'

services:
  backend:
    image: your-registry/supremo-backend:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3001:3001"
    
  frontend:
    image: your-registry/supremo-frontend:latest
    environment:
      - NEXT_PUBLIC_API_URL=${API_URL}
    ports:
      - "3000:3000"
```

## 🔧 Production Configuration

### 1. Environment Variables

**Security:**
```env
# Strong JWT secret (32+ characters)
JWT_SECRET="your-super-secure-jwt-secret-key-here"

# Database with connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"

# Redis for caching and sessions
REDIS_URL="redis://user:pass@host:6379"

# CORS for production domain
CORS_ORIGIN="https://your-domain.com"
```

**Performance:**
```env
# Node.js optimization
NODE_ENV="production"
NODE_OPTIONS="--max-old-space-size=4096"

# Logging
LOG_LEVEL="info"
LOG_FORMAT="json"

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Cache settings
CACHE_TTL=300  # 5 minutes
CACHE_MAX_ITEMS=1000
```

### 2. Database Optimization

**Connection Pooling:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}
```

**Performance Settings:**
```sql
-- PostgreSQL configuration
shared_preload_libraries = 'pg_stat_statements'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### 3. Monitoring Setup

**Health Checks:**
```typescript
// apps/server/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    };
  }
}
```

**Logging Configuration:**
```typescript
// Winston logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

## 🔒 Security Hardening

### 1. Application Security

**Helmet Configuration:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Rate Limiting:**
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### 2. Infrastructure Security

**Firewall Rules:**
- Allow HTTP/HTTPS (ports 80, 443)
- Allow SSH (port 22) from specific IPs only
- Block all other incoming traffic
- Allow outbound traffic for API calls

**SSL/TLS Configuration:**
```nginx
# Nginx SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
```

## 📊 Monitoring & Maintenance

### 1. Application Monitoring

**Metrics Collection:**
```typescript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});
```

**Error Tracking:**
```typescript
// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Database Maintenance

**Backup Strategy:**
```bash
#!/bin/bash
# Daily database backup
pg_dump $DATABASE_URL | gzip > "backup-$(date +%Y%m%d).sql.gz"

# Upload to S3 (optional)
aws s3 cp "backup-$(date +%Y%m%d).sql.gz" s3://your-backup-bucket/

# Clean old backups (keep 30 days)
find . -name "backup-*.sql.gz" -mtime +30 -delete
```

**Performance Monitoring:**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor database size
SELECT pg_size_pretty(pg_database_size('supremo_db'));
```

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Issues:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool status
echo "SELECT * FROM pg_stat_activity;" | psql $DATABASE_URL
```

**2. Memory Issues:**
```bash
# Monitor memory usage
docker stats

# Check Node.js heap usage
curl http://localhost:3001/health
```

**3. Discord API Rate Limits:**
```typescript
// Implement exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.status === 429) {
      const delay = Math.pow(2, 3 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
};
```

### Log Analysis

**Useful Log Queries:**
```bash
# Find errors in logs
grep "ERROR" logs/combined.log | tail -20

# Monitor API response times
grep "HTTP" logs/combined.log | grep "slow" | tail -10

# Check Discord API errors
grep "Discord API" logs/combined.log | grep "error"
```

This deployment guide provides comprehensive coverage for deploying Supremo Discord Bot in various environments while maintaining security, performance, and reliability standards.