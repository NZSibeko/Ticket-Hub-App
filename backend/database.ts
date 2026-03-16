// @ts-nocheck
// backend/database.js - ULTIMATE FIXED VERSION
export {};
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');

// ========================
// GLOBAL DATABASE INSTANCE
// ========================
let globalDatabaseInstance = null;
let globalDbOperations = null;
let isInitializing = false;
let initializationPromise = null;
let initializationCallbacks = [];

// ========================
// ENHANCED DATABASE CLASS
// ========================
class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DATABASE_PATH 
            ? process.env.DATABASE_PATH
            : path.join(__dirname, 'ticket_hub.db');
        this.dbOperations = null;
        this.isInitialized = false;
        this.initializationTime = null;
        console.log(`Database path: ${this.dbPath}`);
    }

    // Initialize database (connect and set up tables)
    async initialize() {
        if (this.isInitialized) {
            console.log('Database already initialized');
            return this;
        }

        return new Promise((resolve, reject) => {
            try {
                // Create database directory if it doesn't exist
                const dbDir = path.dirname(this.dbPath);
                if (!fsSync.existsSync(dbDir)) {
                    fsSync.mkdirSync(dbDir, { recursive: true });
                }

                console.log(`🔧 Initializing database at: ${this.dbPath}`);
                
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ Database connection error:', err.message);
                        reject(err);
                        return;
                    }
                    
                    console.log('✅ Connected to SQLite database');
                    
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON');
                    
                    // Set WAL mode for better concurrency
                    this.db.run('PRAGMA journal_mode = WAL');
                    
                    // Create helper methods
                    this.dbOperations = {
                        // Run a query
                        run: (sql, params = []) => {
                            return new Promise((resolve, reject) => {
                                this.db.run(sql, params, function(err) {
                                    if (err) {
                                        console.error('Database run error:', err.message);
                                        console.error('SQL:', sql);
                                        console.error('Params:', params);
                                        reject(err);
                                    } else {
                                        resolve({ 
                                            lastID: this.lastID, 
                                            changes: this.changes 
                                        });
                                    }
                                });
                            });
                        },

                        // Get a single row
                        get: (sql, params = []) => {
                            return new Promise((resolve, reject) => {
                                this.db.get(sql, params, (err, row) => {
                                    if (err) {
                                        console.error('Database get error:', err.message);
                                        console.error('SQL:', sql);
                                        reject(err);
                                    } else {
                                        resolve(row || null);
                                    }
                                });
                            });
                        },

                        // Get all rows
                        all: (sql, params = []) => {
                            return new Promise((resolve, reject) => {
                                this.db.all(sql, params, (err, rows) => {
                                    if (err) {
                                        console.error('Database all error:', err.message);
                                        console.error('SQL:', sql);
                                        reject(err);
                                    } else {
                                        resolve(rows || []);
                                    }
                                });
                            });
                        },

                        // Execute multiple statements
                        exec: (sql) => {
                            return new Promise((resolve, reject) => {
                                this.db.exec(sql, (err) => {
                                    if (err) {
                                        console.error('Database exec error:', err.message);
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                });
                            });
                        },

                        // Check if connected
                        isConnected: () => this.db !== null
                    };
                    
                    // Set global instances immediately
                    globalDatabaseInstance = this;
                    globalDbOperations = this.dbOperations;
                    
                    // Create tables and initialize
                    this.createTables().then(() => {
                        console.log('✅ Database tables ready');
                        this.isInitialized = true;
                        this.initializationTime = new Date();
                        
                        // Notify all waiting callbacks
                        initializationCallbacks.forEach(callback => callback());
                        initializationCallbacks = [];
                        
                        // Initialize the legacy system
                        initializeLegacySystem(this.dbOperations).then(() => {
                            console.log('✅ Legacy system initialized');
                            console.log('🚀 DATABASE FULLY INITIALIZED AND READY');
                            resolve(this);
                        }).catch(err => {
                            console.error('Legacy system init error:', err);
                            // Still resolve even if legacy init has errors
                            console.log('🚀 DATABASE READY (legacy init had errors)');
                            resolve(this);
                        });
                    }).catch(reject);
                });
            } catch (error) {
                console.error('❌ Error in initialize:', error);
                reject(error);
            }
        });
    }

    // Connect to database (legacy compatibility)
    async connect() {
        return this.initialize();
    }

    // Get database operations
    getOperations() {
        if (!this.dbOperations) {
            console.warn('⚠ Database operations not available yet');
            return null;
        }
        return this.dbOperations;
    }

    // Check if initialized
    isReady() {
        return this.isInitialized;
    }

    // Get initialization time
    getInitializationTime() {
        return this.initializationTime;
    }

    // Create all tables
    async createTables() {
        try {
            // Split the SQL into smaller chunks to avoid syntax errors
            const tablesSQL = [
                // 1. Support tables
                `CREATE TABLE IF NOT EXISTS support_conversations (
                    conversation_id TEXT PRIMARY KEY,
                    platform TEXT NOT NULL,
                    customer_id TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    customer_phone TEXT,
                    customer_email TEXT,
                    assigned_agent_id TEXT,
                    status TEXT DEFAULT 'active',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_message TEXT,
                    last_message_time TEXT,
                    resolved_at TEXT,
                    resolved_by TEXT,
                    metadata TEXT
                )`,

                `CREATE TABLE IF NOT EXISTS support_messages (
                    message_id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    sender_name TEXT NOT NULL,
                    sender_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    message_type TEXT DEFAULT 'text',
                    media_url TEXT,
                    media_type TEXT,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    platform TEXT NOT NULL,
                    is_read INTEGER DEFAULT 0,
                    delivered INTEGER DEFAULT 1,
                    metadata TEXT
                )`,

                `CREATE TABLE IF NOT EXISTS support_agent_status (
                    agent_id TEXT PRIMARY KEY,
                    status TEXT DEFAULT 'available',
                    auto_assign INTEGER DEFAULT 1,
                    last_active TEXT DEFAULT CURRENT_TIMESTAMP,
                    platform_preferences TEXT,
                    current_conversations INTEGER DEFAULT 0,
                    max_conversations INTEGER DEFAULT 5
                )`,

                // 2. User tables
                `CREATE TABLE IF NOT EXISTS event_managers (
                    manager_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    phone TEXT,
                    status TEXT DEFAULT 'active',
                    role TEXT DEFAULT 'event_manager',
                    last_login TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS admins (
                    admin_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    phone TEXT,
                    status TEXT DEFAULT 'active',
                    role TEXT DEFAULT 'admin',
                    last_login TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS customers (
                    customer_id TEXT PRIMARY KEY,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    phone TEXT,
                    status TEXT DEFAULT 'active',
                    role TEXT DEFAULT 'customer',
                    last_login TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS support_staff (
                    support_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT,
                    password TEXT NOT NULL,
                    phone TEXT,
                    department TEXT DEFAULT 'technical',
                    role TEXT DEFAULT 'support',
                    status TEXT DEFAULT 'active',
                    availability_status TEXT DEFAULT 'available',
                    max_tickets INTEGER DEFAULT 10,
                    current_tickets INTEGER DEFAULT 0,
                    avg_response_time INTEGER DEFAULT 0,
                    satisfaction_rating REAL DEFAULT 0.0,
                    last_login TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS event_organizers (
                    organizer_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT,
                    password TEXT NOT NULL,
                    phone TEXT,
                    company TEXT,
                    bio TEXT,
                    website TEXT,
                    status TEXT DEFAULT 'active',
                    role TEXT DEFAULT 'event_organizer',
                    permissions TEXT DEFAULT 'basic',
                    verified INTEGER DEFAULT 0,
                    stripe_customer_id TEXT,
                    subscription_status TEXT DEFAULT 'free',
                    last_login TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )`,

                // 3. Events and tickets
                `CREATE TABLE IF NOT EXISTS events (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_name TEXT NOT NULL,
                    description TEXT,
                    event_description TEXT,
                    start_date TEXT,
                    end_date TEXT,
                    location TEXT,
                    image_url TEXT,
                    event_image TEXT,
                    currency TEXT DEFAULT 'ZAR',
                    has_ticketing INTEGER DEFAULT 0,
                    ticket_types TEXT,
                    partnership_status TEXT DEFAULT 'untapped',
                    status TEXT DEFAULT 'DRAFT',
                    notes TEXT,
                    venue TEXT,
                    contact_email TEXT,
                    contact_phone TEXT,
                    organizer_name TEXT,
                    max_attendees INTEGER,
                    current_attendees INTEGER DEFAULT 0,
                    price REAL,
                    capacity INTEGER,
                    archived INTEGER DEFAULT 0,
                    requires_approval INTEGER DEFAULT 0,
                    category TEXT DEFAULT 'General',
                    created_by TEXT,
                    user_type TEXT,
                    source TEXT DEFAULT 'manual',
                    source_url TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(event_name, start_date, location)
                )`,

                `CREATE TABLE IF NOT EXISTS tickets (
                    ticket_id TEXT PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    customer_id TEXT NOT NULL,
                    ticket_code TEXT UNIQUE,
                    qr_code TEXT,
                    ticket_type TEXT NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    unit_price REAL,
                    total_amount REAL,
                    price REAL,
                    currency TEXT DEFAULT 'ZAR',
                    status TEXT DEFAULT 'confirmed',
                    ticket_status TEXT DEFAULT 'ACTIVE',
                    payment_status TEXT DEFAULT 'COMPLETED',
                    payment_id TEXT,
                    purchase_date TEXT DEFAULT (datetime('now')),
                    validation_date TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS payments (
                    payment_id TEXT PRIMARY KEY,
                    ticket_id TEXT NOT NULL,
                    customer_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'ZAR',
                    payment_method TEXT,
                    status TEXT DEFAULT 'pending',
                    payment_status TEXT DEFAULT 'pending',
                    transaction_id TEXT,
                    receipt_url TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    completed_at TEXT
                )`,

                `CREATE TABLE IF NOT EXISTS event_creation_registry (
                    registry_id TEXT PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    creator_user_id TEXT,
                    creator_email TEXT NOT NULL,
                    creator_role TEXT NOT NULL,
                    created_from TEXT DEFAULT 'web',
                    approval_required INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                // 4. Dashboard and support tickets
                `CREATE TABLE IF NOT EXISTS dashboard_user_list (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    joined TEXT,
                    lastActive TEXT,
                    avatar TEXT,
                    country TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS dashboard_metrics (
                    key TEXT PRIMARY KEY,
                    value TEXT -- JSON data
                )`,

                `CREATE TABLE IF NOT EXISTS support_tickets (
                    ticket_id TEXT PRIMARY KEY,
                    customer_id TEXT,
                    support_id TEXT,
                    subject TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'open',
                    assigned_at TEXT,
                    resolved_at TEXT,
                    resolution TEXT,
                    customer_satisfaction INTEGER,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS ticket_responses (
                    response_id TEXT PRIMARY KEY,
                    ticket_id TEXT NOT NULL,
                    responder_id TEXT,
                    response_type TEXT DEFAULT 'agent',
                    message TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    metadata TEXT,
                    FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE
                )`,

                // 5. System metrics tables (FIXED: Added missing NOT NULL)
                `CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_key TEXT UNIQUE NOT NULL,
                    metric_value TEXT NOT NULL,
                    metric_type TEXT DEFAULT 'gauge',
                    unit TEXT,
                    description TEXT,
                    updated_at TEXT DEFAULT (datetime('now')),
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    status_code INTEGER,
                    request_size INTEGER,
                    response_size INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS security_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    severity TEXT DEFAULT 'info',
                    user_id TEXT,
                    user_email TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    details TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS system_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT DEFAULT 'medium',
                    source_module TEXT,
                    affected_items TEXT,
                    recommendations TEXT,
                    acknowledged INTEGER DEFAULT 0,
                    acknowledged_by TEXT,
                    acknowledged_at TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS user_activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    user_email TEXT,
                    activity_type TEXT NOT NULL,
                    activity_details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS blocked_ips (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip_address TEXT UNIQUE NOT NULL,
                    reason TEXT,
                    blocked_by TEXT DEFAULT 'system',
                    attempts INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1,
                    expires_at TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS backup_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    backup_type TEXT DEFAULT 'automatic',
                    status TEXT NOT NULL,
                    size_mb REAL,
                    duration_seconds INTEGER,
                    details TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS system_uptime (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    service_name TEXT NOT NULL,
                    status TEXT DEFAULT 'up',
                    last_check TEXT,
                    response_time_ms INTEGER,
                    error_message TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                // 6. Extended metrics tables (ADDING MISSING TABLES)
                `CREATE TABLE IF NOT EXISTS api_endpoint_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    status_code INTEGER NOT NULL,
                    user_agent TEXT,
                    user_id TEXT,
                    ip_address TEXT,
                    request_size INTEGER,
                    response_size INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS database_query_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_hash TEXT NOT NULL,
                    query_text TEXT NOT NULL,
                    execution_time_ms INTEGER NOT NULL,
                    error_message TEXT,
                    table_name TEXT,
                    rows_affected INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS system_resource_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cpu_usage_percent REAL,
                    memory_usage_percent REAL,
                    memory_used_mb REAL,
                    memory_total_mb REAL,
                    disk_usage_percent REAL,
                    disk_used_gb REAL,
                    disk_total_gb REAL,
                    network_rx_mb REAL,
                    network_tx_mb REAL,
                    process_count INTEGER,
                    load_average REAL,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS business_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_date TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    metric_unit TEXT,
                    details TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(metric_date, metric_type)
                )`,

                `CREATE TABLE IF NOT EXISTS user_session_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    session_id TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    duration_seconds INTEGER DEFAULT 0,
                    page_views INTEGER DEFAULT 0,
                    user_agent TEXT,
                    ip_address TEXT,
                    country TEXT,
                    device_type TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS event_performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL,
                    event_name TEXT NOT NULL,
                    total_views INTEGER DEFAULT 0,
                    unique_visitors INTEGER DEFAULT 0,
                    tickets_sold INTEGER DEFAULT 0,
                    revenue REAL DEFAULT 0,
                    conversion_rate REAL DEFAULT 0,
                    date TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(event_id, date)
                )`,

                `CREATE TABLE IF NOT EXISTS cache_performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cache_key TEXT NOT NULL,
                    hit_count INTEGER DEFAULT 0,
                    miss_count INTEGER DEFAULT 0,
                    size_bytes INTEGER,
                    ttl_seconds INTEGER,
                    last_accessed TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS api_performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    status_code INTEGER NOT NULL,
                    user_agent TEXT,
                    user_id TEXT,
                    ip_address TEXT,
                    request_size INTEGER,
                    response_size INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS notification_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    notification_type TEXT NOT NULL,
                    recipient_email TEXT,
                    recipient_phone TEXT,
                    subject TEXT,
                    content TEXT,
                    status TEXT DEFAULT 'pending',
                    sent_at TEXT,
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS organizer_email_campaigns (
                    campaign_id TEXT PRIMARY KEY,
                    organizer_id TEXT NOT NULL,
                    event_id TEXT,
                    campaign_name TEXT NOT NULL,
                    subject TEXT,
                    audience_type TEXT DEFAULT 'attendees',
                    status TEXT DEFAULT 'draft',
                    recipient_count INTEGER DEFAULT 0,
                    delivered_count INTEGER DEFAULT 0,
                    opened_count INTEGER DEFAULT 0,
                    clicked_count INTEGER DEFAULT 0,
                    bounced_count INTEGER DEFAULT 0,
                    sent_at TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )`,

                `CREATE TABLE IF NOT EXISTS organizer_email_campaign_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    campaign_id TEXT NOT NULL,
                    organizer_id TEXT NOT NULL,
                    event_id TEXT,
                    recipient_email TEXT,
                    event_type TEXT NOT NULL,
                    event_timestamp TEXT DEFAULT (datetime('now')),
                    metadata TEXT,
                    FOREIGN KEY (campaign_id) REFERENCES organizer_email_campaigns(campaign_id)
                )`,

                `CREATE TABLE IF NOT EXISTS query_performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_hash TEXT NOT NULL,
                    query_text TEXT NOT NULL,
                    execution_time_ms INTEGER NOT NULL,
                    table_name TEXT,
                    rows_affected INTEGER,
                    created_at TEXT DEFAULT (datetime('now'))
                )`
            ];

            // Execute each table creation separately to avoid syntax errors
            for (let i = 0; i < tablesSQL.length; i++) {
                try {
                    await this.dbOperations.exec(tablesSQL[i]);
                    console.log(`✅ Created table ${i + 1}/${tablesSQL.length}`);
                } catch (error) {
                    // If table already exists, that's okay
                    if (!error.message.includes('already exists')) {
                        console.error(`❌ Error creating table ${i + 1}:`, error.message);
                        console.error('SQL:', tablesSQL[i].substring(0, 200) + '...');
                        throw error;
                    }
                }
            }
            
            console.log('✅ All tables created successfully');
            
            await this.reconcileLegacySchema();
            
            // Create indexes
            await this.createIndexes();
            
        } catch (error) {
            console.error('❌ Error creating tables:', error);
            throw error;
        }
    }

    // Create indexes
    async createIndexes() {
        try {
            const indexesSQL = [
                `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON support_messages(conversation_id)`,
                `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON support_messages(timestamp)`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_agent ON support_conversations(assigned_agent_id)`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_platform ON support_conversations(platform)`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_status ON support_conversations(status)`,
                `CREATE INDEX IF NOT EXISTS idx_agent_status ON support_agent_status(status)`,
                `CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id)`,
                `CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id)`,
                `CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id)`,
                `CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)`,
                `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
                `CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`,
                `CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`,
                `CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id)`,
                `CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON ticket_responses(ticket_id)`,
                `CREATE INDEX IF NOT EXISTS idx_events_name_date ON events(event_name, start_date)`,
                `CREATE INDEX IF NOT EXISTS idx_perf_metrics_endpoint ON performance_metrics(endpoint)`,
                `CREATE INDEX IF NOT EXISTS idx_perf_metrics_created ON performance_metrics(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(event_type)`,
                `CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs(activity_type)`,
                `CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_system_metrics_key ON system_metrics(metric_key)`,
                `CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type)`,
                `CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at)`
            ];
            
            for (const sql of indexesSQL) {
                try {
                    await this.dbOperations.exec(sql);
                } catch (error) {
                    console.log('Note: Could not create index:', error.message);
                }
            }
            console.log('✅ Indexes created successfully');
        } catch (error) {
            console.log('Note: Could not create some indexes:', error.message);
        }
    }

    async ensureColumn(tableName, columnName, columnDefinition) {
        try {
            const columns = await this.dbOperations.all(`PRAGMA table_info(${tableName})`);
            const hasColumn = (columns || []).some((column) => column.name === columnName);

            if (!hasColumn) {
                await this.dbOperations.run(
                    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
                );
                console.log(`✅ Added ${columnName} to ${tableName}`);
            }
        } catch (error) {
            console.log(`Note: Could not ensure ${tableName}.${columnName}:`, error.message);
        }
    }

    async reconcileLegacySchema() {
        try {
            const tables = await this.dbOperations.all(
                "SELECT name FROM sqlite_master WHERE type='table'"
            );
            const tableNames = new Set((tables || []).map((table) => table.name));

            if (tableNames.has('support_conversations')) {
                await this.ensureColumn('support_conversations', 'customer_phone', 'TEXT');
                await this.ensureColumn('support_conversations', 'customer_email', 'TEXT');
                await this.ensureColumn('support_conversations', 'metadata', 'TEXT');
            }

            if (tableNames.has('support_messages')) {
                await this.ensureColumn('support_messages', 'message_type', "TEXT DEFAULT 'text'");
                await this.ensureColumn('support_messages', 'media_url', 'TEXT');
                await this.ensureColumn('support_messages', 'media_type', 'TEXT');
                await this.ensureColumn('support_messages', 'metadata', 'TEXT');
                await this.ensureColumn('support_messages', 'attachments', "TEXT DEFAULT '[]'");
                await this.ensureColumn('support_messages', 'delivered', 'INTEGER DEFAULT 0');
            }

            if (tableNames.has('messages')) {
                await this.ensureColumn('messages', 'attachments', "TEXT DEFAULT '[]'");
                await this.ensureColumn('messages', 'read_at', 'TEXT');
            }

            if (tableNames.has('ticket_responses')) {
                await this.ensureColumn('ticket_responses', 'metadata', 'TEXT');
            }
        } catch (error) {
            console.log('Note: Legacy schema reconciliation had issues:', error.message);
        }
    }

    // Close database connection
    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        this.db = null;
                        this.dbOperations = null;
                        this.isInitialized = false;
                        this.initializationTime = null;
                        globalDatabaseInstance = null;
                        globalDbOperations = null;
                        isInitializing = false;
                        initializationPromise = null;
                        initializationCallbacks = [];
                        resolve();
                    }
                });
            });
        }
    }

    // Check if database exists
    databaseExists() {
        return fsSync.existsSync(this.dbPath);
    }

    // Get database info
    getDatabaseInfo() {
        if (!this.databaseExists()) {
            return {
                exists: false,
                path: this.dbPath,
                size: '0 MB'
            };
        }

        const stats = fsSync.statSync(this.dbPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        return {
            exists: true,
            path: this.dbPath,
            size: `${sizeMB} MB`,
            created: stats.birthtime,
            modified: stats.mtime
        };
    }

    // Helper function to clean messy event data
    static cleanEventData(data) {
        if (!data) return '';
        
        // Remove excessive whitespace, tabs, and newlines
        let cleaned = data
            .replace(/\t+/g, ' ')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Remove duplicate phrases (common in scraped data)
        const words = cleaned.split(' ');
        const uniqueWords = [];
        const seen = new Set();
        
        for (const word of words) {
            if (!seen.has(word.toLowerCase())) {
                uniqueWords.push(word);
                seen.add(word.toLowerCase());
            }
        }
        
        cleaned = uniqueWords.join(' ');
        
        // Truncate if too long
        if (cleaned.length > 500) {
            cleaned = cleaned.substring(0, 500) + '...';
        }
        
        return cleaned;
    }
}

