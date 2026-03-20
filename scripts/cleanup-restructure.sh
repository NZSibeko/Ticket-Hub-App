#!/bin/bash
# ===========================================
# Ticket-Hub-App Cleanup Script
# ===========================================
# This script restructures the project for clean deployment
# 
# Usage: ./scripts/cleanup-restructure.sh
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from Ticket-Hub-App root directory"
    exit 1
fi

log_step "=========================================="
log_step "Ticket-Hub-App Cleanup & Restructure"
log_step "=========================================="
echo ""

# Phase 1: Create Backup
log_step "Phase 1: Creating backup..."
BACKUP_DIR="../Ticket-Hub-App-Backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
log_info "Backup created: $BACKUP_DIR"
echo ""

# Phase 2: Delete Database Files
log_step "Phase 2: Removing database files..."
rm -f backend/*.db
rm -f backend/*.db-shm
rm -f backend/*.db-wal
rm -f backend/*.backup
rm -f backend/*.db.backup
log_info "Database files removed"
echo ""

# Phase 3: Delete Duplicate WebSocket Implementations
log_step "Phase 3: Removing duplicate WebSocket files..."
# Keep only the main implementation, remove duplicates
rm -f backend/fixed-websocket.tsx
rm -f backend/simple-websocket.tsx
rm -f backend/socket.tsx
rm -f backend/websocket-connection.tsx
rm -f backend/websocket-test.tsx
log_info "Duplicate WebSocket files removed"
echo ""

# Phase 4: Create New Directory Structure
log_step "Phase 4: Creating new directory structure..."

# Create apps directory for mobile/web separation
mkdir -p apps/mobile
mkdir -p apps/web

# Create proper backend structure
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/src/middleware
mkdir -p backend/src/database
mkdir -p backend/src/websocket
mkdir -p backend/src/utils
mkdir -p backend/src/types
mkdir -p backend/tests
mkdir -p backend/logs
mkdir -p backend/uploads

# Create infrastructure directory
mkdir -p infrastructure/docker
mkdir -p infrastructure/nginx
mkdir -p infrastructure/scripts
mkdir -p infrastructure/ci-cd

# Create docs directory
mkdir -p docs

log_info "Directory structure created"
echo ""

# Phase 5: Move Files to New Locations
log_step "Phase 5: Moving files to new locations..."

# Move mobile app files
if [ -d "app" ]; then
    mv app apps/mobile/ 2>/dev/null || true
fi
if [ -d "src" ]; then
    mv src apps/mobile/ 2>/dev/null || true
fi
if [ -d "components" ]; then
    mv components apps/mobile/ 2>/dev/null || true
fi
if [ -d "screens" ]; then
    mv screens apps/mobile/ 2>/dev/null || true
fi
if [ -d "navigation" ]; then
    mv navigation apps/mobile/ 2>/dev/null || true
fi
if [ -d "hooks" ]; then
    mv hooks apps/mobile/ 2>/dev/null || true
if [ -d "constants" ]; then
    mv constants apps/mobile/ 2>/dev/null || true
fi
if [ -d "assets" ]; then
    mv assets apps/mobile/ 2>/dev/null || true
fi

# Move infrastructure files
if [ -f "docker-compose.yml" ]; then
    mv docker-compose.yml infrastructure/docker/
fi
if [ -d "nginx" ]; then
    mv nginx infrastructure/
fi
if [ -d "scripts" ]; then
    mv scripts infrastructure/
fi

# Move documentation
if [ -f "DEPLOYMENT.md" ]; then
    mv DEPLOYMENT.md docs/
fi
if [ -f "DEPLOYMENT_CHECKLIST.md" ]; then
    mv DEPLOYMENT_CHECKLIST.md docs/
fi
if [ -f "QUICK_START.md" ]; then
    mv QUICK_START.md docs/
fi
if [ -f "HUAWEI_CLOUD_COSTS.md" ]; then
    mv HUAWEI_CLOUD_COSTS.md docs/
fi
if [ -f "PROJECT_STRUCTURE.md" ]; then
    mv PROJECT_STRUCTURE.md docs/
fi
if [ -f "CLEANUP_PLAN.md" ]; then
    mv CLEANUP_PLAN.md docs/
fi

log_info "Files moved to new locations"
echo ""

# Phase 6: Update .gitignore
log_step "Phase 6: Updating .gitignore..."
cat >> .gitignore << 'EOF'

# ===========================================
# Database Files
# ===========================================
*.db
*.db-shm
*.db-wal
*.db.backup
*.backup

# ===========================================
# Logs
# ===========================================
*.log
logs/
backend/logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# ===========================================
# Uploads & Temp
# ===========================================
uploads/
backend/uploads/
temp/
tmp/

# ===========================================
# Build Outputs
# ===========================================
dist/
backend/dist/
build/
.expo/
.expo-shared/
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# ===========================================
# Environment
# ===========================================
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production

# ===========================================
# IDE
# ===========================================
.idea/
.vscode/
*.swp
*.swo
*~

# ===========================================
# OS
# ===========================================
.DS_Store
Thumbs.db
Desktop.ini

# ===========================================
# Testing
# ===========================================
coverage/
.nyc_output/

# ===========================================
# Misc
# ===========================================
*.pem
*.cert
pm2-error.log
pm2-out.log
EOF
log_info ".gitignore updated"
echo ""

# Phase 7: Create Workspace Package.json
log_step "Phase 7: Creating workspace configuration..."

# Backup old package.json
mv package.json package.json.old

# Create new root package.json
cat > package.json << 'EOF'
{
  "name": "ticket-hub-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "Ticket Hub - Event Ticketing Platform",
  "workspaces": [
    "apps/mobile",
    "apps/web",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:mobile\" \"npm run dev:backend\"",
    "dev:mobile": "npm run start --workspace=apps/mobile",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:web": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces --if-present",
    "build:mobile": "npm run build --workspace=apps/mobile",
    "build:backend": "npm run build --workspace=backend",
    "build:web": "npm run build --workspace=apps/web",
    "install:all": "npm install --workspaces",
    "clean": "npm run clean --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
EOF

log_info "Workspace package.json created"
echo ""

# Phase 8: Create Mobile package.json
log_step "Phase 8: Creating mobile app package.json..."

mkdir -p apps/mobile
cat > apps/mobile/package.json << 'EOF'
{
  "name": "@ticket-hub/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "dev": "expo start",
    "build": "eas build --platform all",
    "clean": "rm -rf .expo node_modules",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "expo": "~54.0.12",
    "expo-status-bar": "~3.0.8",
    "expo-router": "~6.0.0",
    "react": "19.1.0",
    "react-native": "0.81.4",
    "@react-navigation/native": "^7.1.18",
    "@react-navigation/stack": "^7.4.9",
    "@react-navigation/bottom-tabs": "^7.4.8",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "axios": "^1.13.2",
    "@stripe/stripe-react-native": "^0.54.1",
    "expo-camera": "~17.0.9",
    "expo-image-picker": "~17.0.8",
    "react-native-qrcode-scanner": "^1.5.5",
    "react-native-qrcode-svg": "^6.3.15",
    "react-native-svg": "^15.13.0",
    "i18next": "^25.5.3",
    "react-i18next": "^16.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.28.4",
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2",
    "jest": "^29.7.0",
    "eslint": "^10.0.0",
    "eslint-config-expo": "^10.0.0"
  }
}
EOF

log_info "Mobile package.json created"
echo ""

# Phase 9: Create Backend package.json
log_step "Phase 9: Creating backend package.json..."

# Backup old backend package.json if exists
if [ -f "backend/package.json" ]; then
    mv backend/package.json backend/package.json.old
fi

cat > backend/package.json << 'EOF'
{
  "name": "@ticket-hub/backend",
  "version": "1.0.0",
  "private": true,
  "description": "Ticket Hub Backend API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "clean": "rm -rf dist node_modules",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "prisma:generate": "prisma generate",
    "db:seed": "ts-node src/database/seed.ts"
  },
  "dependencies": {
    "express": "^5.2.1",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.3",
    "uuid": "^13.0.0",
    "ws": "^8.18.3",
    "socket.io": "^4.8.3",
    "@prisma/client": "^5.22.0",
    "axios": "^1.13.2",
    "cheerio": "^1.1.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "compression": "^1.7.5",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^25.2.3",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/uuid": "^10.0.0",
    "@types/ws": "^8.18.1",
    "typescript": "^5.9.3",
    "ts-node": "^10.9.2",
    "prisma": "^5.14.0",
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.14",
    "eslint": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.26.0",
    "@typescript-eslint/parser": "^8.26.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

log_info "Backend package.json created"
echo ""

# Phase 10: Create Backend TypeScript Config
log_step "Phase 10: Creating backend tsconfig.json..."

cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@routes/*": ["src/routes/*"],
      "@services/*": ["src/services/*"],
      "@middleware/*": ["src/middleware/*"],
      "@database/*": ["src/database/*"],
      "@websocket/*": ["src/websocket/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

log_info "Backend tsconfig.json created"
echo ""

# Phase 11: Create Backend Entry Point
log_step "Phase 11: Creating backend entry point..."

cat > backend/src/index.ts << 'EOF'
/**
 * Ticket Hub Backend - Main Entry Point
 */

