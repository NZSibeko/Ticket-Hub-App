# 🚀 Quick Start - Huawei Cloud Deployment

## 5-Minute Summary

Your **Ticket-Hub-App** is ready for Huawei Cloud deployment! Here's what you need to know:

---

## 📦 What I've Prepared

| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Complete deployment guide with step-by-step instructions |
| `DEPLOYMENT_CHECKLIST.md` | Detailed checklist to track your progress |
| `docker-compose.yml` | Docker setup for local testing & containerized deployment |
| `backend/Dockerfile` | Production-ready Dockerfile for backend |
| `.env.production.example` | Template for production environment variables |
| `scripts/deploy-huawei.sh` | Automated deployment script |
| `nginx/nginx.conf` | Nginx reverse proxy configuration |
| `backend/ecosystem.config.js` | PM2 process manager configuration |

---

## 🎯 Recommended Architecture

```
┌────────────────────────────────────────────┐
│         Huawei Cloud (Production)          │
│                                            │
│  Mobile App ──▶ ELB ──▶ ECS ──▶ RDS       │
│  (React Native)     │      │      │        │
│                     │      │      └─ PostgreSQL
│                     │      └─ Node.js + Express
│                     │         + WebSocket
│                     │
│                     └─▶ OBS (Assets)
│
└────────────────────────────────────────────┘
```

**Services You'll Need:**
1. **ECS** - Virtual machine for backend (~$25/month)
2. **RDS** - Managed PostgreSQL (~$35/month)
3. **OBS** - Object storage for assets (~$5/month)
4. **ELB** - Load balancer (optional, ~$15/month)

**Total Estimated Cost: ~$80/month**

---

## ⚡ Fastest Path to Production

### Option A: Automated Script (Recommended)

```bash
# 1. Create ECS and RDS in Huawei Cloud Console
# 2. Get ECS public IP
# 3. Run deployment script
cd Ticket-Hub-App
chmod +x scripts/deploy-huawei.sh
./scripts/deploy-huawei.sh <your-ecs-ip> ~/.ssh/id_rsa
```

### Option B: Manual Deployment

```bash
# 1. SSH into ECS
ssh -i your-key.pem root@<ecs-ip>

# 2. Install dependencies
apt update && apt install -y nodejs npm git nginx
npm install -g pm2

# 3. Deploy code
cd /opt
git clone <your-repo> tickethub
cd tickethub/backend
npm install
npm run build

# 4. Configure environment
cp .env.example .env
# Edit .env with your values

# 5. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 🔑 Critical Configuration

### 1. Database Connection
Update `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/tickethub
```

### 2. JWT Secret (Generate Strong Secret)
```bash
openssl rand -base64 32
```

### 3. API Credentials
Fill in these in `.env`:
- Stripe keys
- WhatsApp API credentials
- Messenger API credentials
- Twitter API credentials

---

## 🧪 Test Locally First

Before deploying to Huawei Cloud, test with Docker:

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Test API
curl http://localhost:8081/health

# Stop when done
docker-compose down
```

---

## 📱 Mobile App Updates

After deployment, update your React Native app:

```typescript
// src/config/api.ts
export const API_BASE_URL = 'https://your-domain.com/api';
export const WS_URL = 'wss://your-domain.com/socket.io';
```

---

## 🔍 Monitoring & Maintenance

### Check Application Status
```bash
# On ECS
pm2 status
pm2 logs tickethub-backend
pm2 monit
```

### Huawei Cloud Console
- **Cloud Eye** - Monitor CPU, memory, disk
- **RDS** - Database metrics and backups
- **Logs** - Application and system logs

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| Can't connect to database | Check RDS security group allows ECS IP |
| WebSocket not connecting | Verify Nginx proxy_pass for /socket.io |
| 502 Bad Gateway | Check if backend is running: `pm2 status` |
| SSL certificate errors | Run `certbot renew` |
| High memory usage | Increase ECS instance size or optimize code |

---

## 📞 Support

- **Huawei Cloud Docs**: https://support.huaweicloud.com
- **Huawei Cloud Console**: https://console.huaweicloud.com
- **Emergency Support**: Create ticket in console

---

## ✅ Next Steps

1. [ ] Review `DEPLOYMENT.md` for detailed instructions
2. [ ] Open `DEPLOYMENT_CHECKLIST.md` and start checking off items
3. [ ] Create Huawei Cloud account (if not done)
4. [ ] Provision ECS and RDS
5. [ ] Run deployment script or deploy manually
6. [ ] Test from mobile app
7. [ ] Configure monitoring and alerts

---

**Need help?** Just ask! I can guide you through any step. ⚡

**Last Updated**: 2026-03-14
