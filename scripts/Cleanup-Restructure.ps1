# ===========================================
# Ticket-Hub-App Cleanup Script (PowerShell)
# ===========================================
# This script restructures the project for clean deployment
# 
# Usage: .\scripts\Cleanup-Restructure.ps1
# ===========================================

$ErrorActionPreference = "Stop"

# Colors
function Log-Info { Write-Host "[INFO] $args" -ForegroundColor Green }
function Log-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Log-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Log-Step { Write-Host "[STEP] $args" -ForegroundColor Blue }

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Log-Error "Please run this script from Ticket-Hub-App root directory"
    exit 1
}

Log-Step "=========================================="
Log-Step "Ticket-Hub-App Cleanup & Restructure"
Log-Step "=========================================="
Write-Host ""

# Phase 1: Create Backup
Log-Step "Phase 1: Creating backup..."
$BackupDir = "..\Ticket-Hub-App-Backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path "." -Destination $BackupDir -Recurse -Force
Log-Info "Backup created: $BackupDir"
Write-Host ""

# Phase 2: Delete Database Files
Log-Step "Phase 2: Removing database files..."
Get-ChildItem -Path "backend" -Filter "*.db" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "backend" -Filter "*.db-shm" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "backend" -Filter "*.db-wal" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "backend" -Filter "*.backup" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "backend" -Filter "*.db.backup" -ErrorAction SilentlyContinue | Remove-Item -Force
Log-Info "Database files removed"
Write-Host ""

# Phase 3: Delete Duplicate WebSocket Implementations
Log-Step "Phase 3: Removing duplicate WebSocket files..."
$WebSocketFiles = @(
    "backend\fixed-websocket.tsx",
    "backend\simple-websocket.tsx",
    "backend\socket.tsx",
    "backend\websocket-connection.tsx",
    "backend\websocket-test.tsx"
)
foreach ($file in $WebSocketFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Log-Info "Removed: $file"
    }
}
Log-Info "Duplicate WebSocket files removed"
Write-Host ""

# Phase 4: Create New Directory Structure
Log-Step "Phase 4: Creating new directory structure..."

$Directories = @(
    "apps\mobile",
    "apps\web",
    "backend\src\routes",
    "backend\src\services",
    "backend\src\middleware",
    "backend\src\database",
    "backend\src\websocket",
    "backend\src\utils",
    "backend\src\types",
    "backend\tests",
    "backend\logs",
    "backend\uploads",
    "infrastructure\docker",
    "infrastructure\nginx",
    "infrastructure\scripts",
    "infrastructure\ci-cd",
    "docs"
)

foreach ($dir in $Directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Log-Info "Directory structure created"
Write-Host ""

# Phase 5: Move Files to New Locations
Log-Step "Phase 5: Moving files to new locations..."

# Move mobile app files
$MobileDirs = @("app", "src", "components", "screens", "navigation", "hooks", "constants", "assets")
foreach ($dir in $MobileDirs) {
    if (Test-Path $dir) {
        Move-Item -Path $dir -Destination "apps\mobile\" -Force
        Log-Info "Moved: $dir → apps\mobile\"
    }
}

# Move infrastructure files
if (Test-Path "docker-compose.yml") {
    Move-Item -Path "docker-compose.yml" -Destination "infrastructure\docker\" -Force
}
if (Test-Path "nginx") {
    Move-Item -Path "nginx" -Destination "infrastructure\" -Force
}
if (Test-Path "scripts") {
    # Don't move scripts into itself, skip
}

# Move documentation
$DocFiles = @("DEPLOYMENT.md", "DEPLOYMENT_CHECKLIST.md", "QUICK_START.md", "HUAWEI_CLOUD_COSTS.md", "PROJECT_STRUCTURE.md", "CLEANUP_PLAN.md")
foreach ($file in $DocFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\" -Force
        Log-Info "Moved: $file → docs\"
    }
}

Log-Info "Files moved to new locations"
Write-Host ""

# Phase 6: Update .gitignore
Log-Step "Phase 6: Updating .gitignore..."
$GitIgnoreAddition = @"

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
"@

Add-Content -Path ".gitignore" -Value $GitIgnoreAddition
Log-Info ".gitignore updated"
Write-Host ""

# Phase 7: Create Workspace Package.json
Log-Step "Phase 7: Creating workspace configuration..."

# Backup old package.json
Move-Item -Path "package.json" -Destination "package.json.old" -Force

# Create new root package.json
$RootPackageJson = @{
    name = "ticket-hub-monorepo"
    version = "1.0.0"
    private = $true
    description = "Ticket Hub - Event Ticketing Platform"
    workspaces = @("apps/mobile", "apps/web", "backend")
    scripts = @{
        dev = "concurrently `"npm run dev:mobile`" `"npm run dev:backend`""
        "dev:mobile" = "npm run start --workspace=apps/mobile"
        "dev:backend" = "npm run dev --workspace=backend"
        "dev:web" = "npm run dev --workspace=apps/web"
        build = "npm run build --workspaces --if-present"
        "build:mobile" = "npm run build --workspace=apps/mobile"
        "build:backend" = "npm run build --workspace=backend"
        "build:web" = "npm run build --workspace=apps/web"
        "install:all" = "npm install --workspaces"
        clean = "npm run clean --workspaces --if-present"
        test = "npm run test --workspaces --if-present"
        lint = "npm run lint --workspaces --if-present"
    }
    devDependencies = @{
        concurrently = "^8.2.2"
    }
    engines = @{
        node = ">=20.0.0"
        npm = ">=10.0.0"
    }
} | ConvertTo-Json -Depth 10

$RootPackageJson | Out-File -FilePath "package.json" -Encoding UTF8

Log-Info "Workspace package.json created"
Write-Host ""

Log-Step "=========================================="
Log-Step "✅ Cleanup & Restructure Complete!"
Log-Step "=========================================="
Write-Host ""
Log-Info "Backup created: $BackupDir"
Write-Host ""
Log-Info "New structure:"
Write-Host "  📱 apps/mobile/     - React Native app"
Write-Host "  🌐 apps/web/        - React web app (placeholder)"
Write-Host "  🔧 backend/         - Node.js API server"
Write-Host "  🏗️  infrastructure/  - Docker, Nginx, scripts"
Write-Host "  📚 docs/            - Documentation"
Write-Host ""
Log-Warn "Next steps:"
Write-Host "  1. Review the changes"
Write-Host "  2. Move your existing code to new structure"
Write-Host "  3. Run: npm install"
Write-Host "  4. Test: npm run dev"
Write-Host ""
Log-Info "See docs/CLEANUP_PLAN.md for detailed instructions"
Write-Host ""
