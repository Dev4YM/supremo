# Supremo Discord Bot - Deployment Guide

This guide covers deploying both the backend (NestJS) and frontend (Next.js) components of the Supremo Discord Bot.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (PostgreSQL)  │
│   Port: 7634    │    │   Port: 9691    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- Discord Application (Bot Token & OAuth2)
- Domain name with SSL certificate

### 1. Database Setup

```sql
-- Create database
CREATE DATABASE supremo_bot;

-- Create user
CREATE USER supremo_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE supremo_bot TO supremo_user;
```

### 2. Backend Deployment

#### Environment Configuration
Create `apps/server/.env.production`:

```env
# Database
DATABASE_URL="postgresql://supremo_user:password@localhost:5432/supremo_bot"

# Discord
DISCORD_BOT_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"
DISCORD_CLIENT_SECRET="your_client_secret"
DISCORD_REDIRECT_URI="https://yourdomain.com/auth/callback"

# JWT & Session
JWT_SECRET="your_super_secure_jwt_secret_at_least_32_chars"
SESSION_SECRET="your_super_secure_session_secret_at_least_32_chars"

# CORS & URLs
WEB_URL="https://yourdomain.com"
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Server
NODE_ENV="production"
PORT=9691

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

#### Build and Start

```bash
# Install dependencies
cd apps/server
npm ci --only=production

# Build the application
npm run build

# Run database migrations
npm run migration:run

# Seed initial data
npm run seed

# Start the server
npm run start:prod

# Or use PM2 for process management
pm2 start dist/main.js --name "supremo-backend"
```

### 3. Frontend Deployment

#### Environment Configuration
Create `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_WS_URL="wss://api.yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

#### Build and Deploy

```bash
# Install dependencies
cd apps/web
npm ci --only=production

# Build the application
npm run build

# Start the server
npm run start

# Or use PM2
pm2 start npm --name "supremo-frontend" -- start
```

## 🐳 Docker Deployment

### Docker Compose Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  database:
    image: postgres:14
    environment:
      POSTGRES_DB: supremo_bot
      POSTGRES_USER: supremo_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    environment:
      - DATABASE_URL=postgresql://supremo_user:${DB_PASSWORD}@database:5432/supremo_bot
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    ports:
      - "9691:9691"
    depends_on:
      - database
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
      - NODE_ENV=production
    ports:
      - "7634:3000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Backend Dockerfile

Create `apps/server/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
RUN npm ci --only=production

COPY apps/server ./apps/server
RUN cd apps/server && npm run build

FROM node:18-alpine AS runner

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/apps/server/package*.json ./

USER nestjs
EXPOSE 9691

CMD ["node", "dist/main"]
```

### Frontend Dockerfile

Create `apps/web/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

COPY apps/web ./apps/web
RUN cd apps/web && npm run build

FROM node:18-alpine AS runner

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

## 🌐 Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/supremo`:

```nginx
# Frontend
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:7634;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:9691;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Security Checklist

### Environment Security
- [ ] Use strong, unique passwords for database
- [ ] Generate secure JWT and session secrets (32+ characters)
- [ ] Enable SSL/TLS certificates
- [ ] Configure proper CORS origins
- [ ] Use environment variables for all secrets

### Application Security
- [ ] Enable rate limiting
- [ ] Configure CSP headers
- [ ] Set up proper session management
- [ ] Enable HTTPS redirect
- [ ] Configure security headers

### Infrastructure Security
- [ ] Configure firewall rules
- [ ] Enable database encryption
- [ ] Set up regular backups
- [ ] Monitor logs and metrics
- [ ] Keep dependencies updated

## 📊 Monitoring & Logging

### Application Monitoring

```bash
# Install PM2 for process management
npm install -g pm2

# Start with monitoring
pm2 start ecosystem.config.js
pm2 monit

# Setup log rotation
pm2 install pm2-logrotate
```

### Health Checks

```bash
# Backend health check
curl https://api.yourdomain.com/api/health

# Frontend health check
curl https://yourdomain.com/api/health
```

### Log Management

```bash
# View logs
pm2 logs supremo-backend
pm2 logs supremo-frontend

# Log files location
tail -f ~/.pm2/logs/supremo-backend-out.log
tail -f ~/.pm2/logs/supremo-backend-error.log
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U supremo_user -d supremo_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U supremo_user -d supremo_bot < backup_file.sql
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
DB_NAME="supremo_bot"
DB_USER="supremo_user"

# Create backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

## 🚀 Performance Optimization

### Backend Optimization
- Enable Redis caching
- Configure database connection pooling
- Set up CDN for static assets
- Enable gzip compression
- Configure proper logging levels

### Frontend Optimization
- Enable Next.js image optimization
- Configure proper caching headers
- Use CDN for static assets
- Enable service worker caching
- Optimize bundle size

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U supremo_user -d supremo_bot
   ```

2. **CORS Errors**
   ```bash
   # Verify CORS_ORIGINS in backend .env
   # Ensure frontend URL matches exactly
   ```

3. **Authentication Issues**
   ```bash
   # Verify Discord OAuth2 settings
   # Check redirect URI configuration
   # Validate JWT secrets
   ```

4. **Permission Errors**
   ```bash
   # Check file permissions
   sudo chown -R nodejs:nodejs /app
   
   # Check port availability
   sudo netstat -tlnp | grep :9691
   ```

### Log Analysis

```bash
# Check application logs
journalctl -u supremo-backend -f
journalctl -u supremo-frontend -f

# Check Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 📞 Support

For deployment support:
- Check the troubleshooting section
- Review application logs
- Open an issue on GitHub
- Join our Discord community

## 🎉 Post-Deployment

After successful deployment:
1. Test all major features
2. Set up monitoring and alerts
3. Configure automated backups
4. Update DNS records
5. Set up SSL certificate auto-renewal
6. Document your specific configuration