// ========================
// LEGACY SYSTEM (FOR BACKWARD COMPATIBILITY)
// ========================

let legacyDbOperations = null;

// Initialize legacy system
const initializeLegacySystem = async (dbOps) => {
    legacyDbOperations = dbOps;
    
    try {
        // Run legacy initialization with safe column addition
        await safeInitializeTables();
        await safeAddColumns();
        await fixBusinessMetricsTable();
        await initializeAllMetrics();
        await initializeDefaultDashboardMetrics();
        
        console.log('✅ Legacy system initialization complete');
    } catch (error) {
        console.error('Error in legacy system initialization:', error.message);
    }
};

// Safe table initialization
const safeInitializeTables = async () => {
    console.log('🔧 Verifying all database tables...');
    
    try {
        const tables = await legacyDbOperations.all(
            "SELECT name FROM sqlite_master WHERE type='table'"
        );
        console.log(`✅ Found ${tables.length} tables`);
    } catch (error) {
        console.error('Error verifying tables:', error);
    }
};

// Safe column addition - check if columns exist first
const safeAddColumns = async () => {
    console.log('🔧 Checking and adding missing columns...');
    
    const tablesToCheck = [
        {
            table: 'event_managers',
            columns: [
                { name: 'status', type: 'TEXT DEFAULT "active"' },
                { name: 'last_login', type: 'TEXT' }
            ]
        },
        {
            table: 'admins',
            columns: [
                { name: 'status', type: 'TEXT DEFAULT "active"' },
                { name: 'last_login', type: 'TEXT' },
                { name: 'phone', type: 'TEXT' }
            ]
        },
        {
            table: 'customers',
            columns: [
                { name: 'status', type: 'TEXT DEFAULT "active"' },
                { name: 'last_login', type: 'TEXT' }
            ]
        },
        {
            table: 'events',
            columns: [
                { name: 'description', type: 'TEXT' },
                { name: 'start_date', type: 'TEXT' },
                { name: 'end_date', type: 'TEXT' },
                { name: 'image_url', type: 'TEXT' },
                { name: 'currency', type: 'TEXT DEFAULT "ZAR"' },
                { name: 'ticket_types', type: 'TEXT' },
                { name: 'status', type: 'TEXT DEFAULT "DRAFT"' },
                { name: 'created_by', type: 'TEXT' },
                { name: 'capacity', type: 'INTEGER' },
                { name: 'venue', type: 'TEXT' },
                { name: 'category', type: 'TEXT DEFAULT "General"' },
                { name: 'archived', type: 'INTEGER DEFAULT 0' },
                { name: 'max_attendees', type: 'INTEGER' },
                { name: 'price', type: 'REAL' },
                { name: 'source_url', type: 'TEXT' }
            ]
        },
        {
            table: 'payments',
            columns: [
                { name: 'total_amount', type: 'REAL' },
                { name: 'amount', type: 'REAL' }
            ]
        }
    ];

    for (const tableInfo of tablesToCheck) {
        try {
            // Check if table exists
            const tableExists = await legacyDbOperations.get(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableInfo.table}'`
            );
            
            if (tableExists) {
                // Get existing columns
                const tableInfoResult = await legacyDbOperations.all(
                    `PRAGMA table_info(${tableInfo.table})`
                );
                
                const existingColumns = tableInfoResult.map(col => col.name);
                
                // Add missing columns
                for (const column of tableInfo.columns) {
                    if (!existingColumns.includes(column.name)) {
                        try {
                            await legacyDbOperations.run(
                                `ALTER TABLE ${tableInfo.table} ADD COLUMN ${column.name} ${column.type}`
                            );
                            console.log(`✅ Added column ${column.name} to ${tableInfo.table}`);
                        } catch (alterError) {
                            if (!alterError.message.includes('duplicate column name')) {
                                console.log(`Note: Could not add column ${column.name} to ${tableInfo.table}:`, alterError.message);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log(`Note: Could not check columns for ${tableInfo.table}:`, error.message);
        }
    }
    
    console.log('✅ Column check completed');
};

// Fix business_metrics table
const fixBusinessMetricsTable = async () => {
    try {
        const tableExists = await legacyDbOperations.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='business_metrics'`
        );
        
        if (tableExists) {
            // Check if updated_at column exists
            const tableInfo = await legacyDbOperations.all(
                `PRAGMA table_info(business_metrics)`
            );
            
            const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
            
            if (!hasUpdatedAt) {
                console.log('Adding updated_at column to business_metrics table...');
                
                try {
                    await legacyDbOperations.run(
                        `ALTER TABLE business_metrics ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`
                    );
                    console.log('✅ Added updated_at column to business_metrics');
                } catch (error) {
                    console.log('Note: Could not add updated_at column:', error.message);
                }
            } else {
                console.log('business_metrics table already has updated_at column');
            }
        }
    } catch (error) {
        console.log('Note: Could not fix business_metrics table:', error.message);
    }
};

// Initialize all metrics
const initializeAllMetrics = async () => {
    const allMetrics = [
        // Core metrics
        { key: 'system_uptime_days', value: '0', type: 'counter', unit: 'days', description: 'System uptime in days' },
        { key: 'database_uptime_days', value: '0', type: 'counter', unit: 'days', description: 'Database uptime in days' },
        { key: 'database_size_mb', value: '0', type: 'gauge', unit: 'MB', description: 'Database size in megabytes' },
        { key: 'avg_response_time', value: '0', type: 'gauge', unit: 'ms', description: 'Average API response time' },
        { key: 'failed_login_attempts_24h', value: '0', type: 'counter', unit: 'count', description: 'Failed login attempts in last 24 hours' },
        { key: 'password_resets_24h', value: '0', type: 'counter', unit: 'count', description: 'Password resets in last 24 hours' },
        { key: 'active_blocked_ips', value: '0', type: 'gauge', unit: 'count', description: 'Currently blocked IP addresses' },
        { key: 'security_alerts_24h', value: '0', type: 'counter', unit: 'count', description: 'Security alerts in last 24 hours' },
        { key: 'total_tables', value: '0', type: 'gauge', unit: 'count', description: 'Total database tables' },
        { key: 'total_rows', value: '0', type: 'gauge', unit: 'count', description: 'Total rows across key tables' },
        { key: 'last_system_restart', value: new Date().toISOString(), type: 'timestamp', description: 'Last system restart time' },
        { key: 'last_backup_status', value: 'pending', type: 'status', description: 'Last backup status' },
        { key: 'last_backup_time', value: 'never', type: 'timestamp', description: 'Last backup time' },
        
        // Business metrics
        { key: 'tickets_sold_today', value: '0', type: 'counter', unit: 'count', description: 'Tickets sold today' },
        { key: 'revenue_today', value: '0', type: 'counter', unit: 'ZAR', description: 'Revenue generated today' },
        { key: 'new_users_today', value: '0', type: 'counter', unit: 'count', description: 'New users registered today' },
        { key: 'events_created_today', value: '0', type: 'counter', unit: 'count', description: 'Events created today' },
        { key: 'total_events', value: '0', type: 'gauge', unit: 'count', description: 'Total events in system' },
        { key: 'active_events', value: '0', type: 'gauge', unit: 'count', description: 'Active events' },
        { key: 'pending_events', value: '0', type: 'gauge', unit: 'count', description: 'Pending event approvals' },
        { key: 'total_tickets', value: '0', type: 'gauge', unit: 'count', description: 'Total tickets sold' },
        { key: 'total_revenue', value: '0', type: 'gauge', unit: 'ZAR', description: 'Total revenue generated' },
        
        // Support chat metrics
        { key: 'active_conversations', value: '0', type: 'gauge', unit: 'count', description: 'Active chat conversations' },
        { key: 'total_conversations', value: '0', type: 'gauge', unit: 'count', description: 'Total chat conversations' },
        { key: 'avg_response_time_chat', value: '0', type: 'gauge', unit: 'seconds', description: 'Average chat response time' },
        { key: 'whatsapp_chats', value: '0', type: 'gauge', unit: 'count', description: 'WhatsApp conversations' },
        { key: 'facebook_chats', value: '0', type: 'gauge', unit: 'count', description: 'Facebook conversations' },
        { key: 'instagram_chats', value: '0', type: 'gauge', unit: 'count', description: 'Instagram conversations' },
        { key: 'twitter_chats', value: '0', type: 'gauge', unit: 'count', description: 'Twitter/X conversations' },
        { key: 'available_agents', value: '0', type: 'gauge', unit: 'count', description: 'Available support agents' },
        { key: 'busy_agents', value: '0', type: 'gauge', unit: 'count', description: 'Busy support agents' },
        
        // System metrics
        { key: 'system_cpu_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'CPU usage percentage' },
        { key: 'system_memory_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'Memory usage percentage' },
        { key: 'system_memory_used_mb', value: '0', type: 'gauge', unit: 'MB', description: 'Memory used in MB' },
        { key: 'system_disk_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'Disk usage percentage' },
        { key: 'system_disk_used_gb', value: '0', type: 'gauge', unit: 'GB', description: 'Disk used in GB' },
        { key: 'system_process_count', value: '0', type: 'gauge', unit: 'count', description: 'Number of processes' },
        { key: 'system_load_average', value: '0', type: 'gauge', unit: '', description: 'System load average' },
        
        // Performance metrics
        { key: 'api_requests_total_1h', value: '0', type: 'counter', unit: 'count', description: 'API requests in last hour' },
        { key: 'api_avg_response_time_ms', value: '0', type: 'gauge', unit: 'ms', description: 'Average API response time' },
        { key: 'db_queries_total_1h', value: '0', type: 'counter', unit: 'count', description: 'Database queries in last hour' },
        { key: 'db_avg_execution_time_ms', value: '0', type: 'gauge', unit: 'ms', description: 'Average database query execution time' },
        
        // Notification metrics
        { key: 'notifications_total_24h', value: '0', type: 'counter', unit: 'count', description: 'Notifications sent in last 24 hours' },
        { key: 'notifications_sent_24h', value: '0', type: 'counter', unit: 'count', description: 'Notifications successfully sent' },
        { key: 'notifications_failed_24h', value: '0', type: 'counter', unit: 'count', description: 'Notifications failed to send' },
        { key: 'notifications_pending', value: '0', type: 'gauge', unit: 'count', description: 'Pending notifications' },
        { key: 'notifications_success_rate', value: '100', type: 'gauge', unit: '%', description: 'Notification success rate' },
    ];

    for (const metric of allMetrics) {
        try {
            // Check if metric already exists
            const existing = await legacyDbOperations.get(
                `SELECT metric_key FROM system_metrics WHERE metric_key = ?`,
                [metric.key]
            );
            
            if (!existing) {
                await legacyDbOperations.run(
                    `INSERT INTO system_metrics (metric_key, metric_value, metric_type, unit, description) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [metric.key, metric.value, metric.type, metric.unit, metric.description]
                );
            }
        } catch (error) {
            console.log(`Note: Could not initialize metric ${metric.key}:`, error.message);
        }
    }
    console.log('✅ All system metrics initialized');
};

// Initialize default dashboard metrics
const initializeDefaultDashboardMetrics = async () => {
    const defaultMetrics = [
        { key: 'stats', value: JSON.stringify({ total: 3, active: 3, newThisWeek: 0, suspended: 0, growthRate: 0, suspendedRate: 0, newThisWeekRate: 0 }) },
        { key: 'analytics', value: JSON.stringify({ roleDistribution: { 'Admin': 33, 'Event Manager': 33, 'Customer': 33 } }) },
        { key: 'recentActivity', value: JSON.stringify([
            { type: 'user_login', user: 'Super Admin', time: '5 mins ago', status: 'success' },
            { type: 'user_registered', user: 'Test Customer', time: '1 hour ago', status: 'success' },
            { type: 'event_created', user: 'Event Manager', time: '2 hours ago', status: 'warning' },
        ]) }
    ];

    for (const metric of defaultMetrics) {
        try {
            const existing = await legacyDbOperations.get(`SELECT key FROM dashboard_metrics WHERE key = ?`, [metric.key]);
            if (!existing) {
                await legacyDbOperations.run(`INSERT INTO dashboard_metrics (key, value) VALUES (?, ?)`, [metric.key, metric.value]);
            }
        } catch (error) {
            console.log(`Note: Could not initialize dashboard metric ${metric.key}:`, error.message);
        }
    }
    console.log('✅ Default dashboard metrics initialized');
};

// ========================
// SAFE DATABASE OPERATIONS - ULTIMATE FIX
// ========================

// ULTIMATE SAFE DB OPERATION - With retry logic and better error handling
const safeDbOperation = async (operation, ...args) => {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Ensure database is ready
            if (!globalDbOperations) {
                console.warn(`⚠ Database not ready (attempt ${attempt}/${maxRetries}), initializing...`);
                await ensureDatabaseReady();
                
                if (!globalDbOperations) {
                    throw new Error('Database operations not available after initialization attempt');
                }
            }
            
            if (globalDbOperations && globalDbOperations[operation]) {
                const result = await globalDbOperations[operation](...args);
                return result;
            } else {
                throw new Error(`Database operation '${operation}' not available`);
            }
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt}/${maxRetries} failed for operation '${operation}':`, error.message);
            
            if (attempt < maxRetries) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                
                // Reset and try to reinitialize
                if (error.message.includes('not available') || error.message.includes('null')) {
                    console.log('Attempting to reinitialize database...');
                    await ensureDatabaseReady(true); // Force reinitialization
                }
            }
        }
    }
    
    console.error(`All ${maxRetries} attempts failed for operation '${operation}':`, lastError?.message);
    return null;
};

// ULTIMATE SAFE METRIC UPDATE - Specialized for metrics
const safeUpdateMetric = async (metricKey, metricValue) => {
    return safeDbOperation('run',
        `INSERT OR REPLACE INTO system_metrics (metric_key, metric_value, updated_at) 
         VALUES (?, ?, datetime('now'))`,
        [metricKey, metricValue]
    );
};

// ULTIMATE SAFE METRIC GET - Specialized for metrics
const safeGetMetric = async (metricKey) => {
    return safeDbOperation('get',
        `SELECT * FROM system_metrics WHERE metric_key = ?`,
        [metricKey]
    );
};

// ULTIMATE SAFE INSERT OR IGNORE
const safeInsertOrIgnore = async (table, data) => {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    return safeDbOperation('run',
        `INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`,
        values
    );
};

// ========================
// DATABASE READY ENSURANCE
// ========================

// Ensure database is ready with retry logic
const ensureDatabaseReady = async (forceReinitialize = false) => {
    if (forceReinitialize) {
        console.log('Force reinitializing database...');
        isInitializing = false;
        initializationPromise = null;
        globalDatabaseInstance = null;
        globalDbOperations = null;
    }
    
    if (isDatabaseReady()) {
        return true;
    }
    
    if (isInitializing && initializationPromise) {
        console.log('Database is initializing, waiting...');
        try {
            await initializationPromise;
            return true;
        } catch (error) {
            console.error('Error waiting for database initialization:', error);
            return false;
        }
    }
    
    // Start initialization
    console.log('Starting database initialization...');
    isInitializing = true;
    initializationPromise = (async () => {
        try {
            const db = new Database();
            await db.initialize();
            return db;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            isInitializing = false;
            initializationPromise = null;
            throw error;
        }
    })();
    
    try {
        await initializationPromise;
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        return false;
    }
};

// ========================
// FIXED METRICS FUNCTIONS
// ========================

const getDatabaseSize = async () => {
    try {
        const dbPath = path.join(__dirname, 'tickethub.db');
        const stats = await fs.stat(dbPath);
        return (stats.size / (1024 * 1024)).toFixed(2);
    } catch (error) {
        console.error('Error getting database size:', error);
        return '0';
    }
};

const getTableCounts = async () => {
    try {
        const tables = await safeDbOperation('all',
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        return tables ? tables.length : 0;
    } catch (error) {
        console.error('Error getting table count:', error);
        return 0;
    }
};

const getTotalRowsCount = async () => {
    try {
        const keyTables = ['customers', 'event_managers', 'admins', 'events', 'tickets', 'payments', 'support_conversations', 'support_messages'];
        let totalRows = 0;
        
        for (const tableName of keyTables) {
            try {
                // Check if table exists
                const tableExists = await safeDbOperation('get',
                    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
                    [tableName]
                );
                
                if (tableExists) {
                    const count = await safeDbOperation('get',
                        `SELECT COUNT(*) as count FROM ${tableName}`
                    );
                    totalRows += count?.count || 0;
                }
            } catch (e) {
                // Table might not exist or other error
            }
        }
        
        return totalRows;
    } catch (error) {
        console.error('Error getting total rows count:', error);
        return 0;
    }
};

// Collect support chat metrics - FIXED with safe operations
const collectSupportChatMetrics = async () => {
    try {
        // Get active conversations
        const activeConvos = await safeDbOperation('get',
            `SELECT COUNT(*) as count FROM support_conversations WHERE status = 'active'`
        );
        
        // Get total conversations
        const totalConvos = await safeDbOperation('get',
            `SELECT COUNT(*) as count FROM support_conversations`
        );
        
        // Get platform breakdown
        const platformStats = await safeDbOperation('all', `
            SELECT platform, COUNT(*) as count 
            FROM support_conversations 
            GROUP BY platform
        `);
        
        // Get agent availability
        const availableAgents = await safeDbOperation('get', `
            SELECT COUNT(*) as count FROM support_agent_status WHERE status = 'available'
        `);
        
        const busyAgents = await safeDbOperation('get', `
            SELECT COUNT(*) as count FROM support_agent_status WHERE status = 'busy'
        `);
        
        // Update support chat metrics
        const chatMetricUpdates = [
            ['active_conversations', (activeConvos?.count || 0).toString()],
            ['total_conversations', (totalConvos?.count || 0).toString()],
            ['available_agents', (availableAgents?.count || 0).toString()],
            ['busy_agents', (busyAgents?.count || 0).toString()],
            ['avg_response_time_chat', '0'] // Default value
        ];
        
        for (const [key, value] of chatMetricUpdates) {
            await safeUpdateMetric(key, value);
        }
        
        // Update platform-specific metrics
        const platforms = ['whatsapp', 'facebook', 'instagram', 'twitter'];
        for (const platform of platforms) {
            const platformCount = platformStats?.find(p => p.platform === platform)?.count || 0;
            await safeUpdateMetric(`${platform}_chats`, platformCount.toString());
        }
        
        console.log('✅ Support chat metrics collected');
    } catch (error) {
        console.error('Error collecting support chat metrics:', error.message);
    }
};

// Collect system resource metrics
const collectSystemResourceMetrics = async () => {
    try {
        const cpuUsage = os.loadavg()[0];
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = (usedMem / totalMem) * 100;
        
        // Get disk usage
        let diskStats = { usagePercent: '0', usedGB: '0', totalGB: '0' };
        try {
            const cwd = process.cwd();
            const stats = fsSync.statfsSync(cwd);
            const total = stats.bsize * stats.blocks;
            const free = stats.bsize * stats.bfree;
            const used = total - free;
            const usagePercent = (used / total) * 100;
            diskStats = {
                usagePercent: usagePercent.toFixed(2),
                usedGB: (used / 1024 / 1024 / 1024).toFixed(2),
                totalGB: (total / 1024 / 1024 / 1024).toFixed(2)
            };
        } catch (diskError) {
            console.log('Disk stats not available:', diskError.message);
        }
        
        // Insert into system_resource_metrics
        await safeDbOperation('run', `
            INSERT INTO system_resource_metrics 
            (cpu_usage_percent, memory_usage_percent, memory_used_mb, memory_total_mb, 
             disk_usage_percent, disk_used_gb, disk_total_gb, process_count, load_average)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cpuUsage.toFixed(2),
            memoryUsagePercent.toFixed(2),
            (usedMem / 1024 / 1024).toFixed(2),
            (totalMem / 1024 / 1024).toFixed(2),
            diskStats.usagePercent,
            diskStats.usedGB,
            diskStats.totalGB,
            os.cpus().length,
            cpuUsage.toFixed(2)
        ]);

        // Update system metrics
        await safeUpdateMetric('cpu_usage_percent', cpuUsage.toFixed(2));
        await safeUpdateMetric('memory_usage_percent', memoryUsagePercent.toFixed(2));
        await safeUpdateMetric('disk_usage_percent', diskStats.usagePercent);
        
        console.log('✅ System resource metrics collected');
    } catch (error) {
        console.error('Error collecting system resource metrics:', error);
    }
};

