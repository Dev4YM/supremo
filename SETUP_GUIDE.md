# Setup Guide - What Changed & How to Run

## 📁 Folders & Files Modified/Created

### Backend (`discord-bot/`)

#### New Folders Created:
```
discord-bot/
├── src/
│   ├── api-server/              # NEW - API server entry point
│   │   ├── main-api.ts         # NEW - API server bootstrap
│   │   ├── api.module.ts       # NEW - API module
│   │   └── websocket/          # NEW - WebSocket gateway
│   │       ├── websocket.module.ts
│   │       ├── realtime.gateway.ts
│   │       └── websocket-bootstrap.service.ts
│   ├── bot-worker/              # NEW - Bot worker entry point
│   │   ├── main-bot.ts         # NEW - Bot worker bootstrap
│   │   ├── bot.module.ts       # NEW - Bot module
│   │   ├── bot-bootstrap.service.ts  # NEW - Service wiring
│   │   └── intelligence/       # NEW - Intelligence engine
│   │       ├── intelligence.module.ts
│   │       ├── intelligence.service.ts
│   │       ├── scoring.service.ts
│   │       ├── detectors/
│   │       │   ├── spam.detector.ts
│   │       │   ├── toxicity.detector.ts
│   │       │   ├── links.detector.ts
│   │       │   └── raid.detector.ts
│   │       └── ml/
│   │           └── perspective.client.ts
│   └── shared/                  # NEW - Shared modules
│       ├── queue/
│       │   ├── queue.module.ts
│       │   ├── queue.service.ts
│       │   └── processors/
│       │       ├── action.processor.ts
│       │       ├── incident.processor.ts
│       │       └── ml-analysis.processor.ts
│       ├── intelligence/
│       │   ├── intelligence.module.ts
│       │   └── user-intelligence.service.ts
│       ├── database/
│       │   └── database.module.ts
│       └── types/
│           └── index.ts
├── prisma/
│   └── migrations/
│       └── backup_old_data.sql  # NEW - Backup script
├── scripts/                     # NEW - Migration scripts
│   ├── migrate-incidents.ts
│   ├── migrate-users.ts
│   └── migrate-actions.ts
└── test/                        # NEW - Test files
    ├── intelligence.service.spec.ts
    └── queue.service.spec.ts
```

#### Modified Files:
```
discord-bot/
├── src/
│   ├── main.ts                 # MODIFIED - Now supports PROCESS_TYPE
│   ├── app.module.ts           # MODIFIED - Original module (backward compat)
│   ├── discord/
│   │   ├── discord.module.ts   # MODIFIED - Added QueueModule
│   │   └── discord.gateway.ts  # MODIFIED - Publishes to queue
│   └── config/
│       └── env.validation.ts   # MODIFIED - Added Redis/ProcessType validation
├── prisma/
│   └── schema.prisma           # MODIFIED - Added new models & enums
├── package.json                # MODIFIED - Added scripts & dependencies
├── Dockerfile                  # EXISTS - Original
├── Dockerfile.api              # NEW - API server Dockerfile
├── Dockerfile.bot              # NEW - Bot worker Dockerfile
└── README.md                   # MODIFIED - Updated documentation
```

### Frontend (`web/`)

#### New Folders Created:
```
web/
├── hooks/
│   ├── useWebSocket.ts         # NEW - WebSocket integration
│   └── useIncidents.ts         # NEW - Incident data hooks
├── components/
│   └── workflows/              # NEW - Workflow builder
│       ├── WorkflowBuilder.tsx
│       └── nodes/
│           ├── TriggerNode.tsx
│           ├── ConditionNode.tsx
│           └── ActionNode.tsx
├── app/
│   ├── workflows/
│   │   └── builder/
│   │       └── page.tsx        # NEW - Workflow builder page
│   └── analytics/
│       └── health/
│           └── page.tsx        # NEW - Server health page
└── __tests__/
    └── hooks/
        └── useIncidents.test.tsx  # NEW - Test file
```

#### Modified Files:
```
web/
├── components/
│   └── Layout.tsx              # MODIFIED - Simplified navigation
└── package.json                # MODIFIED - Added reactflow dependency
```

### Root Level

#### New Files:
```
./
├── docker-compose.yml          # MODIFIED - Split into api-server & bot-worker
├── docs/
│   └── DEPLOYMENT.md          # NEW - Deployment guide
└── IMPLEMENTATION_SUMMARY.md   # NEW - Implementation summary
```

