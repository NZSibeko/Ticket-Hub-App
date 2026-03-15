# 🚀 Ticket Hub - Huawei Cloud Deployment Checklist

## Pre-Deployment Preparation

### 1. Huawei Cloud Account Setup
- [ ] Create Huawei Cloud account at https://www.huaweicloud.com
- [ ] Verify email and phone number
- [ ] Add payment method
- [ ] Complete identity verification (if required)

### 2. Infrastructure Planning
- [ ] Choose region (closest to users: Africa, Europe, Asia)
- [ ] Plan VPC network topology
- [ ] Document IP ranges and subnets
- [ ] Plan security group rules

### 3. Domain & SSL
- [ ] Purchase domain name (if needed)
- [ ] Plan DNS configuration
- [ ] Prepare SSL certificate (Let's Encrypt or purchase)

---

## Infrastructure Setup

### 4. VPC (Virtual Private Cloud)
- [ ] Create VPC
  - [ ] Name: `tickethub-vpc`
  - [ ] CIDR: `192.168.0.0/16`
  - [ ] Region: [Your chosen region]
- [ ] Create Subnet
  - [ ] Name: `tickethub-subnet`
  - [ ] CIDR: `192.168.1.0/24`
  - [ ] Availability Zone: [Select AZ]
- [ ] Create Security Group
  - [ ] Name: `tickethub-sg`
  - [ ] Rules:
    - [ ] Inbound: SSH (22) from your IP
    - [ ] Inbound: HTTP (80) from anywhere
    - [ ] Inbound: HTTPS (443) from anywhere
    - [ ] Inbound: API (8081) from load balancer only
    - [ ] Outbound: All traffic

### 5. ECS (Elastic Cloud Server)
- [ ] Create ECS Instance
  - [ ] Name: `tickethub-backend`
  - [ ] Image: Ubuntu 22.04 LTS
  - [ ] Instance Type: s3.large.2 (2 vCPU, 4GB RAM)
  - [ ] System Disk: 40GB SSD
  - [ ] VPC: `tickethub-vpc`
  - [ ] Subnet: `tickethub-subnet`
  - [ ] Security Group: `tickethub-sg`
  - [ ] SSH Key: [Your key pair]
- [ ] Assign Elastic IP (EIP)
  - [ ] Purchase EIP
  - [ ] Bind to ECS instance
- [ ] Verify SSH access
  ```bash
  ssh -i your-key.pem root@<ecs-public-ip>
  ```

### 6. RDS (Relational Database Service)
- [ ] Create RDS Instance
  - [ ] Engine: PostgreSQL 14+
  - [ ] Instance Class: db.r5.large (2 vCPU, 4GB RAM)
  - [ ] Storage: 20GB SSD
  - [ ] VPC: `tickethub-vpc`
  - [ ] Subnet: Same as ECS
  - [ ] Security Group: Allow ECS private IP on 5432
  - [ ] Backup: Enable automated backups (7 days retention)
- [ ] Create Database
  ```sql
  CREATE DATABASE tickethub;
  CREATE USER tickethub_user WITH PASSWORD '<secure-password>';
  GRANT ALL PRIVILEGES ON DATABASE tickethub TO tickethub_user;
  ```
- [ ] Test connection from ECS
  ```bash
  psql -h <rds-endpoint> -U tickethub_user -d tickethub
  ```

### 7. OBS (Object Storage Service) - Optional
- [ ] Create OBS Bucket
  - [ ] Name: `tickethub-assets`
  - [ ] Region: Same as ECS
  - [ ] ACL: Private (or Public Read for static assets)
- [ ] Configure CORS (if serving assets to web)
- [ ] Set up CDN (optional for performance)

---

## Application Deployment

### 8. Server Setup
- [ ] SSH into ECS
- [ ] Update system packages
  ```bash
  apt update && apt upgrade -y
  ```
- [ ] Install Node.js 20.x
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  ```
- [ ] Install PM2
  ```bash
  npm install -g pm2
  ```
- [ ] Install Git
  ```bash
  apt install -y git
  ```
- [ ] Install Nginx
  ```bash
  apt install -y nginx
  ```
- [ ] Install Certbot
  ```bash
  apt install -y certbot python3-certbot-nginx
  ```

### 9. Code Deployment
- [ ] Clone repository or upload code
  ```bash
  cd /opt
  git clone <your-repo-url> tickethub
  cd tickethub
  ```
- [ ] Install dependencies
  ```bash
  npm install
  cd backend
  npm install
  ```
- [ ] Generate Prisma client
  ```bash
  npx prisma generate
  ```
- [ ] Build TypeScript
  ```bash
  npm run build
  ```

### 10. Environment Configuration
- [ ] Create `.env` file in `backend/` directory
- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL` with RDS endpoint
- [ ] Generate and set `JWT_SECRET`
- [ ] Configure Stripe keys
- [ ] Configure WhatsApp API credentials
- [ ] Configure Messenger API credentials
- [ ] Configure Twitter API credentials
- [ ] Set file permissions
  ```bash
  chmod 600 backend/.env
  ```

### 11. Database Migration / Bootstrap
- [ ] Run Prisma migrations
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Run explicit backend bootstrap step
  ```bash
  cd /opt/tickethub/backend
  npm run bootstrap
  ```
- [ ] Confirm bootstrap completed without errors
- [ ] Verify database connection

### 12. Start Application with PM2
- [ ] Start backend
  ```bash
  cd /opt/tickethub/backend
  pm2 start ecosystem.config.js --env production
  ```
- [ ] Save PM2 configuration
  ```bash
  pm2 save
  ```
- [ ] Setup PM2 startup
  ```bash
  pm2 startup
  ```
- [ ] Verify application process is alive
  ```bash
  pm2 status
  curl http://localhost:8081/health
  ```
- [ ] Verify application readiness before attaching traffic
  ```bash
  curl http://localhost:8081/ready
  ```
- [ ] Confirm `/ready` returns HTTP 200 only after env validation, DB connectivity, route mounting, and metrics initialization

### 12.1 Startup Failure Triage
- [ ] If `/ready` returns 503, inspect the structured readiness payload:
  - `startup.currentStage`
  - `startup.completedStages`
  - `startup.failure`
  - `lastError`
- [ ] Check PM2 logs for the same startup stage failure
  ```bash
  pm2 logs tickethub-backend --lines 200
  ```
- [ ] Do not attach the instance to live traffic until `/ready` returns 200

### 13. Nginx Configuration
- [ ] Copy nginx config
  ```bash
  cp /opt/tickethub/nginx/nginx.conf /etc/nginx/nginx.conf
  ```
- [ ] Test configuration
  ```bash
  nginx -t
  ```
- [ ] Restart Nginx
  ```bash
  systemctl restart nginx
  ```
- [ ] Verify proxy is working
  ```bash
  curl http://<ecs-ip>/health
  ```

### 14. SSL/TLS Setup
- [ ] Obtain SSL certificate
  ```bash
  certbot --nginx -d your-domain.com
  ```
- [ ] Verify HTTPS is working
  ```bash
  curl -I https://your-domain.com/health
  ```
- [ ] Setup auto-renewal
  ```bash
  certbot renew --dry-run
  ```

---

## Mobile App Configuration

### 15. Update React Native App
- [ ] Update API base URL in app config
  ```typescript
  export const API_BASE_URL = 'https://your-domain.com/api';
  ```
- [ ] Update WebSocket URL
  ```typescript
  export const WS_URL = 'wss://your-domain.com/socket.io';
  ```
- [ ] Test connection from mobile app
- [ ] Build and deploy to app stores (if updating)

---

## Monitoring & Security

### 16. Cloud Eye Monitoring
- [ ] Create CPU alarm (>80% for 5 minutes)
- [ ] Create Memory alarm (>85% for 5 minutes)
- [ ] Create Disk alarm (>90%)
- [ ] Create RDS connection alarm
- [ ] Configure notification channels (SMS/Email)
- [ ] Test alarm notifications

### 17. Security Hardening
- [ ] Disable SSH password authentication
  ```bash
  # /etc/ssh/sshd_config
  PasswordAuthentication no
  ```
- [ ] Setup fail2ban
  ```bash
  apt install -y fail2ban
  systemctl enable fail2ban
  ```
- [ ] Configure firewall (UFW)
  ```bash
  ufw allow 22
  ufw allow 80
  ufw allow 443
  ufw enable
  ```
- [ ] Enable automatic security updates
  ```bash
  apt install -y unattended-upgrades
  ```
- [ ] Setup log rotation
- [ ] Configure audit logging

### 18. Backup Strategy
- [ ] Enable RDS automated backups
- [ ] Create backup script for application files
- [ ] Test backup restoration
- [ ] Document backup schedule
- [ ] Store backups in OBS (off-server)

---

## Testing & Validation

### 19. Functional Testing
- [ ] Test API endpoints
  ```bash
  curl https://your-domain.com/api/health
  ```
- [ ] Test WebSocket connection
- [ ] Test user authentication
- [ ] Test payment flow (test mode)
- [ ] Test WhatsApp integration
- [ ] Test Messenger integration
- [ ] Test Twitter integration
- [ ] Test from mobile app

### 20. Performance Testing
- [ ] Run load test (100 concurrent users)
- [ ] Check response times (<500ms for API)
- [ ] Monitor resource usage during load
- [ ] Test database query performance
- [ ] Check WebSocket stability under load

### 21. Security Testing
- [ ] Run SSL Labs test (https://www.ssllabs.com/ssltest/)
- [ ] Check for exposed endpoints
- [ ] Verify rate limiting is working
- [ ] Test authentication flows
- [ ] Check CORS configuration
- [ ] Verify security headers

---

## Post-Deployment

### 22. Documentation
- [ ] Update architecture diagram
- [ ] Document all credentials (secure vault)
- [ ] Create runbook for common issues
- [ ] Document rollback procedure
- [ ] Update contact information

### 23. Handover & Training
- [ ] Train team on deployment process
- [ ] Share access credentials securely
- [ ] Document monitoring dashboards
- [ ] Create incident response plan

### 24. Go-Live
- [ ] Update DNS to production
- [ ] Monitor closely for first 24 hours
- [ ] Have rollback plan ready
- [ ] Announce launch to stakeholders

---

## Maintenance Schedule

### Daily
- [ ] Check PM2 status
- [ ] Review error logs
- [ ] Monitor Cloud Eye alarms

### Weekly
- [ ] Review performance metrics
- [ ] Check disk usage
- [ ] Review security logs

### Monthly
- [ ] Apply security updates
- [ ] Review and rotate credentials
- [ ] Test backup restoration
- [ ] Review cost optimization

### Quarterly
- [ ] Full disaster recovery test
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Capacity planning

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary Dev | | |
| Backup Dev | | |
| Huawei Cloud Support | | https://console.huaweicloud.com/ticket/ |
| Emergency Hotline | | Check your support plan |

---

## Rollback Procedure

If deployment fails:

1. **Stop current deployment**
   ```bash
   pm2 stop tickethub-backend
   ```

2. **Restore from backup**
   ```bash
   cd /opt
   rm -rf tickethub
   cp -r /opt/backups/tickethub/backup-<timestamp> tickethub
   cd tickethub/backend
   ```

3. **Restart application**
   ```bash
   pm2 start tickethub-backend
   ```

4. **Verify rollback**
   ```bash
   pm2 status
   curl http://localhost:8081/health
   ```

5. **Notify stakeholders**

---

**Checklist Version**: 1.0  
**Last Updated**: 2026-03-14  
**Prepared by**: Cipher