// Collect business metrics
const collectBusinessMetrics = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Initialize counts
        let ticketsSoldToday = 0;
        let revenueToday = 0;
        let totalTickets = 0;
        let totalRevenue = 0;
        
        // Get tickets sold today
        try {
            const ticketsSold = await safeDbOperation('get', `
                SELECT COUNT(*) as count FROM tickets 
                WHERE DATE(created_at) = DATE('now')
            `);
            ticketsSoldToday = ticketsSold?.count || 0;
            
            // Get total tickets
            const totalTicketsRes = await safeDbOperation('get', `SELECT COUNT(*) as count FROM tickets`);
            totalTickets = totalTicketsRes?.count || 0;
        } catch (ticketError) {
            console.log('Tickets query error:', ticketError.message);
        }
        
        // Get revenue today
        try {
            const revenueTodayRes = await safeDbOperation('get', `
                SELECT SUM(total_amount) as total FROM payments 
                WHERE DATE(created_at) = DATE('now') AND status = 'completed'
            `);
            revenueToday = revenueTodayRes?.total || 0;
            
            // Get total revenue
            const totalRevenueRes = await safeDbOperation('get', `
                SELECT SUM(total_amount) as total FROM payments WHERE status = 'completed'
            `);
            totalRevenue = totalRevenueRes?.total || 0;
        } catch (paymentError) {
            console.log('Payments query error:', paymentError.message);
        }
        
        // Get new users today
        let newUsersCount = 0;
        try {
            const newUsers = await safeDbOperation('get', `
                SELECT COUNT(*) as count FROM (
                    SELECT customer_id FROM customers WHERE DATE(created_at) = DATE('now')
                    UNION ALL
                    SELECT manager_id FROM event_managers WHERE DATE(created_at) = DATE('now')
                    UNION ALL
                    SELECT admin_id FROM admins WHERE DATE(created_at) = DATE('now')
                    UNION ALL
                    SELECT support_id FROM support_staff WHERE DATE(created_at) = DATE('now')
                    UNION ALL
                    SELECT organizer_id FROM event_organizers WHERE DATE(created_at) = DATE('now')
                )
            `);
            newUsersCount = newUsers?.count || 0;
        } catch (error) {
            console.log('Error getting new users:', error.message);
        }
        
        // Get events created today
        let eventsCreatedCount = 0;
        try {
            const eventsCreated = await safeDbOperation('get', `
                SELECT COUNT(*) as count FROM events 
                WHERE DATE(created_at) = DATE('now')
            `);
            eventsCreatedCount = eventsCreated?.count || 0;
        } catch (error) {
            console.log('Error getting events created:', error.message);
        }
        
        // Get total events
        let totalEventsCount = 0;
        let activeEventsCount = 0;
        let pendingEventsCount = 0;
        
        try {
            const totalEvents = await safeDbOperation('get', `SELECT COUNT(*) as count FROM events`);
            totalEventsCount = totalEvents?.count || 0;
            
            const activeEvents = await safeDbOperation('get', `
                SELECT COUNT(*) as count FROM events 
                WHERE status = 'ACTIVE' OR status = 'active'
            `);
            activeEventsCount = activeEvents?.count || 0;
            
            const pendingEvents = await safeDbOperation('get', `
                SELECT COUNT(*) as count FROM events 
                WHERE status = 'PENDING' OR status = 'pending'
            `);
            pendingEventsCount = pendingEvents?.count || 0;
        } catch (error) {
            console.log('Error getting event counts:', error.message);
        }
        
        // Update business metrics table
        const businessMetrics = [
            ['tickets_sold', ticketsSoldToday],
            ['revenue', revenueToday],
            ['new_users', newUsersCount],
            ['events_created', eventsCreatedCount]
        ];
        
        for (const [type, value] of businessMetrics) {
            await safeDbOperation('run', `
                INSERT OR REPLACE INTO business_metrics (metric_date, metric_type, metric_value, updated_at)
                VALUES (?, ?, ?, datetime('now'))
            `, [today, type, value]);
        }
        
        // Update all system metrics
        await safeUpdateMetric('tickets_sold_today', ticketsSoldToday.toString());
        await safeUpdateMetric('revenue_today', revenueToday.toString());
        await safeUpdateMetric('new_users_today', newUsersCount.toString());
        await safeUpdateMetric('events_created_today', eventsCreatedCount.toString());
        await safeUpdateMetric('total_events', totalEventsCount.toString());
        await safeUpdateMetric('active_events', activeEventsCount.toString());
        await safeUpdateMetric('pending_events', pendingEventsCount.toString());
        await safeUpdateMetric('total_tickets', totalTickets.toString());
        await safeUpdateMetric('total_revenue', totalRevenue.toString());
        
        console.log('✅ Business metrics collected');
    } catch (error) {
        console.error('Error collecting business metrics:', error.message);
    }
};