## 🚀 How to Run

### Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
3. **Redis 7+** - [Download](https://redis.io/download)
4. **Discord Bot Token** - [Create here](https://discord.com/developers/applications)

### Step 1: Install Dependencies

```bash
# Backend
cd discord-bot
npm install

# Frontend
cd ../web
npm install
```

### Step 2: Setup Database

```bash
cd discord-bot

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Run data migrations if upgrading
npm run migrate:all
```

### Step 3: Configure Environment

**Backend (`discord-bot/.env`):**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/supremo_bot

# Discord
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Redis (Required for queue system)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Process Type (for separate processes)
PROCESS_TYPE=all  # Options: 'api', 'bot', or 'all'

# API Server
API_PORT=3001
WS_PORT=3003
WEB_URL=http://localhost:3000

# ML/AI (Optional)
PERSPECTIVE_API_KEY=your_perspective_api_key
PERSPECTIVE_ENABLED=true
ML_CONFIDENCE_THRESHOLD=70

# Security
SESSION_SECRET=your_random_32_character_secret_here
NODE_ENV=development
```

**Frontend (`web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3003
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
```

### Step 4: Start Services

#### Option A: All-in-One (Development)

**Terminal 1 - Backend:**
```bash
cd discord-bot
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```

#### Option B: Separate Processes (Production-like)

**Terminal 1 - API Server:**
```bash
cd discord-bot
npm run dev:api
```

**Terminal 2 - Bot Worker:**
```bash
cd discord-bot
npm run dev:bot
```

**Terminal 3 - Frontend:**
```bash
cd web
npm run dev
```

#### Option C: Docker Compose (Recommended for Production)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 5: Access Application

- **Dashboard**: http://localhost:3000
- **API Server**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **WebSocket**: ws://localhost:3003/realtime

## 🔧 Troubleshooting

### Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (if not running)
# Windows: Download Redis from https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis && brew services start redis
# Linux: sudo systemctl start redis
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Create database if needed
createdb supremo_bot
```

### Bot Not Connecting

1. Check `DISCORD_BOT_TOKEN` is correct
2. Verify bot has required intents in Discord Developer Portal:
   - MESSAGE CONTENT INTENT (Privileged)
   - SERVER MEMBERS INTENT (Privileged)
3. Check bot worker logs for errors

### WebSocket Not Connecting

1. Verify `WS_PORT=3003` is set
2. Check `NEXT_PUBLIC_WS_URL` matches backend
3. Ensure CORS is configured correctly

## 📋 Quick Commands Reference

```bash
# Backend
cd discord-bot
npm run start:api      # Start API server only
npm run start:bot      # Start bot worker only
npm run start:all      # Start both (backward compat)
npm run dev:api        # Dev mode API server
npm run dev:bot        # Dev mode bot worker
npm run migrate:all    # Run all migrations

# Frontend
cd web
npm run dev            # Start dev server
npm run build          # Build for production
npm run start          # Start production server

# Docker
docker-compose up -d   # Start all services
docker-compose logs -f # View logs
docker-compose down    # Stop all services
```

## 🎯 What Each Service Does

### API Server (`PROCESS_TYPE=api`)
- Handles HTTP requests from web dashboard
- Manages WebSocket connections
- Processes incident queue jobs
- Database operations
- Authentication & authorization

### Bot Worker (`PROCESS_TYPE=bot`)
- Connects to Discord Gateway
- Processes Discord events
- Runs intelligence analysis
- Executes moderation actions
- Publishes incidents to queue

### All-in-One (`PROCESS_TYPE=all`)
- Runs both API server and bot worker in same process
- Useful for development
- Not recommended for production

## ✅ Verification Checklist

- [ ] PostgreSQL is running and accessible
- [ ] Redis is running and accessible
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Discord bot token is valid
- [ ] Bot intents enabled in Discord Developer Portal
- [ ] API server starts without errors
- [ ] Bot worker connects to Discord
- [ ] Web dashboard loads
- [ ] WebSocket connects (check browser console)

## 🆘 Need Help?

- Check logs: `docker-compose logs` or `npm run start:dev`
- Review environment variables
- Verify all services are running
- Check Discord Developer Portal for bot settings
- Review `docs/DEPLOYMENT.md` for detailed deployment guide
