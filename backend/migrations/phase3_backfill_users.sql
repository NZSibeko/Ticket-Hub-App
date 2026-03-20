-- Phase 3 backfill into canonical identity tables
-- Run after phase3_canonical_schema.sql and phase3_role_normalization.sql

INSERT OR IGNORE INTO users (id, first_name, last_name, display_name, email, password_hash, phone, status, last_login, created_at, updated_at)
SELECT
  admin_id,
  substr(name, 1, instr(name || ' ', ' ') - 1),
  trim(substr(name, instr(name || ' ', ' ') + 1)),
  name,
  email,
  password,
  phone,
  COALESCE(status, 'active'),
  last_login,
  COALESCE(created_at, datetime('now')),
  datetime('now')
FROM admins;

INSERT OR IGNORE INTO users (id, first_name, last_name, display_name, email, password_hash, phone, status, last_login, created_at, updated_at)
SELECT
  manager_id,
  substr(name, 1, instr(name || ' ', ' ') - 1),
  trim(substr(name, instr(name || ' ', ' ') + 1)),
  name,
  email,
  password,
  phone,
  COALESCE(status, 'active'),
  last_login,
  COALESCE(created_at, datetime('now')),
  datetime('now')
FROM event_managers;

INSERT OR IGNORE INTO users (id, first_name, last_name, display_name, email, password_hash, phone, status, last_login, created_at, updated_at)
SELECT
  organizer_id,
  substr(name, 1, instr(name || ' ', ' ') - 1),
  trim(substr(name, instr(name || ' ', ' ') + 1)),
  name,
  email,
  password,
  phone,
  COALESCE(status, 'active'),
  last_login,
  COALESCE(created_at, datetime('now')),
  datetime('now')
FROM event_organizers;

INSERT OR IGNORE INTO users (id, first_name, last_name, display_name, email, password_hash, phone, status, last_login, created_at, updated_at)
SELECT
  support_id,
  substr(name, 1, instr(name || ' ', ' ') - 1),
  trim(substr(name, instr(name || ' ', ' ') + 1)),
  name,
  email,
  password,
  phone,
  COALESCE(status, 'active'),
  last_login,
  COALESCE(created_at, datetime('now')),
  datetime('now')
FROM support_staff;

INSERT OR IGNORE INTO users (id, first_name, last_name, display_name, email, password_hash, phone, status, last_login, created_at, updated_at)
SELECT
  customer_id,
  first_name,
  last_name,
  trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')),
  email,
  password,
  phone,
  COALESCE(status, 'active'),
  last_login,
  COALESCE(created_at, datetime('now')),
  datetime('now')
FROM customers;

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT a.admin_id, r.id FROM admins a JOIN roles r ON r.code = 'admin';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT m.manager_id, r.id FROM event_managers m JOIN roles r ON r.code = 'manager';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT o.organizer_id, r.id FROM event_organizers o JOIN roles r ON r.code = 'event_organizer';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT s.support_id, r.id FROM support_staff s JOIN roles r ON r.code = s.role;

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT c.customer_id, r.id FROM customers c JOIN roles r ON r.code = 'customer';
