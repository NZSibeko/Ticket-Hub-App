# 🧹 Simple Cleanup Guide - Ticket-Hub-App

## Quick Decision Matrix

### ❌ DELETE THESE FILES (Safe to Remove)

#### Database Files (15MB+ total)
```
backend/ticket_hub.db              ← DELETE (15MB database)
backend/ticket_hub.db-shm          ← DELETE
backend/ticket_hub.db-wal          ← DELETE (4.5MB)
backend/ticket_hub.db.backup       ← DELETE
backend/ticket_hub_backup.db       ← DELETE (4.8MB)
```
**Why**: Never commit database files. Use migrations instead.

#### Duplicate WebSocket Files
```
backend/websocket-server.tsx       ← DELETE (30KB) - Keep only main implementation
backend/fixed-websocket.tsx        ← DELETE (7KB) - Duplicate
backend/simple-websocket.tsx       ← DELETE (3KB) - Duplicate  
backend/socket.tsx                 ← DELETE (5KB) - Duplicate
backend/websocket-connection.tsx   ← DELETE (11KB) - Duplicate
backend/websocket-test.tsx         ← DELETE or move to tests/
```
**Why**: 6 different WebSocket implementations = confusion. Keep only ONE.

#### Duplicate Server Files
```
server.ts                          ← DELETE (root level) - Use backend/server.ts
database.ts                        ← DELETE (88KB) - Split into backend/src/database/
migrate_tables.tsx                 ← DELETE or move to backend/prisma/migrations/
```
**Why**: Consolidate into backend/src/ structure.

#### Web-Specific Files (if mobile-only)
```
App.web.tsx                        ← DELETE or move to apps/web/
index.web.tsx                      ← DELETE or move to apps/web/
webpack.config.tsx                 ← DELETE or move to apps/web/
```
**Why**: Separate web and mobile apps.

#### Dependencies (Will Reinstall)
```
node_modules/                      ← DELETE (root)
backend/node_modules/              ← DELETE
```
**Why**: Reinstall with proper workspace structure.

---

### ✅ KEEP THESE FILES

#### Root Level
```
package.json                       ← KEEP (will update)
package-lock.json                  ← KEEP (will regenerate)
.gitignore                         ← KEEP (will update)
README.md                          ← KEEP
app.json                           ← KEEP (Expo config)
App.tsx                            ← KEEP (main mobile app)
index.ts                           ← KEEP (mobile entry)
tsconfig.json                      ← KEEP (will update)
babel.config.tsx                   ← KEEP
eslint.config.tsx                  ← KEEP
```

#### Backend
```
backend/package.json               ← KEEP (will update)
backend/server.ts                  ← KEEP (55KB - main server)
backend/Dockerfile                 ← KEEP
backend/ecosystem.config.js        ← KEEP (PM2 config)
backend/.env                       ← KEEP (but add to .gitignore)
backend/.env.example               ← KEEP
backend/tsconfig.json              ← KEEP
backend/prisma/                    ← KEEP entire folder
```

#### Source Code
```
src/                               ← KEEP (mobile source)
components/                        ← KEEP
screens/                           ← KEEP
navigation/                        ← KEEP
hooks/                             ← KEEP
constants/                         ← KEEP
assets/                            ← KEEP
```

#### Infrastructure
```
docker-compose.yml                 ← KEEP
nginx/                             ← KEEP entire folder
scripts/                           ← KEEP
```

#### Documentation
```
DEPLOYMENT.md                      ← KEEP
DEPLOYMENT_CHECKLIST.md            ← KEEP
QUICK_START.md                     ← KEEP
HUAWEI_CLOUD_COSTS.md              ← KEEP
PROJECT_STRUCTURE.md               ← KEEP
CLEANUP_PLAN.md                    ← KEEP
```

---

## 🎯 Manual Cleanup Steps (15 minutes)

### Step 1: Delete Database Files (1 min)
```powershell
# In Ticket-Hub-App folder
Remove-Item backend\*.db -Force
Remove-Item backend\*.db-shm -Force
Remove-Item backend\*.db-wal -Force
Remove-Item backend\*.backup -Force
```

### Step 2: Delete Duplicate WebSocket Files (1 min)
```powershell
Remove-Item backend\websocket-server.tsx -Force
Remove-Item backend\fixed-websocket.tsx -Force
Remove-Item backend\simple-websocket.tsx -Force
Remove-Item backend\socket.tsx -Force
Remove-Item backend\websocket-connection.tsx -Force
Remove-Item backend\websocket-test.tsx -Force
```