// ULTIMATE FIXED: Main update system metrics function
const updateSystemMetrics = async () => {
    console.log('🔄 ULTIMATE FIXED: Starting system metrics update...');
    
    try {
        // ENSURE DATABASE IS READY FIRST
        const isReady = await ensureDatabaseReady();
        if (!isReady) {
            console.error('❌ Database not ready, skipping metrics update');
            return;
        }
        
        console.log('✅ Database confirmed ready, proceeding with metrics update...');
        
        // Update database size
        try {
            const dbSize = await getDatabaseSize();
            await safeUpdateMetric('database_size_mb', dbSize);
            console.log('✓ Updated database_size_mb:', dbSize);
        } catch (error) {
            console.log('Error updating database size:', error.message);
        }

        // Update table count
        try {
            const tableCount = await getTableCounts();
            await safeUpdateMetric('total_tables', tableCount.toString());
            console.log('✓ Updated total_tables:', tableCount);
        } catch (error) {
            console.log('Error updating table count:', error.message);
        }

        // Update total rows
        try {
            const totalRows = await getTotalRowsCount();
            await safeUpdateMetric('total_rows', totalRows.toString());
            console.log('✓ Updated total_rows:', totalRows);
        } catch (error) {
            console.log('Error updating total rows:', error.message);
        }

        // Update uptime metrics
        try {
            const now = new Date().toISOString();
            await safeUpdateMetric('system_uptime_days', '0');
            await safeUpdateMetric('database_uptime_days', '0');
            await safeUpdateMetric('last_system_restart', now);
            console.log('✓ Updated uptime metrics');
        } catch (error) {
            console.log('Error updating uptime metrics:', error.message);
        }

        // Update active blocked IPs count
        try {
            const blockedIPs = await safeDbOperation('get',
                `SELECT COUNT(*) as count FROM blocked_ips WHERE is_active = 1`
            );
            await safeUpdateMetric('active_blocked_ips', blockedIPs?.count?.toString() || '0');
            console.log('✓ Updated active_blocked_ips:', blockedIPs?.count || 0);
        } catch (error) {
            console.log('Error updating blocked IPs:', error.message);
        }

        // Update failed login attempts in last 24 hours
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const failedLogins = await safeDbOperation('get',
                `SELECT COUNT(*) as count FROM security_logs 
                 WHERE event_type = 'failed_login' 
                 AND created_at >= ?`,
                [twentyFourHoursAgo]
            );
            await safeUpdateMetric('failed_login_attempts_24h', failedLogins?.count?.toString() || '0');
            console.log('✓ Updated failed_login_attempts_24h:', failedLogins?.count || 0);
        } catch (error) {
            console.log('Error updating failed login attempts:', error.message);
        }

        // Update password resets in last 24 hours
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const passwordResets = await safeDbOperation('get',
                `SELECT COUNT(*) as count FROM user_activity_logs 
                 WHERE activity_type = 'password_reset' 
                 AND created_at >= ?`,
                [twentyFourHoursAgo]
            );
            await safeUpdateMetric('password_resets_24h', passwordResets?.count?.toString() || '0');
            console.log('✓ Updated password_resets_24h:', passwordResets?.count || 0);
        } catch (error) {
            console.log('Error updating password resets:', error.message);
        }

        // Update average response time from last hour
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const perfMetrics = await safeDbOperation('all',
                `SELECT response_time_ms FROM performance_metrics 
                 WHERE created_at >= ? AND response_time_ms > 0
                 LIMIT 100`,
                [oneHourAgo]
            );
            
            if (perfMetrics && perfMetrics.length > 0) {
                const total = perfMetrics.reduce((sum, m) => sum + m.response_time_ms, 0);
                const avg = Math.round(total / perfMetrics.length);
                await safeUpdateMetric('avg_response_time', avg.toString());
                console.log('✓ Updated avg_response_time:', avg);
            }
        } catch (error) {
            console.log('Error updating response time:', error.message);
        }

        // Update backup status if any backup exists
        try {
            const latestBackup = await safeDbOperation('get',
                `SELECT status, created_at FROM backup_history 
                 ORDER BY created_at DESC LIMIT 1`
            );
            
            if (latestBackup) {
                await safeUpdateMetric('last_backup_status', latestBackup.status);
                await safeUpdateMetric('last_backup_time', latestBackup.created_at);
                console.log('✓ Updated backup metrics');
            }
        } catch (error) {
            console.log('Error updating backup metrics:', error.message);
        }

        // Run extended metrics collection
        await collectSystemResourceMetrics();
        await collectBusinessMetrics();
        await collectSupportChatMetrics();

        console.log('✅✅✅ ALL SYSTEM METRICS UPDATED SUCCESSFULLY');
    } catch (error) {
        console.error('❌❌❌ CRITICAL ERROR in updateSystemMetrics:', error);
    }
};

