// @ts-nocheck
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as db from "./database";

const NODE_ENV = String(process.env.NODE_ENV || 'development').toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';
const ENABLE_DEV_SEED = !IS_PRODUCTION && process.env.ENABLE_DEV_SEED === 'true';
const ENABLE_TEST_USERS = !IS_PRODUCTION && process.env.ENABLE_TEST_USERS === 'true';
const ENABLE_DEFAULT_USERS = !IS_PRODUCTION && process.env.ENABLE_DEFAULT_USERS === 'true';

export const initializeDatabaseConnection = async () => {
  const connection = await db.connectDatabase();
  const dbOperations = db.getDbOperations ? db.getDbOperations() : connection;

  if (!dbOperations) {
    throw new Error('Database operations not available');
  }

  return dbOperations;
};

const initializeTables = async (dbOperations) => {
  await dbOperations.run("PRAGMA foreign_keys = OFF");

  const tableQueries = [
    "CREATE TABLE IF NOT EXISTS customers (" +
      "customer_id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL," +
      "username TEXT, password TEXT NOT NULL, phone TEXT, role TEXT DEFAULT 'customer', status TEXT DEFAULT 'active'," +
      "created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), last_login TEXT, preferences TEXT DEFAULT '{}'" +
      ")",
    "CREATE TABLE IF NOT EXISTS admins (" +
      "admin_id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, username TEXT," +
      "password TEXT NOT NULL, role TEXT DEFAULT 'admin', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now'))," +
      "updated_at TEXT DEFAULT (datetime('now')), last_login TEXT, permissions TEXT DEFAULT '{}'" +
      ")",
    "CREATE TABLE IF NOT EXISTS event_managers (" +
      "manager_id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, username TEXT," +
      "password TEXT NOT NULL, phone TEXT, role TEXT DEFAULT 'event_manager', status TEXT DEFAULT 'active'," +
      "permissions TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), last_login TEXT" +
      ")",
    "CREATE TABLE IF NOT EXISTS events (" +
      "event_id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, venue TEXT NOT NULL," +
      "date TEXT NOT NULL, time TEXT NOT NULL, category TEXT NOT NULL, subcategory TEXT, image_url TEXT," +
      "status TEXT DEFAULT 'active', created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))," +
      "price REAL DEFAULT 0.0, available_tickets INTEGER DEFAULT 0, max_tickets INTEGER DEFAULT 100, is_featured INTEGER DEFAULT 0" +
      ")",
    "CREATE TABLE IF NOT EXISTS support_staff (" +
      "support_id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, username TEXT," +
      "password TEXT NOT NULL, phone TEXT, department TEXT DEFAULT 'technical', role TEXT DEFAULT 'support'," +
      "status TEXT DEFAULT 'active', availability_status TEXT DEFAULT 'available', max_tickets INTEGER DEFAULT 10," +
      "current_tickets INTEGER DEFAULT 0, avg_response_time INTEGER DEFAULT 0, satisfaction_rating REAL DEFAULT 0.0," +
      "last_login TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))" +
      ")",
    "CREATE TABLE IF NOT EXISTS event_organizers (" +
      "organizer_id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, username TEXT," +
      "password TEXT NOT NULL, phone TEXT, company TEXT, status TEXT DEFAULT 'active', role TEXT DEFAULT 'event_organizer'," +
      "last_login TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))" +
      ")",
    "CREATE TABLE IF NOT EXISTS conversations (" +
      "conversation_id TEXT PRIMARY KEY, platform TEXT NOT NULL, customer_id TEXT, customer_name TEXT," +
      "assigned_agent_id TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now'))," +
      "last_activity TEXT DEFAULT (datetime('now')), resolved_at TEXT, resolved_by TEXT" +
      ")",
    "CREATE TABLE IF NOT EXISTS messages (" +
      "message_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_name TEXT," +
      "sender_type TEXT NOT NULL, content TEXT NOT NULL, timestamp TEXT DEFAULT (datetime('now'))," +
      "platform TEXT NOT NULL, is_read INTEGER DEFAULT 0, UNIQUE(message_id) ON CONFLICT IGNORE" +
      ")",
    "CREATE TABLE IF NOT EXISTS support_agents (" +
      "support_id TEXT PRIMARY KEY, status TEXT DEFAULT 'available', auto_assign INTEGER DEFAULT 1, last_status_update TEXT DEFAULT (datetime('now'))" +
      ")",
    "CREATE TABLE IF NOT EXISTS dashboard_user_list (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL," +
      "role TEXT NOT NULL, status TEXT DEFAULT 'active', joined TEXT DEFAULT (datetime('now')), lastActive TEXT, avatar TEXT, country TEXT" +
      ")",
  ];

  for (const query of tableQueries) {
    await dbOperations.run(query);
  }

  await dbOperations.run("PRAGMA foreign_keys = ON");
};

const ensureDefaultEventManager = async (dbOperations) => {
  const existing = await dbOperations.get("SELECT * FROM event_managers WHERE email = ?", ["manager@tickethub.co.za"]);
  if (!existing) {
    const hashedPassword = await bcrypt.hash("manager123", 10);
    await dbOperations.run(
      "INSERT INTO event_managers (manager_id, name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), "Event Manager", "manager@tickethub.co.za", hashedPassword, "event_manager", "active", new Date().toISOString()]
    );
  }
};

