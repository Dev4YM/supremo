# Supremo Discord Bot - Backend

## Overview

Supremo is an open-source moderation intelligence framework for Discord, built with NestJS, PostgreSQL, and Redis. It provides ML-powered incident detection, trust scoring, and real-time moderation capabilities.

## Architecture

The backend is split into two main processes:

- **API Server** (`src/api-server/`): Handles HTTP requests, WebSocket connections, and database operations
- **Bot Worker** (`src/bot-worker/`): Processes Discord events, runs intelligence analysis, and executes moderation actions

Communication between processes is handled via Redis queues using Bull.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Discord Bot Token

### Installation

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/supremo_bot

# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Process Type
PROCESS_TYPE=all  # 'api', 'bot', or 'all'

# API Server
API_PORT=3001
WS_PORT=3003
WEB_URL=http://localhost:3000

# ML/AI
PERSPECTIVE_API_KEY=your_perspective_api_key
PERSPECTIVE_ENABLED=true
ML_CONFIDENCE_THRESHOLD=70

# Security
SESSION_SECRET=your_session_secret_min_32_chars
```

### Running

**Development (all-in-one):**
```bash
npm run start:dev
```

**Production (separate processes):**
```bash
# Terminal 1: API Server
npm run start:api

# Terminal 2: Bot Worker
npm run start:bot
```

### Docker

```bash
docker-compose up
```

## API Documentation

Once running, visit `http://localhost:3001/api/docs` for Swagger API documentation.

## Testing

```bash
npm test
npm run test:e2e
```

## Migration

After schema changes:

```bash
# Backup existing data
psql -d supremo_bot -f prisma/migrations/backup_old_data.sql

# Run migrations
npm run migrate:all
```

## Project Structure

```
discord-bot/
├── src/
│   ├── api-server/          # API server entry point
│   ├── bot-worker/          # Bot worker entry point
│   ├── shared/              # Shared modules
│   │   ├── queue/           # Redis queue system
│   │   ├── intelligence/    # Trust scoring
│   │   └── types/           # Shared types
│   ├── bot-worker/
│   │   └── intelligence/    # ML detection engine
│   └── ...
├── prisma/
│   └── schema.prisma        # Database schema
└── scripts/
    └── migrate-*.ts         # Migration scripts
```

## Key Features

- **Intelligence Engine**: ML-powered incident detection with multiple detectors
- **Trust Scoring**: User intelligence profiles with risk assessment
- **Real-time Updates**: WebSocket-based live dashboard updates
- **Queue System**: Reliable job processing with Redis/Bull
- **Multi-tenant**: Support for multiple Discord servers

## License

ISC