// ========================
// DEFAULT USERS FUNCTIONS
// ========================

const ensureDefaultEventManager = async (bcrypt, uuidv4) => {
    try {
        await ensureDatabaseReady();
        
        const existing = await safeDbOperation('get', `SELECT * FROM event_managers WHERE email = ?`, ['manager@tickethub.co.za']);
        if (!existing) {
            const hashed = await bcrypt.hash('manager123', 10);
            const now = new Date().toISOString();
            await safeDbOperation('run',
                `INSERT INTO event_managers (manager_id, name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, 'event_manager', ?, ?)`,
                [uuidv4(), 'Default Manager', 'manager@tickethub.co.za', hashed, '+27 82 000 0000', 'active', now, now]
            );
            await safeDbOperation('run',
                `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['Default Manager', 'manager@tickethub.co.za', hashed, 'Event Manager', 'active', '2025-11-20', 'Just now', 'DM', 'South Africa']
            );
            console.log('✅ Default event manager created');
        } else {
            console.log('Default event manager already exists');
        }
    } catch (err) {
        console.log('Event manager check skipped:', err.message);
    }
};

const ensureDefaultAdmin = async (bcrypt, uuidv4) => {
    try {
        await ensureDatabaseReady();
        
        const existing = await safeDbOperation('get', `SELECT * FROM admins WHERE email = ?`, ['admin@tickethub.co.za']);
        if (!existing) {
            const hashed = await bcrypt.hash('admin123', 10);
            const now = new Date().toISOString();
            await safeDbOperation('run',
                `INSERT INTO admins (admin_id, name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, 'SUPER_ADMIN', ?, ?)`,
                [uuidv4(), 'Super Admin', 'admin@tickethub.co.za', hashed, null, 'active', now, now]
            );
            await safeDbOperation('run',
                `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['Super Admin', 'admin@tickethub.co.za', hashed, 'Admin', 'active', '2025-11-15', 'Just now', 'SA', 'South Africa']
            );
            console.log('✅ Default admin created');
        } else {
            console.log('Default admin already exists');
        }
    } catch (err) {
        console.log('Admin check skipped:', err.message);
    }
};

