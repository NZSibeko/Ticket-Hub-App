-- Phase 3 canonical schema scaffold
-- Non-destructive first-pass migration: create canonical tables alongside legacy tables.

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO roles (code, name) VALUES
  ('admin', 'Administrator'),
  ('manager', 'Manager'),
  ('event_organizer', 'Event Organizer'),
  ('omni_support_consultant', 'Omni Support Consultant'),
  ('event_support_consultant', 'Event Support Consultant'),
  ('customer', 'Customer');

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS event_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  assignment_role TEXT NOT NULL,
  assigned_by_user_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS event_approval_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  acted_by_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (acted_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_threads (
  id TEXT PRIMARY KEY,
  customer_user_id TEXT,
  channel TEXT,
  subject TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  assigned_user_id TEXT,
  event_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_thread_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_user_id TEXT,
  sender_type TEXT,
  body TEXT NOT NULL,
  is_internal_note INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES support_threads(id),
  FOREIGN KEY (sender_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT,
  event_id TEXT,
  assigned_user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  due_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES support_threads(id),
  FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  scanned_by_user_id TEXT NOT NULL,
  scan_result TEXT DEFAULT 'valid',
  gate_name TEXT,
  scanned_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scanned_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_id ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_assigned_user_id ON support_threads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tasks_assigned_user_id ON support_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_event_id ON ticket_scans(event_id);