### Step 3: Delete Root Server Files (1 min)
```powershell
Remove-Item server.ts -Force
Remove-Item database.ts -Force
Remove-Item migrate_tables.tsx -Force
```

### Step 4: Delete node_modules (2 min)
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force backend\node_modules
```

### Step 5: Update .gitignore (2 min)

Add this to your `.gitignore`:
```gitignore
# Database
*.db
*.db-shm
*.db-wal
*.backup

# Logs
*.log
logs/
backend/logs/

# Uploads
uploads/
backend/uploads/

# Build
dist/
backend/dist/
.expo/

# Environment
.env
.env.production
```

### Step 6: Create New Folder Structure (3 min)
```powershell
# Create organized structure
New-Item -ItemType Directory -Path backend\src\routes -Force
New-Item -ItemType Directory -Path backend\src\services -Force
New-Item -ItemType Directory -Path backend\src\middleware -Force
New-Item -ItemType Directory -Path backend\src\database -Force
New-Item -ItemType Directory -Path backend\src\websocket -Force
New-Item -ItemType Directory -Path backend\src\utils -Force
New-Item -ItemType Directory -Path backend\tests -Force
New-Item -ItemType Directory -Path backend\logs -Force
```

### Step 7: Move Files (3 min)
```powershell
# Move large backend files into src
Move-Item backend\server.ts backend\src\
Move-Item backend\database.ts backend\src\database\ 2>$null

# Move infrastructure
New-Item -ItemType Directory -Path infrastructure -Force
Move-Item docker-compose.yml infrastructure\
Move-Item nginx infrastructure\ -Force
```

### Step 8: Reinstall Dependencies (2 min)
```powershell
# Clean install
npm install
```

---

## ✅ After Cleanup Checklist

- [ ] Database files deleted
- [ ] Duplicate WebSocket files deleted
- [ ] node_modules deleted and reinstalled
- [ ] .gitignore updated
- [ ] backend/src/ structure created
- [ ] All tests passing
- [ ] App runs: `npm start`
- [ ] Backend runs: `npm run server`

---

## 🚀 Automated Option

Instead of manual cleanup, run the script:

```powershell
.\scripts\Cleanup-Restructure.ps1
```

This will:
1. ✅ Create backup automatically
2. ✅ Delete all files listed above
3. ✅ Create new folder structure
4. ✅ Update package.json for workspaces
5. ✅ Update .gitignore

**Time**: 5 minutes vs 15 minutes manual

---

## 📊 Expected Results

### Before Cleanup
```
Ticket-Hub-App/
├── node_modules/ (800MB+)
├── backend/node_modules/ (200MB+)
├── backend/ticket_hub.db (15MB)
├── backend/*.db-* (5MB+)
├── backend/websocket-*.tsx (6 files, 57KB)
├── server.ts (duplicate)
├── database.ts (88KB)
└── Mixed mobile/web code

Total: ~1.2GB, messy structure
```

### After Cleanup
```
Ticket-Hub-App/
├── apps/mobile/ (mobile code only)
├── backend/src/ (organized backend)
├── infrastructure/ (deployment configs)
├── docs/ (documentation)
├── node_modules/ (single, workspace)
└── .gitignore (blocks DB files)

Total: ~400MB, clean structure
```

**Size reduction**: ~800MB (67% smaller)  
**Files organized**: ✅  
**Ready for deployment**: ✅

---

## 🆘 If Something Breaks

### Restore from Backup
```powershell
# Script creates backup automatically
# Restore with:
Copy-Item -Path "..\Ticket-Hub-App-Backup-*" -Destination "." -Recurse -Force
```

### Reinstall Everything
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### Check What Changed
```powershell
git status
git diff
```

---

## Questions?

**Q: Will I lose my code?**  
A: No! The script creates a backup first. Your code stays, just organized better.

**Q: What about my database data?**  
A: Export important data first! Database files shouldn't be in git anyway. Use migrations.

**Q: Can I undo this?**  
A: Yes! Use the backup folder created by the script.

**Q: How long will this take?**  
A: 5 minutes with script, 15 minutes manual.

---

**Ready?** Run the script or follow manual steps above! ⚡
