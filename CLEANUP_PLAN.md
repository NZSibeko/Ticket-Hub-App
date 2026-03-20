# 🧹 Ticket-Hub-App Cleanup & Restructuring Plan

## Current Issues

### 1. Duplicate Dependencies
- ❌ `node_modules/` in root (854KB package-lock.json)
- ❌ `backend/node_modules/` (102KB package-lock.json)
- **Problem**: Wasted space, version conflicts, deployment confusion

### 2. Scattered Backend Code
- ❌ Root: `server.ts`, `database.ts` (88KB!)
- ❌ `backend/server.ts` (55KB)
- ❌ `src/server/websocketServer.tsx`
- **Problem**: Unclear which is the actual backend

### 3. Database Files in Repo
- ❌ `backend/ticket_hub.db` (15MB)
- ❌ `backend/ticket_hub.db-shm`, `ticket_hub.db-wal`
- ❌ `backend/ticket_hub.db.backup`
- ❌ `backend/ticket_hub_backup.db`
- **Problem**: Should never commit database files, bloats repo

### 4. Multiple WebSocket Implementations
- ❌ `backend/websocket-server.tsx` (30KB)
- ❌ `backend/fixed-websocket.tsx` (7KB)
- ❌ `backend/simple-websocket.tsx` (3KB)
- ❌ `backend/socket.tsx` (5KB)
- ❌ `backend/websocket-connection.tsx` (11KB)
- ❌ `backend/websocket-test.tsx`
- **Problem**: Code duplication, unclear which is production

### 5. Mixed Mobile/Web Code
- ❌ `App.tsx` and `App.web.tsx` in root
- ❌ `index.ts` and `index.web.tsx` in root
- **Problem**: Should be in separate `apps/mobile` and `apps/web` folders

### 6. Unclear Package Structure
- Root `package.json` has both frontend AND backend dependencies
- **Problem**: Can't deploy backend separately, bloated container images

---

## 🎯 Target Structure

```
Ticket-Hub-App/
│
├── apps/
│   ├── mobile/                    # React Native app
│   │   ├── app/                   # Expo file-based routing
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── navigation/
│   │   │   ├── services/          # API calls
│   │   │   ├── utils/
│   │   │   └── config/
│   │   ├── assets/
│   │   ├── package.json           # Mobile dependencies only
│   │   ├── tsconfig.json
│   │   └── app.json
│   │
│   └── web/                       # React web app (optional)
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── webpack.config.js
│
├── backend/                       # Node.js/Express API
│   ├── src/
│   │   ├── index.ts               # Main entry point
│   │   ├── server.ts              # Express server setup
│   │   ├── websocket/             # WebSocket server
│   │   │   ├── index.ts
│   │   │   └── handlers.ts
│   │   ├── routes/                # API routes
│   │   │   ├── auth.ts
│   │   │   ├── events.ts
│   │   │   ├── payments.ts
│   │   │   └── index.ts
│   │   ├── services/              # Business logic
│   │   │   ├── auth.ts
│   │   │   ├── events.ts
│   │   │   ├── scraping.ts
│   │   │   └── whatsapp.ts
│   │   ├── database/              # Database layer
│   │   │   ├── index.ts
│   │   │   ├── prisma.ts
│   │   │   └── migrations/
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── error.ts
│   │   ├── utils/                 # Utilities
│   │   └── types/                 # TypeScript types
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── tests/
│   ├── logs/                      # .gitignore
│   ├── uploads/                   # .gitignore
│   ├── package.json               # Backend dependencies only
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── ecosystem.config.js        # PM2 config
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── Dockerfile.backend
│   │
│   ├── nginx/
│   │   └── nginx.conf
│   │
│   ├── scripts/
│   │   ├── deploy-huawei.sh
│   │   ├── backup-db.sh
│   │   └── setup-server.sh
│   │
│   └── ci-cd/
│       └── github-actions/
│
├── docs/
│   ├── DEPLOYMENT.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── QUICK_START.md
│   ├── HUAWEI_CLOUD_COSTS.md
│   ├── PROJECT_STRUCTURE.md
│   ├── CLEANUP_PLAN.md (this file)
│   └── API.md
│
├── .gitignore
├── .env.example
├── package.json                   # Root: workspace config only
├── tsconfig.base.json             # Shared TypeScript config
└── README.md
```

---

## 🗑️ Files to Delete

