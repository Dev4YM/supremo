# 🛠️ Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+
- PostgreSQL 12+ (for backend)
- Discord Bot Token and OAuth App

### Installation

```bash
# Clone and install
git clone <your-repo-url>
cd supremo-discord-bot
npm install

# Build shared packages
npm run build:packages
```

## 🚀 Development Commands

### Start Development Servers

```bash
# Option 1: Start both frontend and backend together (RECOMMENDED)
npm run dev:both

# Option 2: Use the development script directly
npm run dev:script        # Shows help menu
npm run dev:script web    # Frontend only
npm run dev:script server # Backend only
npm run dev:script both   # Both servers

# Option 3: Start individually using workspaces
npm run dev --workspace=apps/server  # Backend on port 9691
npm run dev --workspace=apps/web     # Frontend on port 7634

# Option 4: Manual control (navigate to directories)
cd apps/server
npm run dev           # Backend

# In another terminal
cd apps/web  
npm run dev           # Frontend
```

### Alternative Ports (if 3000 is busy)

```bash
# Start web on alternative port 7635
cd apps/web && npm run dev:alt

# Or directly with custom port
cd apps/web && npm run dev -- --port 7635
```

### Stop Development Servers

**Method 1: Keyboard Shortcut (RECOMMENDED)**
- Press `Ctrl+C` in the terminal running the server
- This works for all npm scripts and the development script

**Method 2: Kill Process by Port (Windows)**
```powershell
# Find processes using ports
netstat -ano | findstr :7634
netstat -ano | findstr :9691

# Kill specific process by PID
taskkill /PID <PID> /F

# Kill multiple processes by port (if kill-port is installed)
npx kill-port 7634
npx kill-port 9691
npx kill-port 7634,9691,7635
```

**Method 3: Task Manager (Windows)**
- Press `Ctrl+Shift+Esc` to open Task Manager
- Go to "Details" tab
- Find Node.js processes
- Right-click → "End task"

**Method 4: PowerShell (Windows)**
```powershell
# Kill all Node.js processes (CAREFUL - this kills ALL Node processes)
Get-Process node | Stop-Process -Force
```

## 📦 Package Development

### Build Packages
```bash
# Build all packages
npm run build:packages

# Build individual packages
cd packages/shared-types && npm run build
cd packages/rules-engine && npm run build
cd packages/utils && npm run build
```

### Watch Mode for Package Development
```bash
# Watch shared-types for changes
cd packages/shared-types && npm run dev

# Watch rules-engine for changes  
cd packages/rules-engine && npm run dev

# Watch utils for changes
cd packages/utils && npm run dev
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🔍 Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run type-check
```

## 🗄️ Database (Backend)

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## 🐳 Docker Development

```bash
# Build containers
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or use a different port
cd apps/web && npm run dev -- --port 7635
```

### Package Build Issues
```bash
# Clean and rebuild
npm run clean
npm install
npm run build:packages
```

### Module Resolution Issues
```bash
# Clear Next.js cache
cd apps/web && rm -rf .next

# Clear all node_modules
npm run clean
npm install
```

### TypeScript Errors
```bash
# Check types across all packages
npm run type-check

# Rebuild packages if types changed
npm run build:packages
```

## 📁 Project Structure

```
supremo-discord-bot/
├── apps/
│   ├── server/          # NestJS Backend (Port 3001)
│   └── web/             # Next.js Frontend (Port 3000)
├── packages/            # Shared Libraries
│   ├── shared-types/    # TypeScript definitions
│   ├── rules-engine/    # Moderation engine
│   └── utils/           # Common utilities
├── docs/                # Documentation
└── .github/             # CI/CD workflows
```

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature

# Start development
npm run dev:both

# Make changes to packages/apps
# Packages auto-rebuild in watch mode

# Test changes
npm run test
npm run lint

# Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

### 2. Package Changes
```bash
# When changing shared-types
cd packages/shared-types
npm run dev  # Watch mode

# In another terminal, restart apps to pick up changes
npm run dev:web
```

### 3. Database Changes
```bash
# Update schema
cd apps/server
# Edit prisma/schema.prisma

# Apply changes
npm run db:push

# Generate new client
npm run db:generate
```

## 🌐 Environment Configuration

### Development (.env files)
```bash
# Root environment (optional)
cp .env.example .env

# Backend environment
cp apps/server/.env.example apps/server/.env
# Edit with your Discord credentials

# Frontend environment  
cp apps/web/.env.example apps/web/.env.local
# Edit with your Discord OAuth settings
```

### Required Environment Variables

**Backend (`apps/server/.env`):**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/supremo_db"
DISCORD_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"
DISCORD_CLIENT_SECRET="your_client_secret"
JWT_SECRET="your_jwt_secret"
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_DISCORD_CLIENT_ID="your_client_id"
NEXT_PUBLIC_DISCORD_REDIRECT_URI="http://localhost:3000/auth/callback"
```

## 🚀 Production Deployment

### Build for Production
```bash
# Build everything
npm run build

# Or build individually
npm run build:packages
cd apps/server && npm run build
cd apps/web && npm run build
```

### Docker Deployment
```bash
# Build and start
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

## 💡 Tips

### VS Code Integration
- Install recommended extensions
- Use workspace settings
- Enable auto-format on save

### Git Workflow
- Use conventional commits
- Create feature branches
- Test before pushing

### Performance
- Use `npm run dev:both` for full development
- Use individual commands when debugging specific apps
- Watch mode for packages during active development

This guide provides professional development workflows suitable for team collaboration and open-source contributions.