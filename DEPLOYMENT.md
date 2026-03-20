# Ticket Hub - Huawei Cloud Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Huawei Cloud                              │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   React      │    │   ECS        │    │   RDS        │  │
│  │   Native     │───▶│   (Node.js)  │───▶│   (PostgreSQL)│  │
│  │   (Mobile)   │    │   + Express  │    │              │  │
│  └──────────────┘    │   + WebSocket│    └──────────────┘  │
│                      └──────────────┘                       │
│                             │                               │
│                      ┌──────────────┐                       │
│                      │   OBS        │                       │
│                      │   (Assets)   │                       │
│                      └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Huawei Cloud Account** - Register at https://www.huaweicloud.com
2. **Domain** (optional but recommended for production)
3. **Payment method** configured

## Step 1: ECS Setup (Backend Server)

### 1.1 Create ECS Instance

```
Region: Choose closest to your users (e.g., South Africa if available, or Europe)
Image: Ubuntu 22.04 LTS or CentOS 7
Instance Type: s3.large.2 (2 vCPU, 4GB RAM) - minimum
System Disk: 40GB SSD
Security Group: Open ports 22 (SSH), 8081 (API), 443 (HTTPS)
```

### 1.2 Connect via SSH

```bash
ssh root@<your-ecs-public-ip>
```

### 1.3 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install PostgreSQL client (for RDS)
sudo apt install -y postgresql-client
```

## Step 2: Database Setup (RDS)

### 2.1 Create RDS Instance

```
Database Engine: PostgreSQL 14+
Instance Class: db.r5.large (2 vCPU, 4GB RAM)
Storage: 20GB SSD
VPC: Same as your ECS instance
Security Group: Allow ECS private IP on port 5432
```

### 2.2 Create Database

```bash
# Connect from ECS
psql -h <rds-endpoint> -U postgres

# Create database
CREATE DATABASE tickethub;
CREATE USER tickethub_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE tickethub TO tickethub_user;
```

### 2.3 Migrate from SQLite to PostgreSQL

Update backend Prisma schema:

```prisma
// Change from SQLite to PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Update `.env`:
```
DATABASE_URL=postgresql://tickethub_user:your-secure-password@<rds-endpoint>:5432/tickethub
```

## Step 3: Deploy Backend

### 3.1 Clone/Push Code to ECS

```bash
# On ECS
cd /opt
git clone <your-repo-url> tickethub
cd tickethub
```

### 3.2 Install Dependencies

```bash
# Install all dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 3.3 Configure Environment

Create `/opt/tickethub/backend/.env`:

```env
NODE_ENV=production
PORT=8081
DATABASE_URL=postgresql://tickethub_user:password@rds-endpoint:5432/tickethub
JWT_SECRET=<generate-strong-secret>
STRIPE_SECRET_KEY=sk_live_xxx

# WhatsApp
WHATSAPP_PROVIDER=meta_cloud
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxx
WHATSAPP_VERIFY_TOKEN=tickethub_whatsapp_2025

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=60
```

### 3.4 Start with PM2

```bash
# Build backend first
cd /opt/tickethub/backend
npm install
npm run build

# Run bootstrap/migration step explicitly
npm run bootstrap

# Start backend with the canonical PM2 config
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
```

Important production note:
- keep all startup mutation features disabled unless explicitly needed
- in production, these should normally remain `false`:
  - `ENABLE_DEV_SEED`
  - `ENABLE_TEST_USERS`
  - `ENABLE_DEFAULT_USERS`
  - `ENABLE_SCRAPER`
  - `ENABLE_AUTOMATIC_BACKUPS`
  - `ENABLE_LOG_MONITORING`

Health model:
- `/health` = process alive (liveness)
- `/ready` = env valid + DB reachable + critical services initialized (readiness)
- use `/ready` for container/platform orchestration and load balancer readiness checks
- use `/health` only for basic process liveness diagnostics
- if `/ready` returns 503, inspect the structured readiness payload fields:
  - `startup.currentStage`
  - `startup.completedStages`
  - `startup.failure`
  - `lastError`

### 3.5 Setup Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/tickethub
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tickethub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.6 Setup SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

## Step 4: Mobile App Configuration

Update your React Native app's API endpoint:

```typescript
// src/config/api.ts
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8081' 
  : 'https://your-domain.com/api';
```

## Step 5: OBS (Object Storage) for Assets

### 5.1 Create OBS Bucket

```
Bucket Name: tickethub-assets
Region: Same as ECS
ACL: Private (use signed URLs) or Public Read for static assets
```

### 5.2 Configure CDN (Optional)

```
Enable CDN for faster asset delivery
Configure custom domain: cdn.your-domain.com
```

## Step 6: Monitoring & Alerts

### 6.1 Cloud Eye Setup

```
1. Go to Cloud Eye service
2. Create alarms for:
   - ECS CPU > 80%
   - ECS Memory > 85%
   - RDS Connections > 80%
   - Disk usage > 90%
3. Configure SMS/Email notifications
```

### 6.2 Application Logs

```bash
# PM2 logs
pm2 logs tickethub-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Deployment Checklist

- [ ] ECS instance created and secured
- [ ] SSH key configured (disable password auth)
- [ ] Security group rules configured
- [ ] RDS instance created
- [ ] Database migrated from SQLite
- [ ] Backend deployed with PM2
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] Mobile app API endpoint updated
- [ ] Monitoring alarms configured
- [ ] Backup strategy implemented

## Cost Estimate (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| ECS | 2 vCPU, 4GB RAM, 40GB SSD | ~$25 |
| RDS | PostgreSQL, 2 vCPU, 4GB, 20GB | ~$35 |
| OBS | 10GB storage + transfer | ~$5 |
| ELB | Basic load balancer | ~$15 |
| **Total** | | **~$80/month** |

## Security Best Practices

1. **Use Security Groups** - Only open required ports
2. **SSH Keys** - Disable password authentication
3. **Environment Variables** - Never commit secrets
4. **Regular Updates** - Keep OS and packages updated
5. **Database Backups** - Enable automated RDS backups
6. **WAF** - Consider Web Application Firewall for production
7. **HTTPS Only** - Force SSL for all traffic

## Rollback Plan

```bash
# PM2 rollback
pm2 restart tickethub-backend --update-env

# If code issue, revert git
cd /opt/tickethub
git revert HEAD
pm2 restart all
```

## Support Contacts

- Huawei Cloud Support: https://console.huaweicloud.com/ticket/
- Emergency: Check your support plan for 24/7 contact

---

**Last Updated**: 2026-03-14
**Version**: 1.0