const ensureDefaultCustomer = async (bcrypt, uuidv4) => {
    try {
        await ensureDatabaseReady();
        
        const existing = await safeDbOperation('get', `SELECT * FROM customers WHERE email = ?`, ['customer@test.com']);
        if (!existing) {
            const hashed = await bcrypt.hash('customer123', 10);
            const now = new Date().toISOString();
            await safeDbOperation('run',
                `INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, status, role, last_login, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', ?, ?)`,
                [uuidv4(), 'Test', 'Customer', 'customer@test.com', hashed, '+27 71 123 4567', 'active', now, now]
            );
            await safeDbOperation('run',
                `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['Test Customer', 'customer@test.com', hashed, 'Customer', 'active', '2025-11-25', 'Just now', 'TC', 'South Africa']
            );
            console.log('✅ Default customer created: customer@test.com / customer123');
        } else {
            console.log('Default customer already exists');
        }
    } catch (err) {
        console.log('Customer check skipped:', err.message);
    }
};

const ensureDefaultSupport = async (bcrypt, uuidv4) => {
    try {
        await ensureDatabaseReady();
        
        const existing = await safeDbOperation('get', `SELECT * FROM support_staff WHERE email = ?`, ['support@tickethub.co.za']);
        if (!existing) {
            const hashed = await bcrypt.hash('support123', 10);
            const now = new Date().toISOString();
            const supportId = uuidv4();
            
            // Create support staff
            await safeDbOperation('run',
                `INSERT INTO support_staff (support_id, name, email, username, password, phone, department, role, status, availability_status, max_tickets, current_tickets, avg_response_time, satisfaction_rating, last_login, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [supportId, 'Support Staff', 'support@tickethub.co.za', 'support', hashed, '+27 71 000 0000', 'technical', 'support', 'active', 'available', 10, 0, 0, 0.0, now, now, now]
            );
            
            // Create support agent status record
            await safeDbOperation('run',
                `INSERT INTO support_agent_status (agent_id, status, auto_assign, last_active, platform_preferences)
                 VALUES (?, ?, ?, ?, ?)`,
                [supportId, 'available', 1, now, JSON.stringify(['whatsapp', 'facebook', 'web'])]
            );
            
            await safeDbOperation('run',
                `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['Support Staff', 'support@tickethub.co.za', hashed, 'Support', 'active', now, 'Just now', 'SS', 'South Africa']
            );
            console.log('✅ Default support staff created: support@tickethub.co.za / support123');
        } else {
            console.log('Default support staff already exists');
        }
    } catch (err) {
        console.log('Support staff check skipped:', err.message);
    }
};

const ensureDefaultOrganizer = async (bcrypt, uuidv4) => {
    try {
        await ensureDatabaseReady();
        
        const existing = await safeDbOperation('get', `SELECT * FROM event_organizers WHERE email = ?`, ['organizer@tickethub.co.za']);
        if (!existing) {
            const hashed = await bcrypt.hash('organizer123', 10);
            const now = new Date().toISOString();
            await safeDbOperation('run',
                `INSERT INTO event_organizers (organizer_id, name, email, username, password, phone, company, bio, website, status, role, permissions, verified, stripe_customer_id, subscription_status, last_login, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), 'Event Organizer', 'organizer@tickethub.co.za', 'organizer', hashed, '+27 72 000 0000', 'My Events Co.', 'Professional event organizer', 'https://events.example.com', 'active', 'event_organizer', 'basic', 0, null, 'free', now, now, now]
            );
            await safeDbOperation('run',
                `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['Event Organizer', 'organizer@tickethub.co.za', hashed, 'Organizer', 'active', now, 'Just now', 'EO', 'South Africa']
            );
            console.log('✅ Default event organizer created: organizer@tickethub.co.za / organizer123');
        } else {
            console.log('Default event organizer already exists');
        }
    } catch (err) {
        console.log('Event organizer check skipped:', err.message);
    }
};

// ========================
// GLOBAL ACCESS FUNCTIONS
// ========================

// Get global database instance
const getDatabase = () => {
    return globalDatabaseInstance;
};

// Get global database operations
const getDbOperations = () => {
    return globalDbOperations;
};

// Check if database is ready
const isDatabaseReady = () => {
    return globalDatabaseInstance && globalDatabaseInstance.isReady();
};

// Wait for database to be ready
const waitForDatabase = async (timeout = 30000) => {
    const startTime = Date.now();
    
    if (isDatabaseReady()) {
        return globalDatabaseInstance;
    }
    
    // Start initialization if not already in progress
    if (!isInitializing) {
        await ensureDatabaseReady();
    }
    
    while (!isDatabaseReady()) {
        if (Date.now() - startTime > timeout) {
            throw new Error(`Database initialization timeout after ${timeout}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return globalDatabaseInstance;
};

// Initialize database once
const initializeDatabaseOnce = async () => {
    return await ensureDatabaseReady();
};

// ========================
// SPECIAL FIX FOR METRICS SERVICE
// ========================

// This function should be called by the metrics service BEFORE attempting any operations
const initializeForMetrics = async () => {
    console.log('🔧 Initializing database specifically for metrics service...');
    
    // Force initialization
    const isReady = await ensureDatabaseReady();
    
    if (isReady) {
        console.log('✅ Database ready for metrics service');
        return true;
    } else {
        console.error('❌ Failed to initialize database for metrics service');
        return false;
    }
};

// ========================
// EXPORT FUNCTIONS
// ========================
module.exports = {
    // Main Database Class
    Database,
    
    // Global access functions
    getDatabase,
    getDbOperations,
    isDatabaseReady,
    waitForDatabase,
    initializeDatabaseOnce,
    initializeForMetrics, // NEW: Special function for metrics service
    
    // Main connection functions
    connectDatabase: async () => {
        return await initializeDatabaseOnce();
    },
    
    // Close database
    closeDatabase: async () => {
        if (globalDatabaseInstance) {
            await globalDatabaseInstance.close();
        }
    },
    
    // Legacy exports for backward compatibility
    get dbOperations() {
        return getDbOperations();
    },
    
    // Safe operations
    safeDbOperation,
    safeUpdateMetric,
    safeGetMetric,
    safeInsertOrIgnore,
    
    // Default user functions
    ensureDefaultEventManager,
    ensureDefaultAdmin,
    ensureDefaultCustomer,
    ensureDefaultSupport,
    ensureDefaultOrganizer,
    
    // Metrics functions - ULTIMATE FIXED VERSIONS
    updateSystemMetrics,
    getDatabaseSize,
    getTableCounts,
    getTotalRowsCount,
    collectSupportChatMetrics,
    collectSystemResourceMetrics,
    collectBusinessMetrics,
    
    // Clean event data function
    cleanEventData: Database.cleanEventData,
    
    // Database instance for direct access
    db: getDatabase,
    
    // Special export for metrics service
    ensureDatabaseReady
};