const ensureDefaultAdmin = async (dbOperations) => {
  const existing = await dbOperations.get("SELECT * FROM admins WHERE email = ?", ["admin@tickethub.co.za"]);
  if (!existing) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await dbOperations.run(
      "INSERT INTO admins (admin_id, name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), "Admin User", "admin@tickethub.co.za", hashedPassword, "admin", "active", new Date().toISOString()]
    );
  }
};

const ensureDefaultCustomer = async (dbOperations) => {
  const existing = await dbOperations.get("SELECT * FROM customers WHERE email = ?", ["customer@test.com"]);
  if (!existing) {
    const hashedPassword = await bcrypt.hash("customer123", 10);
    await dbOperations.run(
      "INSERT INTO customers (customer_id, first_name, last_name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), "Test", "Customer", "customer@test.com", hashedPassword, "customer", "active", new Date().toISOString()]
    );
  }
};

const ensureDefaultSupport = async (dbOperations) => {
  const existing = await dbOperations.get("SELECT * FROM support_staff WHERE email = ?", ["support@tickethub.co.za"]);
  if (!existing) {
    const supportId = "support-001";
    const now = new Date().toISOString();
    const hashedPassword = await bcrypt.hash("support123", 10);
    await dbOperations.run(
      "INSERT INTO support_staff (support_id, name, email, password, phone, department, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [supportId, "Support Staff", "support@tickethub.co.za", hashedPassword, "+27 71 000 0000", "technical", "support", "active", now]
    );
    await dbOperations.run(
      "INSERT INTO support_agents (support_id, status, auto_assign, last_status_update) VALUES (?, ?, ?, ?)",
      [supportId, "available", 1, now]
    );
  }
};

const ensureDefaultOrganizer = async (dbOperations) => {
  const existing = await dbOperations.get("SELECT * FROM event_organizers WHERE email = ?", ["organizer@tickethub.co.za"]);
  if (!existing) {
    const hashedPassword = await bcrypt.hash("organizer123", 10);
    await dbOperations.run(
      "INSERT INTO event_organizers (organizer_id, name, email, password, phone, company, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), "Event Organizer", "organizer@tickethub.co.za", hashedPassword, "+27 72 000 0000", "Event Masters Inc.", "event_organizer", "active", new Date().toISOString()]
    );
  }
};

const seedSampleEvents = async (dbOperations) => {
  const count = await dbOperations.get("SELECT COUNT(*) as n FROM events");
  if (count && count.n > 0) return;
  const now = new Date().toISOString();
  await dbOperations.run(
    "INSERT INTO events (event_id, title, description, venue, date, time, category, status, created_by, created_at, updated_at, price, available_tickets, max_tickets, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["evt_seed_001", "Cape Town Jazz Festival", "Annual jazz festival at the waterfront", "V&A Waterfront", "2026-03-15", "18:00", "Music", "active", "seed", now, now, 250, 500, 500, 1]
  );
};

const createMissingMetricsTables = async (dbOperations) => {
  await dbOperations.run(
    "CREATE TABLE IF NOT EXISTS system_metrics (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, metric_key TEXT UNIQUE NOT NULL, metric_value TEXT NOT NULL," +
      "metric_type TEXT DEFAULT 'gauge', unit TEXT, description TEXT," +
      "updated_at TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now'))" +
      ")"
  );
  await dbOperations.run(
    "CREATE TABLE IF NOT EXISTS performance_metrics (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL, response_time_ms INTEGER NOT NULL," +
      "status_code INTEGER, request_size INTEGER, response_size INTEGER, created_at TEXT DEFAULT (datetime('now'))" +
      ")"
  );
};

const ensureAllTables = async (dbOperations) => {
  await dbOperations.run(
    "CREATE TABLE IF NOT EXISTS support_agents (" +
      "support_id TEXT PRIMARY KEY, status TEXT DEFAULT 'available', auto_assign INTEGER DEFAULT 1," +
      "last_status_update TEXT DEFAULT (datetime('now'))" +
      ")"
  );
};

const createTestUsers = async (dbOperations) => {
  await ensureDefaultAdmin(dbOperations);
  await ensureDefaultEventManager(dbOperations);
  await ensureDefaultCustomer(dbOperations);
};

export const runBootstrapTasks = async (dbOperations) => {
  if (!dbOperations) {
    throw new Error('Database operations not initialized');
  }

  await initializeTables(dbOperations);
  await createMissingMetricsTables(dbOperations);
  await ensureAllTables(dbOperations);

  if (ENABLE_DEFAULT_USERS) {
    await ensureDefaultEventManager(dbOperations);
    await ensureDefaultAdmin(dbOperations);
    await ensureDefaultCustomer(dbOperations);
    await ensureDefaultSupport(dbOperations);
    await ensureDefaultOrganizer(dbOperations);
  }

  if (ENABLE_TEST_USERS) {
    await createTestUsers(dbOperations);
  }

  if (ENABLE_DEV_SEED) {
    await seedSampleEvents(dbOperations);
  }
};
