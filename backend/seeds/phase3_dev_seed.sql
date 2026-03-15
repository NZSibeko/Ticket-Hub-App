-- Phase 3 dev seed for canonical tables

INSERT OR IGNORE INTO users (id, first_name, last_name, display_name, email, password_hash, phone, status, created_at, updated_at)
VALUES
  ('demo-admin-001', 'Admin', 'User', 'Admin User', 'admin@tickethub.co.za', 'USE_EXISTING_HASH', '+27 71 000 0001', 'active', datetime('now'), datetime('now')),
  ('demo-manager-001', 'Manager', 'User', 'Manager User', 'manager@tickethub.co.za', 'USE_EXISTING_HASH', '+27 71 000 0002', 'active', datetime('now'), datetime('now')),
  ('demo-omni-001', 'Omni', 'Consultant', 'Omni Support Consultant', 'support@tickethub.co.za', 'USE_EXISTING_HASH', '+27 71 000 0003', 'active', datetime('now'), datetime('now')),
  ('demo-eventsupport-001', 'Event', 'Consultant', 'Event Support Consultant', 'eventsupport@tickethub.co.za', 'USE_EXISTING_HASH', '+27 71 000 0004', 'active', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT 'demo-admin-001', id FROM roles WHERE code = 'admin';
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT 'demo-manager-001', id FROM roles WHERE code = 'manager';
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT 'demo-omni-001', id FROM roles WHERE code = 'omni_support_consultant';
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT 'demo-eventsupport-001', id FROM roles WHERE code = 'event_support_consultant';