import app from './server';
import { initializeWebSocket } from './websocket';
import { PORT } from './utils/config';

const server = app.listen(PORT, () => {
  console.log(`🚀 Ticket Hub API running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize WebSocket
initializeWebSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;
EOF

log_info "Backend entry point created"
echo ""

# Phase 12: Create Basic Server Setup
log_step "Phase 12: Creating basic server setup..."

cat > backend/src/server.ts << 'EOF'
/**
 * Express Server Configuration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes (placeholder)
app.use('/api', (req, res) => {
  res.json({ message: 'Ticket Hub API - Routes coming soon' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

export default app;
EOF

log_info "Server setup created"
echo ""

# Phase 13: Create Config Utility
log_step "Phase 13: Creating config utility..."

cat > backend/src/utils/config.ts << 'EOF'
/**
 * Application Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 8081;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

// Validate required environment variables
if (NODE_ENV === 'production' && !DATABASE_URL) {
  console.error('❌ DATABASE_URL is required in production');
  process.exit(1);
}

if (NODE_ENV === 'production' && JWT_SECRET === 'dev-secret-change-in-production') {
  console.error('❌ JWT_SECRET must be changed in production');
  process.exit(1);
}

export default {
  PORT,
  NODE_ENV,
  DATABASE_URL,
  JWT_SECRET,
  ALLOWED_ORIGINS,
};
EOF

log_info "Config utility created"
echo ""

# Phase 14: Create WebSocket Setup
log_step "Phase 14: Creating WebSocket setup..."

cat > backend/src/websocket/index.ts << 'EOF'
/**
 * WebSocket Server Setup
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('📡 WebSocket server initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initializeWebSocket first.');
  }
  return io;
}

export default io;
EOF

log_info "WebSocket setup created"
echo ""

# Final Summary
echo ""
log_step "=========================================="
log_step "✅ Cleanup & Restructure Complete!"
log_step "=========================================="
echo ""
log_info "Backup created: $BACKUP_DIR"
echo ""
log_info "New structure:"
echo "  📱 apps/mobile/     - React Native app"
echo "  🌐 apps/web/        - React web app (placeholder)"
echo "  🔧 backend/         - Node.js API server"
echo "  🏗️  infrastructure/  - Docker, Nginx, scripts"
echo "  📚 docs/            - Documentation"
echo ""
log_warn "Next steps:"
echo "  1. Review the changes"
echo "  2. Move your existing code to new structure"
echo "  3. Run: npm install"
echo "  4. Test: npm run dev"
echo ""
log_info "See docs/CLEANUP_PLAN.md for detailed instructions"
echo ""
