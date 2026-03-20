#!/bin/bash
# ===========================================
# Ticket Hub - Huawei Cloud Deployment Script
# ===========================================
# Usage: ./scripts/deploy-huawei.sh [ecs-ip] [ssh-key-path]
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ECS_IP=${1:-""}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
APP_NAME="tickethub"
REMOTE_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/backups/${APP_NAME}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [ -z "$ECS_IP" ]; then
        log_error "ECS IP address is required"
        echo "Usage: $0 <ecs-ip> [ssh-key-path]"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        log_error "SSH is not installed"
        exit 1
    fi
    
    if [ ! -f "$SSH_KEY" ]; then
        log_error "SSH key not found: $SSH_KEY"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

setup_ssh() {
    log_info "Testing SSH connection..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@"$ECS_IP" "echo 'SSH connection successful'" || {
        log_error "Failed to connect to ECS"
        exit 1
    }
}

install_dependencies() {
    log_info "Installing system dependencies on ECS..."
    
    ssh -i "$SSH_KEY" root@"$ECS_IP" << 'EOF'
        # Update system
        apt update && apt upgrade -y
        
        # Install Node.js 20.x
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
        
        # Install PM2
        npm install -g pm2
        
        # Install Git
        apt install -y git
        
        # Install PostgreSQL client
        apt install -y postgresql-client
        
        # Install Nginx
        apt install -y nginx
        
        # Install build tools
        apt install -y build-essential
        
        # Install Certbot for SSL
        apt install -y certbot python3-certbot-nginx
        
        log_info "System dependencies installed"
EOF
}

setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    # This assumes you have RDS endpoint from Huawei Cloud console
    read -p "Enter RDS PostgreSQL endpoint: " RDS_ENDPOINT
    read -p "Enter database password: " -s DB_PASSWORD
    echo
    
    ssh -i "$SSH_KEY" root@"$ECS_IP" << EOF
        # Test connection to RDS
        psql -h ${RDS_ENDPOINT} -U postgres -c "SELECT version();" || {
            echo "Failed to connect to RDS"
            exit 1
        }
        
        # Create database and user (run these manually in production)
        echo "Database connection verified"
        echo "Please create database manually:"
        echo "CREATE DATABASE tickethub;"
        echo "CREATE USER tickethub_user WITH PASSWORD '${DB_PASSWORD}';"
        echo "GRANT ALL PRIVILEGES ON DATABASE tickethub TO tickethub_user;"
EOF
}

deploy_application() {
    log_info "Deploying application to ECS..."
    
    # Create remote directory
    ssh -i "$SSH_KEY" root@"$ECS_IP" "mkdir -p ${REMOTE_DIR} ${BACKUP_DIR}"
    
    # Backup existing deployment if exists
    if ssh -i "$SSH_KEY" root@"$ECS_IP" "[ -d ${REMOTE_DIR}/backend ]"; then
        log_warn "Existing deployment found, creating backup..."
        ssh -i "$SSH_KEY" root@"$ECS_IP" "cp -r ${REMOTE_DIR} ${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Copy application files
    log_info "Copying application files..."
    scp -i "$SSH_KEY" -r \
        backend/* \
        package.json \
        package-lock.json \
        root@"$ECS_IP":"${REMOTE_DIR}/"
    
    # Install dependencies and build
    ssh -i "$SSH_KEY" root@"$ECS_IP" << EOF
        cd ${REMOTE_DIR}
        
        # Install dependencies
        npm install --production
        
        # Install backend dependencies
        cd backend
        npm install --production
        
        # Generate Prisma client
        npx prisma generate
        
        # Build TypeScript
        npm run build
        
        log_info "Application built successfully"
EOF
}

configure_environment() {
    log_info "Configuring environment variables..."
    
    read -p "Enter JWT Secret (or press enter to generate): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        log_info "Generated JWT Secret"
    fi
    
    # Create .env file
    ssh -i "$SSH_KEY" root@"$ECS_IP" << EOF
        cat > ${REMOTE_DIR}/backend/.env << ENVEOF
NODE_ENV=production
PORT=8081
DATABASE_URL=postgresql://tickethub_user:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/tickethub
JWT_SECRET=${JWT_SECRET}
ENVEOF
        
        chmod 600 ${REMOTE_DIR}/backend/.env
        log_info "Environment configured"
EOF
}

setup_nginx() {
    log_info "Configuring Nginx..."
    
    read -p "Enter your domain name (or press enter to skip): " DOMAIN_NAME
    
    if [ -n "$DOMAIN_NAME" ]; then
        ssh -i "$SSH_KEY" root@"$ECS_IP" << EOF
            cat > /etc/nginx/sites-available/${APP_NAME} << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    location /api {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    
    location /socket.io {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
NGINXEOF
            
            ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
            nginx -t
            systemctl restart nginx
            
            log_info "Nginx configured for ${DOMAIN_NAME}"
EOF
    fi
}

setup_ssl() {
    if [ -n "$DOMAIN_NAME" ]; then
        log_info "Setting up SSL certificate..."
        
        ssh -i "$SSH_KEY" root@"$ECS_IP" << EOF
            certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos --email admin@${DOMAIN_NAME}
            log_info "SSL certificate installed"
EOF
    fi
}

start_application() {
    log_info "Starting application with PM2..."
    
    ssh -i "$SSH_KEY" root@"$ECS_IP" << EOF
        cd ${REMOTE_DIR}/backend
        
        # Start with PM2
        pm2 start dist/server.js --name ${APP_NAME}-backend
        
        # Save PM2 configuration
        pm2 save
        
        # Setup PM2 startup
        pm2 startup systemd -u root --hp /root
        
        log_info "Application started"
        pm2 status
EOF
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    sleep 5
    
    HEALTH_CHECK=$(ssh -i "$SSH_KEY" root@"$ECS_IP" "curl -s http://localhost:8081/health")
    
    if [ -n "$HEALTH_CHECK" ]; then
        log_info "Health check passed!"
        echo "$HEALTH_CHECK"
    else
        log_warn "Health check failed, check PM2 logs: pm2 logs ${APP_NAME}-backend"
    fi
}

show_summary() {
    echo ""
    log_info "==========================================="
    log_info "Deployment Summary"
    log_info "==========================================="
    echo "ECS IP: ${ECS_IP}"
    echo "App Directory: ${REMOTE_DIR}"
    echo "Backup Directory: ${BACKUP_DIR}"
    echo ""
    echo "Useful commands:"
    echo "  SSH: ssh -i ${SSH_KEY} root@${ECS_IP}"
    echo "  Logs: pm2 logs ${APP_NAME}-backend"
    echo "  Status: pm2 status"
    echo "  Restart: pm2 restart ${APP_NAME}-backend"
    echo "  Monitor: pm2 monit"
    echo ""
    if [ -n "$DOMAIN_NAME" ]; then
        echo "API URL: https://${DOMAIN_NAME}/api"
        echo "WebSocket: wss://${DOMAIN_NAME}/socket.io"
    else
        echo "API URL: http://${ECS_IP}:8081"
    fi
    echo "==========================================="
}

# Main execution
main() {
    echo ""
    log_info "==========================================="
    log_info "Ticket Hub - Huawei Cloud Deployment"
    log_info "==========================================="
    echo ""
    
    check_prerequisites
    setup_ssh
    install_dependencies
    setup_database
    deploy_application
    configure_environment
    setup_nginx
    setup_ssl
    start_application
    verify_deployment
    show_summary
    
    log_info "Deployment completed successfully! 🎉"
}

# Run main function
main
