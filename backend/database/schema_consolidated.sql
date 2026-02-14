-- Create or update this file: backend/database/schema_consolidated.sql
PRAGMA foreign_keys = ON;

-- Drop existing tables (in order of dependencies)
DROP TABLE IF EXISTS support_messages;
DROP TABLE IF EXISTS support_conversations;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS ticket_types;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS event_organizers;
DROP TABLE IF EXISTS support_staff;
DROP TABLE IF EXISTS event_managers;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS user_activity_logs;
DROP TABLE IF EXISTS security_logs;
DROP TABLE IF EXISTS system_alerts;
DROP TABLE IF EXISTS performance_metrics;
DROP TABLE IF EXISTS system_metrics;

-- Create User Tables
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    date_of_birth DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'active' -- active, suspended, inactive
);

CREATE TABLE IF NOT EXISTS admins (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    permissions TEXT DEFAULT 'full',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS event_managers (
    manager_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS event_organizers (
    organizer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    organization_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    password_hash TEXT NOT NULL,
    tax_id TEXT,
    website TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, suspended, rejected
    approval_notes TEXT,
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (approved_by) REFERENCES admins(admin_id)
);

CREATE TABLE IF NOT EXISTS support_staff (
    staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    department TEXT DEFAULT 'general',
    shift_hours TEXT,
    permissions TEXT DEFAULT 'basic',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'active'
);

-- Create Events Table
CREATE TABLE IF NOT EXISTS events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_description TEXT,
    location TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    category TEXT DEFAULT 'general',
    event_type TEXT DEFAULT 'physical',
    status TEXT DEFAULT 'DRAFT', -- DRAFT, PENDING, VALIDATED, REJECTED, CANCELLED
    max_attendees INTEGER,
    ticket_price DECIMAL(10,2),
    created_by TEXT NOT NULL,
    organizer_id INTEGER,
    user_type TEXT NOT NULL, -- admin, event_manager, event_organizer, support, customer
    requires_approval BOOLEAN DEFAULT 0,
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT 0,
    source TEXT DEFAULT 'manual',
    image_url TEXT,
    notes TEXT,
    ticket_types TEXT DEFAULT '[]',
    FOREIGN KEY (organizer_id) REFERENCES event_organizers(organizer_id),
    FOREIGN KEY (approved_by) REFERENCES admins(admin_id)
);

-- Create Ticket Types Table
CREATE TABLE IF NOT EXISTS ticket_types (
    ticket_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    type_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    sold_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- Create Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT UNIQUE NOT NULL,
    event_id INTEGER NOT NULL,
    ticket_type_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchase_price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'active', -- active, used, cancelled, refunded
    checked_in BOOLEAN DEFAULT 0,
    checked_in_at DATETIME,
    checked_in_by INTEGER,
    qr_code_data TEXT,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(ticket_type_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (checked_in_by) REFERENCES support_staff(staff_id)
);

-- Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    ticket_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
    transaction_id TEXT UNIQUE,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

-- Create Support Tables
CREATE TABLE IF NOT EXISTS support_conversations (
    conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    staff_id INTEGER,
    subject TEXT,
    status TEXT DEFAULT 'open', -- open, active, resolved, closed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    last_message_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (staff_id) REFERENCES support_staff(staff_id)
);

CREATE TABLE IF NOT EXISTS support_messages (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL, -- customer, support, system
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    attachments TEXT DEFAULT '[]',
    FOREIGN KEY (conversation_id) REFERENCES support_conversations(conversation_id) ON DELETE CASCADE
);

-- Create Logging Tables
CREATE TABLE IF NOT EXISTS user_activity_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    activity_details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_details TEXT,
    severity TEXT DEFAULT 'info', -- info, warning, error, critical
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    severity TEXT DEFAULT 'info', -- info, warning, error, critical
    resolved BOOLEAN DEFAULT 0,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Metrics Tables
CREATE TABLE IF NOT EXISTS system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_key TEXT UNIQUE NOT NULL,
    metric_value TEXT NOT NULL,
    metric_type TEXT DEFAULT 'gauge',
    unit TEXT,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create Indexes for Performance
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_checked_in ON tickets(checked_in);
CREATE INDEX idx_support_conversations_customer ON support_conversations(customer_id);
CREATE INDEX idx_support_conversations_staff ON support_conversations(staff_id);
CREATE INDEX idx_support_conversations_status ON support_conversations(status);
CREATE INDEX idx_support_messages_conversation ON support_messages(conversation_id);
CREATE INDEX idx_user_activity_user ON user_activity_logs(user_email);
CREATE INDEX idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX idx_security_logs_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);

-- Insert Default Users
INSERT OR IGNORE INTO admins (email, first_name, last_name, password_hash) 
VALUES ('admin@tickethub.co.za', 'System', 'Administrator', '$2b$10$YourHashedPasswordHere');

INSERT OR IGNORE INTO event_managers (email, first_name, last_name, password_hash) 
VALUES ('manager@tickethub.co.za', 'Event', 'Manager', '$2b$10$YourHashedPasswordHere');

INSERT OR IGNORE INTO customers (email, first_name, last_name, password_hash) 
VALUES ('customer@test.com', 'Test', 'Customer', '$2b$10$YourHashedPasswordHere');

-- Insert default support staff
INSERT OR IGNORE INTO support_staff (email, first_name, last_name, password_hash, department) 
VALUES ('support@tickethub.co.za', 'Support', 'Agent', '$2b$10$YourHashedPasswordHere', 'general');

-- Insert default event organizer (pending approval)
INSERT OR IGNORE INTO event_organizers (email, organization_name, contact_person, phone, address, password_hash, status) 
VALUES ('organizer@example.com', 'Event Organizers Inc', 'John Doe', '+1234567890', '123 Event St, City', '$2b$10$YourHashedPasswordHere', 'pending');

-- Insert initial system metrics
INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, description) VALUES 
('system_uptime_days', '0', 'counter', 'System uptime in days'),
('database_size_mb', '0', 'gauge', 'Database size in MB'),
('avg_response_time', '0', 'gauge', 'Average response time'),
('failed_login_attempts_24h', '0', 'counter', 'Failed login attempts in 24h'),
('active_users', '5', 'gauge', 'Active user count'),
('total_events', '0', 'gauge', 'Total events'),
('active_events', '0', 'gauge', 'Active events'),
('pending_events', '0', 'gauge', 'Pending event approvals'),
('pending_organizers', '1', 'gauge', 'Pending organizer approvals'),
('active_conversations', '0', 'gauge', 'Active support conversations'),
('last_system_restart', '2024-01-01T00:00:00.000Z', 'timestamp', 'Last system restart time');

PRAGMA foreign_keys = ON;