### Immediate Deletion (Safe)
```
backend/ticket_hub.db              # 15MB database file
backend/ticket_hub.db-shm          # SQLite shared memory
backend/ticket_hub.db-wal          # SQLite write-ahead log
backend/ticket_hub.db.backup       # Backup file
backend/ticket_hub_backup.db       # Another backup

backend/websocket-server.tsx       # Duplicate implementation
backend/fixed-websocket.tsx        # Duplicate implementation
backend/simple-websocket.tsx       # Duplicate implementation
backend/socket.tsx                 # Duplicate implementation
backend/websocket-connection.tsx   # Duplicate implementation
backend/websocket-test.tsx         # Test file (move to tests/)

backend/database.ts                # 88KB - consolidate into backend/src/database/
backend/migrate_tables.tsx         # Migration script (move to prisma/migrations/)

server.ts                          # Root server file (duplicate)
App.web.tsx                        # Move to apps/web/
index.web.tsx                      # Move to apps/web/
webpack.config.tsx                 # Move to apps/web/

node_modules/                      # Delete and reinstall properly
backend/node_modules/              # Delete and reinstall properly
```

### Files to Consolidate
```
backend/database.ts (88KB) → Split into:
  - backend/src/database/index.ts
  - backend/src/database/models/
  - backend/src/database/migrations/

backend/server.ts (55KB) → Split into:
  - backend/src/index.ts (entry point)
  - backend/src/server.ts (Express setup)
  - backend/src/routes/ (API routes)
```

---

## 📦 Package.json Strategy

### Root package.json (Workspace)
```json
{
  "name": "ticket-hub-monorepo",
  "private": true,
  "workspaces": ["apps/*", "backend"],
  "scripts": {
    "dev": "concurrently \"npm run dev:mobile\" \"npm run dev:backend\"",
    "dev:mobile": "npm run dev --workspace=apps/mobile",
    "dev:backend": "npm run dev --workspace=backend",
    "build": "npm run build --workspaces",
    "build:mobile": "npm run build --workspace=apps/mobile",
    "build:backend": "npm run build --workspace=backend",
    "install:all": "npm install --workspaces",
    "clean": "npm run clean --workspaces"
  }
}
```

### apps/mobile/package.json
- React Native dependencies only
- No backend dependencies (express, pg, etc.)

### backend/package.json
- Node.js dependencies only
- No React/Expo dependencies

---

## 🔄 Migration Steps

### Phase 1: Backup (5 min)
```bash
cd Ticket-Hub-App
# Create backup
Copy-Item -Path . -Destination ../Ticket-Hub-App-Backup -Recurse
```

### Phase 2: Clean Database Files (2 min)
```bash
# Delete all database files
Remove-Item backend/*.db -Force
Remove-Item backend/*.db-shm -Force
Remove-Item backend/*.db-wal -Force
Remove-Item backend/*.backup -Force
```

### Phase 3: Consolidate Backend (30 min)
1. Create `backend/src/` directory structure
2. Move and split large files
3. Update imports
4. Test backend still works

### Phase 4: Separate Mobile App (30 min)
1. Create `apps/mobile/` directory
2. Move mobile-specific files
3. Create separate package.json
4. Update paths and imports

### Phase 5: Clean Dependencies (10 min)
```bash
# Delete all node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force backend/node_modules

# Reinstall properly
npm install
```

### Phase 6: Update .gitignore (5 min)
Add:
```
# Database
*.db
*.db-shm
*.db-wal
*.backup

# Logs
*.log
logs/

# Uploads
uploads/
temp/

# Build
dist/
build/
.expo/

# Environment
.env
.env.local
.env.production
```

### Phase 7: Test Everything (15 min)
```bash
# Test backend
cd backend
npm run dev

# Test mobile
cd apps/mobile
npm start
```

---

## ✅ Benefits After Cleanup

| Before | After |
|--------|-------|
| ❌ 15MB database in repo | ✅ No database files |
| ❌ Duplicate node_modules | ✅ Single workspace install |
| ❌ Mixed mobile/backend deps | ✅ Separate packages |
| ❌ 6 WebSocket implementations | ✅ 1 clean implementation |
| ❌ 88KB monolithic database.ts | ✅ Modular database layer |
| ❌ Unclear deployment target | ✅ Clear backend/ folder |
| ❌ Bloated Docker images | ✅ Minimal, optimized images |

**Estimated repo size reduction**: ~20MB → ~5MB (75% smaller)

---

## 🚀 Ready to Proceed?

Tell me if you want me to:

1. **Execute the cleanup automatically** - I'll restructure everything
2. **Do it step-by-step** - We'll go through each phase together
3. **Create the scripts first** - You review, then run them
4. **Modify the plan** - Adjust based on your preferences

Which approach do you prefer? ⚡
