// @ts-nocheck
// backend/server.mjs - FINAL ESM CONVERSION
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";
import WebSocket from "ws";
import { initializeDatabaseConnection, runBootstrapTasks } from "./bootstrap";

// Global variable for db operations
let dbOperations = null;
try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { jsx: "preserve" },
  });
} catch (e) {}
const loadModule = async (modulePath) => {
  // Prefer synchronous require (CommonJS) first for compatibility,
  // then fall back to dynamic import for ES modules.
  try {
    const required = require(modulePath);
    return required && required.default ? required.default : required;
  } catch (requireErr) {
    try {
      const mod = await import(modulePath);
      return mod && mod.default ? mod.default : mod;
    } catch (importErr) {
      // If both fail, throw the original require error for debugging
      throw requireErr;
    }
  }
};

// --- Structured Logging (orderly + detailed) ---
const nativeConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug
    ? console.debug.bind(console)
    : console.log.bind(console),
};

const LOG_LEVEL_PRIORITY = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const CURRENT_LOG_LEVEL = (
  (process.env.LOG_LEVEL || "DEBUG") + ""
).toUpperCase();
const ACTIVE_LOG_PRIORITY =
  LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL] !== undefined
    ? LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL]
    : LOG_LEVEL_PRIORITY.DEBUG;

const sanitizeLogText = (value) => {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeLogArg = (arg) => {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }
  return arg;
};

const emitLog = (level, scope, message, details) => {
  if (LOG_LEVEL_PRIORITY[level] > ACTIVE_LOG_PRIORITY) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope: sanitizeLogText(scope || "APP"),
    message: sanitizeLogText(message || ""),
    ...(details ? { details } : {}),
  };
  nativeConsole.log(JSON.stringify(entry));
};

const logStructured = (level, scope, message, details) => {
  emitLog(level, scope, message, details);
};

const log = {
  error: (scope, message, details) =>
    logStructured("ERROR", scope, message, details),
  warn: (scope, message, details) =>
    logStructured("WARN", scope, message, details),
  info: (scope, message, details) =>
    logStructured("INFO", scope, message, details),
  debug: (scope, message, details) =>
    logStructured("DEBUG", scope, message, details),
};

// Keep legacy console calls working, but force orderly structured format.
console.log = (...args) => {
  const message = typeof args[0] === "string" ? args[0] : "log";
  const details =
    args.length > 1 ? args.slice(1).map(normalizeLogArg) : undefined;
  emitLog("INFO", "LEGACY", message, details);
};
console.warn = (...args) => {
  const message = typeof args[0] === "string" ? args[0] : "warn";
  const details =
    args.length > 1 ? args.slice(1).map(normalizeLogArg) : undefined;
  emitLog("WARN", "LEGACY", message, details);
};
console.error = (...args) => {
  const message = typeof args[0] === "string" ? args[0] : "error";
  const details =
    args.length > 1 ? args.slice(1).map(normalizeLogArg) : undefined;
  emitLog("ERROR", "LEGACY", message, details);
};
console.debug = (...args) => {
  const message = typeof args[0] === "string" ? args[0] : "debug";
  const details =
    args.length > 1 ? args.slice(1).map(normalizeLogArg) : undefined;
  emitLog("DEBUG", "LEGACY", message, details);
};

// --- All Function Definitions (Must be defined before use) ---

// === DATABASE INITIALIZATION & SETUP ===

const NGROK_URL = "https://hysteretic-susann-struthious.ngrok-free.dev";
let MetricsService = null;
let metricsService = null;
let metricsInitialized = false;
const readinessState = {
  startedAt: new Date().toISOString(),
  currentStage: "booting",
  completedStages: [],
  envValidated: false,
  dbConnected: false,
  bootstrapComplete: false,
  routesMounted: false,
  httpListening: false,
  metricsInitialized: false,
  scraperReady: false,
  dbManagementReady: false,
  systemLogsReady: false,
  lastError: null,
  failure: null,
};

const markStartupStage = (stage) => {
  readinessState.currentStage = stage;
  if (!readinessState.completedStages.includes(stage)) {
    readinessState.completedStages.push(stage);
  }
};

const recordStartupFailure = (stage, error) => {
  const message = error?.message || String(error);
  readinessState.currentStage = stage;
  readinessState.lastError = message;
  readinessState.failure = {
    stage,
    message,
    name: error?.name || "Error",
    timestamp: new Date().toISOString(),
  };
};
// MetricsService will be loaded later during async startup

let whatsappService = null;

let messengerService = null;

let twitterService = null;

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });
const wssDashboard = new WebSocket.Server({ server, path: "/ws/dashboard" });
const activeAgents = new Map();
const dashboardClients = new Set();
console.log("✅ WebSocket Servers created: /ws and /ws/dashboard");

function broadcastToAll(message, excludeWs = null) {
  let broadcastCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      try {
        client.send(JSON.stringify(message));
        broadcastCount++;
      } catch (error) {}
    }
  });
  return broadcastCount;
}

function broadcastToConversation(conversationId, message, excludeWs = null) {
  let broadcastCount = 0;
  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client !== excludeWs &&
      client.currentConversation === conversationId
    ) {
      try {
        client.send(JSON.stringify(message));
        broadcastCount++;
      } catch (error) {}
    }
  });
  return broadcastCount;
}

async function sendDashboardMetrics(ws) {
  if (!dbOperations) return;
  try {
    const stats = await getDashboardStats();
    ws.send(
      JSON.stringify({
        type: "metrics_update",
        data: {
          timestamp: new Date().toISOString(),
          metrics: stats,
          period: "realtime",
        },
      }),
    );
  } catch (error) {
    console.error("Error sending dashboard metrics:", error);
  }
}

function broadcastToDashboard(message) {
  let broadcastCount = 0;
  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        broadcastCount++;
      } catch (error) {}
    }
  });
  return broadcastCount;
}

setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.ping();
      } catch (error) {}
    }
  });
}, 30000);

wss.broadcastToAll = broadcastToAll;
wss.broadcastToConversation = broadcastToConversation;
wss.getActiveAgents = () => activeAgents.size;
wss.getConnectedClients = () => wss.clients.size;

app.locals.wss = wss;
app.locals.wssDashboard = wssDashboard;
app.locals.dashboardClients = dashboardClients;
app.locals.broadcastToDashboard = broadcastToDashboard;
app.locals.wsClients = new Map();

// ============================
// FIXED CORS CONFIGURATION
// ============================
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://hysteretic-susann-struthious.ngrok-free.dev",
        "https://tickethub-whatsapp.loca.lt",
        "http://localhost:8082",
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:19006",
        "http://localhost:19000",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
        "http://localhost:8083",
      ];
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        log.warn("CORS", "Blocked origin", { origin });
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Session-ID",
      "ngrok-skip-browser-warning",
    ],
  }),
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  res.header("ngrok-skip-browser-warning", "any-value-here");
  next();
});
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://hysteretic-susann-struthious.ngrok-free.dev",
    "http://localhost:8082",
    "http://localhost:8081",
    "http://localhost:3000",
    "http://localhost:3001",
  ];
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "null");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Session-ID, ngrok-skip-browser-warning",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("ngrok-skip-browser-warning", "any-value-here");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "ticket-hub-super-secret-2025";

// Middlewares
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Access token required" });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

const checkUserStatus = async (req, res, next) => {
  if (!req.user) {
    return next();
  }
  try {
    const user = req.user;
    let userTable, userIdColumn;
    if (user.role === "customer" || user.userType === "customer") {
      userTable = "customers";
      userIdColumn = "customer_id";
    } else if (
      user.role === "event_manager" ||
      user.userType === "event_manager"
    ) {
      userTable = "event_managers";
      userIdColumn = "manager_id";
    } else if (
      user.role === "admin" ||
      user.userType === "admin" ||
      user.role === "SUPER_ADMIN"
    ) {
      userTable = "admins";
      userIdColumn = "admin_id";
    } else if (user.role === "support" || user.userType === "support") {
      userTable = "support_staff";
      userIdColumn = "support_id";
    } else if (
      user.role === "event_organizer" ||
      user.userType === "event_organizer"
    ) {
      userTable = "event_organizers";
      userIdColumn = "organizer_id";
    } else {
      return next();
    }
    const dbUser = await dbOperations.get(
      `SELECT status FROM ${userTable} WHERE ${userIdColumn} = ?`,
      [user[userIdColumn] || user.userId],
    );
    if (
      dbUser &&
      (dbUser.status === "suspended" || dbUser.status === "inactive")
    ) {
      return res.status(403).json({
        success: false,
        error: `Your account (${user.email}) has been ${dbUser.status}. Please contact administrator.`,
      });
    }
    next();
  } catch (err) {
    console.error("User status check error:", err);
    next();
  }
};

const requireAdmin = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (!["admin", "SUPER_ADMIN"].includes(role)) {
    return res
      .status(403)
      .json({ success: false, error: "Admin access required" });
  }
  next();
};

const requireEventManager = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (role !== "event_manager") {
    return res
      .status(403)
      .json({ success: false, error: "Event Manager access required" });
  }
  next();
};

const requireAdminOrManager = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (!["admin", "SUPER_ADMIN", "event_manager"].includes(role)) {
    return res
      .status(403)
      .json({ success: false, error: "Admin or Manager access required" });
  }
  next();
};

const requireSupport = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (role !== "support") {
    return res
      .status(403)
      .json({ success: false, error: "Support staff access required" });
  }
  next();
};

const requireEventOrganizer = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (role !== "event_organizer") {
    return res
      .status(403)
      .json({ success: false, error: "Event Organizer access required" });
  }
  next();
};

app.locals.authenticateToken = authenticateToken;
app.locals.checkUserStatus = checkUserStatus;
app.locals.requireAdmin = requireAdmin;
app.locals.requireEventManager = requireEventManager;
app.locals.requireAdminOrManager = requireAdminOrManager;
app.locals.requireSupport = requireSupport;
app.locals.requireEventOrganizer = requireEventOrganizer;

// ============================
// METRICS STATUS DISPLAY FUNCTION
// ============================
const updateMetricsStatusMessage = () => {
  log.info("METRICS", "Metrics status updated", {
    initialized: metricsInitialized,
  });
};

// ============================
// FORCE REAL METRICS INITIALIZATION
// ============================
const initializeMetricsSystem = async () => {
  console.log("\n=== FORCING REAL METRICS INITIALIZATION ===");
  try {
    if (!MetricsService) {
      console.error("❌ MetricsService is null or undefined");
      return;
    }
    metricsService = new MetricsService();
    if (!metricsService) {
      console.error("❌ Failed to create MetricsService instance");
      return;
    }
    app.locals.metricsService = metricsService;
    try {
      await dbOperations.run(
        "CREATE TABLE IF NOT EXISTS system_metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, metric_key TEXT UNIQUE NOT NULL, metric_value TEXT NOT NULL, metric_type TEXT DEFAULT 'gauge', unit TEXT, description TEXT, updated_at TEXT DEFAULT (datetime('now')), created_at TEXT DEFAULT (datetime('now')))",
      );
      await dbOperations.run(
        "CREATE TABLE IF NOT EXISTS performance_metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL, response_time_ms INTEGER NOT NULL, status_code INTEGER, request_size INTEGER, response_size INTEGER, created_at TEXT DEFAULT (datetime('now')))",
      );
      console.log("✓ Metrics tables verified");
    } catch (tableError) {
      console.error("⚠ Could not create metrics tables:", tableError.message);
    }
    try {
      await metricsService.startMetricsCollection();
      console.log("✓ Metrics collection started successfully");
      metricsInitialized = true;
      readinessState.metricsInitialized = true;
      if (
        metricsService.updateAllMetrics ||
        metricsService.updateAllMetricsSafe
      ) {
        const updateMethod =
          metricsService.updateAllMetrics ||
          metricsService.updateAllMetricsSafe;
        await updateMethod.call(metricsService);
        console.log("✓ Initial metrics updated");
      }
      setInterval(
        async () => {
          if (
            metricsService &&
            (metricsService.updateAllMetrics ||
              metricsService.updateAllMetricsSafe)
          ) {
            try {
              await (
                metricsService.updateAllMetrics ||
                metricsService.updateAllMetricsSafe
              ).call(metricsService);
              console.log("🔄 Periodic metrics update completed");
            } catch (err) {
              console.error("Periodic metrics update failed:", err.message);
            }
          }
        },
        5 * 60 * 1000,
      );
      console.log("✅ REAL METRICS SYSTEM FULLY INITIALIZED");
      updateMetricsStatusMessage();
    } catch (startError) {
      console.error(
        "❌ Failed to start metrics collection:",
        startError.message,
      );
      metricsInitialized = false;
      readinessState.metricsInitialized = false;
      recordStartupFailure("metrics-init", startError);
      updateMetricsStatusMessage();
    }
  } catch (error) {
    console.error("❌ CRITICAL: Failed to initialize metrics system:", error);
    metricsInitialized = false;
    readinessState.metricsInitialized = false;
    recordStartupFailure("metrics-init", error);
    updateMetricsStatusMessage();
  }
};

// WebSocket Setup (omitted for brevity, assumed correct from previous read)
// ...
// ============================
// FIXED: Serve frontend only if it exists
// ============================
try {
  const frontendPath = path.join(__dirname, "../frontend");
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log("✓ Frontend static files served from:", frontendPath);
  } else {
    console.log("⚠ Frontend directory not found, skipping static file serving");
  }
} catch (error) {
  console.log("⚠ Could not serve frontend:", error.message);
}

const PORT = Number(process.env.PORT) || 8081;
const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";
const ENABLE_DEV_SEED =
  process.env.ENABLE_DEV_SEED === "true" ||
  (!IS_PRODUCTION && process.env.ENABLE_DEV_SEED !== "false");
const PROD_REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_VERIFY_TOKEN",
];
const PROD_DISALLOWED_EXACT_VALUES = new Map([
  [
    "JWT_SECRET",
    [
      "ticket-hub-super-secret-2025",
      "replace-with-strong-secret",
      "your-super-secret-jwt-key-change-this-in-production",
    ],
  ],
  [
    "STRIPE_SECRET_KEY",
    ["sk_test_your_key_here", "sk_live_your_stripe_secret_key"],
  ],
  [
    "WHATSAPP_ACCESS_TOKEN",
    ["replace-with-valid-token", "your_whatsapp_access_token"],
  ],
  ["WHATSAPP_PHONE_NUMBER_ID", ["your_phone_number_id"]],
  ["WHATSAPP_BUSINESS_ACCOUNT_ID", ["your_business_account_id"]],
  ["WHATSAPP_VERIFY_TOKEN", ["tickethub_whatsapp_2025"]],
]);
const PROD_DISALLOWED_SUBSTRINGS = new Map([
  [
    "JWT_SECRET",
    ["replace-with", "change-this-in-production", "your-super-secret"],
  ],
  ["STRIPE_SECRET_KEY", ["your_key_here", "your_stripe_secret_key"]],
  ["WHATSAPP_ACCESS_TOKEN", ["replace-with", "your_whatsapp_access_token"]],
  ["WHATSAPP_PHONE_NUMBER_ID", ["your_phone_number_id"]],
  ["WHATSAPP_BUSINESS_ACCOUNT_ID", ["your_business_account_id"]],
  ["WHATSAPP_VERIFY_TOKEN", ["tickethub_whatsapp_2025"]],
]);
const ENABLE_SCRAPER =
  process.env.ENABLE_SCRAPER === "true" ||
  (!IS_PRODUCTION && process.env.ENABLE_SCRAPER !== "false");
const ENABLE_AUTOMATIC_BACKUPS =
  process.env.ENABLE_AUTOMATIC_BACKUPS === "true";
const ENABLE_LOG_MONITORING = process.env.ENABLE_LOG_MONITORING === "true";
const ENABLE_TEST_USERS =
  process.env.ENABLE_TEST_USERS === "true" ||
  (!IS_PRODUCTION && process.env.ENABLE_TEST_USERS !== "false");
const ENABLE_DEFAULT_USERS =
  process.env.ENABLE_DEFAULT_USERS === "true" ||
  (!IS_PRODUCTION && process.env.ENABLE_DEFAULT_USERS !== "false");
const BOOTSTRAP_ON_START =
  process.env.BOOTSTRAP_ON_START === "true" ||
  (!IS_PRODUCTION && process.env.BOOTSTRAP_ON_START !== "false");
const BOOTSTRAP_ONLY = process.argv.includes("--bootstrap-only");

const getReadinessSnapshot = () => ({
  service: "ticket-hub-backend",
  environment: NODE_ENV,
  status:
    readinessState.envValidated &&
    readinessState.dbConnected &&
    readinessState.routesMounted &&
    readinessState.httpListening &&
    readinessState.metricsInitialized
      ? "ready"
      : "not_ready",
  startup: {
    currentStage: readinessState.currentStage,
    completedStages: readinessState.completedStages,
    failure: readinessState.failure,
  },
  checks: {
    envValidated: readinessState.envValidated,
    dbConnected: readinessState.dbConnected,
    bootstrapComplete: readinessState.bootstrapComplete,
    routesMounted: readinessState.routesMounted,
    httpListening: readinessState.httpListening,
    metricsInitialized: readinessState.metricsInitialized,
    scraperReady: readinessState.scraperReady,
    dbManagementReady: readinessState.dbManagementReady,
    systemLogsReady: readinessState.systemLogsReady,
  },
  startedAt: readinessState.startedAt,
  timestamp: new Date().toISOString(),
  lastError: readinessState.lastError,
});

const validateProductionEnvironment = () => {
  if (!IS_PRODUCTION) {
    return;
  }

  const errors = [];

  if (!Number.isFinite(PORT) || PORT <= 0 || PORT > 65535) {
    errors.push("PORT must be a valid TCP port between 1 and 65535.");
  }

  for (const envName of PROD_REQUIRED_ENV_VARS) {
    const value = String(process.env[envName] || "").trim();
    if (!value) {
      errors.push(`${envName} is required in production.`);
      continue;
    }

    const bannedExact = PROD_DISALLOWED_EXACT_VALUES.get(envName) || [];
    if (bannedExact.includes(value)) {
      errors.push(`${envName} is using a placeholder or demo value.`);
      continue;
    }

    const bannedSubstrings = PROD_DISALLOWED_SUBSTRINGS.get(envName) || [];
    if (
      bannedSubstrings.some((token) =>
        value.toLowerCase().includes(token.toLowerCase()),
      )
    ) {
      errors.push(
        `${envName} still looks like a placeholder and must be replaced.`,
      );
    }
  }

  const jwtSecret = String(process.env.JWT_SECRET || "");
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters in production.");
  }

  const stripeSecret = String(process.env.STRIPE_SECRET_KEY || "");
  if (stripeSecret && !stripeSecret.startsWith("sk_live_")) {
    errors.push(
      "STRIPE_SECRET_KEY must be a live Stripe secret in production.",
    );
  }

  if (String(process.env.PAYMENT_TEST_MODE || "").toLowerCase() === "true") {
    errors.push("PAYMENT_TEST_MODE must be false in production.");
  }

  if (errors.length > 0) {
    const error = new Error(
      `Production environment validation failed:\n- ${errors.join("\n- ")}`,
    );
    error.name = "ProductionEnvironmentValidationError";
    throw error;
  }
};

// ============================
// ROUTE MOUNTING DEFINITIONS
// ============================

async function mountRoutes() {
  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      service: "ticket-hub-backend",
      status: "alive",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/ready", async (req, res) => {
    const snapshot = getReadinessSnapshot();
    const statusCode = snapshot.status === "ready" ? 200 : 503;
    res.status(statusCode).json(snapshot);
  });

  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      service: "ticket-hub-backend",
      status: "alive",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, error: "Email and password required" });
      }
      const userTables = [
        { table: "admins", idCol: "admin_id", role: "admin" },
        { table: "event_managers", idCol: "manager_id", role: "event_manager" },
        { table: "support_staff", idCol: "support_id", role: "support" },
        {
          table: "event_organizers",
          idCol: "organizer_id",
          role: "event_organizer",
        },
        { table: "customers", idCol: "customer_id", role: "customer" },
      ];
      // Startup tasks (metrics/service loading) run in main server startup
      const token = jwt.sign(
        {
          userId,
          email: foundUser.email,
          role,
          userType: role,
          [idCol]: userId,
          name:
            foundUser.name ||
            `${foundUser.first_name || ""} ${foundUser.last_name || ""}`.trim(),
        },
        JWT_SECRET,
        { expiresIn: "24h" },
      );
      return res.json({
        success: true,
        token,
        user: { ...foundUser, userId, role, userType: role, [idCol]: userId },
      });
    } catch (error) {
      console.error("Universal login error:", error);
      return res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  // 1. Unprotected Auth Routes (Crucial for initial login)
  try {
    const universalAuthRoutes = await loadModule("./routes/auth.tsx");
    app.use("/api/auth", universalAuthRoutes);
    console.log("✓ Universal auth routes loaded");
  } catch (error) {
    console.log("⚠ Universal auth routes not available:", error.message);
  }

  try {
    const adminAuthRoutes = await loadModule("./routes/auth/adminAuth.tsx");
    app.use("/api/admin", adminAuthRoutes);
    console.log("✓ Admin auth routes loaded");
  } catch (error) {
    console.log("⚠ Admin auth routes not available:", error.message);
  }

  // Other specific auth mounts from original file
  try {
    const supportAuthRoutes = await loadModule("./routes/auth/supportAuth.tsx");
    app.use("/api/auth/support", supportAuthRoutes);
    console.log("Support auth routes loaded");
  } catch (error) {
    console.log("Support auth routes not available:", error.message);
  }
  try {
    const organizerAuthRoutes = await loadModule(
      "./routes/auth/organizerAuth.tsx",
    );
    app.use("/api/auth/organizer", organizerAuthRoutes);
    console.log("Organizer auth routes loaded");
  } catch (error) {
    console.log("Organizer auth routes not available:", error.message);
  }
  try {
    const eventManagerAuthRoutes = await loadModule(
      "./routes/auth/eventManagerAuth.tsx",
    );
    app.use("/api/event-manager/auth", eventManagerAuthRoutes);
    console.log("Event manager auth routes loaded");
  } catch (error) {
    console.log("Event manager auth routes not available:", error.message);
  }

  // 2. Protected Routes (Require authenticateToken)
  // Admin Dashboard Routes
  try {
    const adminDashboardRoutes = await loadModule(
      "./routes/adminDashboard.tsx",
    );
    app.use(
      "/api/admin/dashboard",
      authenticateToken,
      checkUserStatus,
      requireAdminOrManager,
      adminDashboardRoutes,
    );
    console.log("✓ Admin dashboard routes loaded");
  } catch (error) {
    console.log("⚠ Admin dashboard routes not available:", error.message);
  }

  // Database Routes
  try {
    const databaseRoutes = await loadModule("./routes/databaseManagement.tsx");
    app.use(
      "/api/database",
      authenticateToken,
      checkUserStatus,
      requireAdmin,
      databaseRoutes,
    );
    console.log("✓ Database management routes loaded");
  } catch (error) {
    console.log("⚠ Database management routes not available:", error.message);
  }

  // Metrics Routes
  try {
    const metricsRoutes = await loadModule("./routes/metricsAPI.tsx");
    app.use(
      "/api/metrics",
      authenticateToken,
      checkUserStatus,
      requireAdminOrManager,
      metricsRoutes,
    );
    console.log("✓ Metrics API routes loaded");
  } catch (error) {
    console.log("⚠ Metrics API routes not available:", error.message);
  }
  // Admin Users Routes
  try {
    const adminUsersRoutes = await loadModule("./routes/adminUsers.tsx");
    app.use(
      "/api/admin/users",
      authenticateToken,
      checkUserStatus,
      requireAdmin,
      adminUsersRoutes,
    );
    console.log("✓ Admin users routes loaded");
  } catch (error) {
    console.log("⚠ Admin users routes not available:", error.message);
  }

  // Support Routes
  try {
    const supportRoutes = await loadModule("./routes/support.tsx");
    app.use(
      "/api/support",
      authenticateToken,
      checkUserStatus,
      requireSupport,
      supportRoutes,
    );
    console.log("✓ Support routes loaded");
  } catch (error) {
    console.log("⚠ Support routes not available:", error.message);
  }

  // Event Organizer Routes
  try {
    const organizerRoutes = await loadModule("./routes/organizer.tsx");
    app.use(
      "/api/organizer",
      authenticateToken,
      checkUserStatus,
      requireEventOrganizer,
      organizerRoutes,
    );
    console.log("✓ Organizer routes loaded");
  } catch (error) {
    console.log("⚠ Organizer routes not available:", error.message);
  }

  // Event Planner Routes
  try {
    const eventPlannerRoutes = await loadModule("./routes/eventPlanner.tsx");
    app.use(
      "/api/event-manager/planner",
      authenticateToken,
      checkUserStatus,
      requireEventManager,
      eventPlannerRoutes,
    );
    console.log("✓ Event planner routes loaded");
  } catch (error) {
    console.log("⚠ Event planner routes not available:", error.message);
  }

  // Events Routes (Public/Protected based on route)
  console.log("[ROUTE MOUNT] Attempting to load events route...");
  try {
    const eventsRoutes = await loadModule("./routes/events.tsx");
    console.log(
      "[ROUTE MOUNT] Events route module loaded:",
      typeof eventsRoutes,
    );
    app.use("/api/events", eventsRoutes);
    console.log("✓ Events routes loaded with database access");
  } catch (error) {
    console.log("⚠ Events routes not available:", error.message);
  }
  console.log("[ROUTE MOUNT] Finished events route mount attempt.");

  // Social Media / Webhook Routes
  try {
    const whatsappWebhook = await loadModule("./routes/whatsapp-webhook.tsx");
    app.use("/api/whatsapp", whatsappWebhook);
    console.log("✓ WhatsApp webhook routes loaded");
  } catch (error) {
    console.log("⚠ WhatsApp webhook routes not available:", error.message);
  }

  if (!IS_PRODUCTION) {
    // Debug Routes
    try {
      const metricsDebugRoutes = await loadModule("./routes/metricsDebug.tsx");
      app.use("/api/debug", metricsDebugRoutes);
      console.log("✓ Debug routes loaded");
    } catch (error) {
      console.log("⚠ Debug routes not available:", error.message);
    }

    // Test Routes
    try {
      const debugRoutes = await loadModule("./routes/debug.tsx");
      app.use("/api/test", debugRoutes);
      console.log("✓ Test routes loaded");
    } catch (error) {
      console.log("⚠ Test routes not available:", error.message);
    }
  } else {
    console.log("Debug/test routes disabled in production");
  }

  // Support Chat Routes (from initial read)
  try {
    const supportChatRoutes = await loadModule(
      "./routes/supportChatRoutes.tsx",
    );
    app.use(
      "/api/support",
      authenticateToken,
      checkUserStatus,
      supportChatRoutes,
    );
    console.log("✓ Support chat routes loaded (re-added)");
  } catch (error) {
    console.log("⚠ Support chat routes not available (re-add):", error.message);
  }
}

// System Admin Routes
try {
  app.get(
    "/api/system/info",
    authenticateToken,
    checkUserStatus,
    requireAdmin,
    (req, res) => {
      const systemInfo = {
        success: true,
        message: "System Info Endpoint Active",
      };
      res.json(systemInfo);
    },
  );
  console.log("✓ System info endpoint loaded");
} catch (error) {
  console.log("⚠ System info endpoint failed to load:", error.message);
}

// Catch-all for unhandled /api routes (will return 404)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      error: "API endpoint not found",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }
  next();
});

// Catch-all for non-API routes (Frontend Fallback) - **REGEX CORRECTED HERE**
app.all(
  /^(?!\/api|\/webhook|\/ws|\/health|\/ready|\/ws-info).*$/,
  (req, res) => {
    res.json({
      message: "Backend Running",
      docs: "/api/health",
    });
  },
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

// ============================
// SERVER STARTUP (MOVED TO END)
// ============================
(async () => {
  try {
    console.log("============================================");
    console.log("🚀 Starting Ticket-Hub Backend Server...");
    console.log("============================================");

    markStartupStage("environment-validation");
    validateProductionEnvironment();
    readinessState.envValidated = true;
    console.log("✓ Environment validation passed");

    markStartupStage("database-connection");
    dbOperations = await initializeDatabaseConnection();
    readinessState.dbConnected = true;
    app.locals.db = dbOperations;
    console.log("✓ Database operations initialized");

    if (BOOTSTRAP_ON_START || BOOTSTRAP_ONLY) {
      markStartupStage("bootstrap");
      await runBootstrapTasks(dbOperations);
      readinessState.bootstrapComplete = true;
    } else {
      console.log("ℹ️ Bootstrap-on-start disabled");
    }

    if (BOOTSTRAP_ONLY) {
      console.log(
        "✓ Bootstrap completed; exiting without starting HTTP server",
      );
      process.exit(0);
    }

    markStartupStage("route-mounting");
    await mountRoutes();
    readinessState.routesMounted = true;

    if (ENABLE_SCRAPER) {
      try {
        const EnhancedEventScraperService = await loadModule(
          "./services/EnhancedEventScraperService.tsx",
        );
        const scraper = new EnhancedEventScraperService();
        scraper.startAutoScrape();
        readinessState.scraperReady = true;
        console.log("✓ Auto scraper started");
      } catch (err) {
        recordStartupFailure("scraper-init", err);
        console.log("⚠ Scraper service not available:", err.message);
      }
    } else {
      console.log("ℹ️ Background scraper disabled");
    }

    try {
      const DatabaseManagementService = await loadModule(
        "./services/DatabaseManagementService.tsx",
      );
      const dbManagementService = new DatabaseManagementService();
      app.locals.dbManagementService = dbManagementService;
      readinessState.dbManagementReady = true;
      if (ENABLE_AUTOMATIC_BACKUPS) {
        dbManagementService.scheduleAutomaticBackups(24);
        console.log("✓ Automatic backups scheduled");
      } else {
        console.log("ℹ️ Automatic backups disabled");
      }
      console.log("✓ Database management service initialized");
    } catch (error) {
      recordStartupFailure("db-management-init", error);
      console.log(
        "⚠ Database management service not available:",
        error.message,
      );
    }

    try {
      const SystemLogsService = await loadModule(
        "./services/SystemLogsService.tsx",
      );
      const systemLogsService = new SystemLogsService();
      app.locals.systemLogsService = systemLogsService;
      readinessState.systemLogsReady = true;
      if (ENABLE_LOG_MONITORING) {
        setInterval(
          () => {
            systemLogsService.monitorLogLevels().catch((err) => {
              console.error("Log monitoring failed:", err.message);
            });
          },
          60 * 60 * 1000,
        );
        console.log("✓ Log monitoring enabled");
      } else {
        console.log("ℹ️ Log monitoring disabled");
      }
      console.log("✓ System logs service initialized");
    } catch (error) {
      recordStartupFailure("system-logs-init", error);
      console.log("⚠ System logs service not available:", error.message);
    }

    markStartupStage("http-listen");
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(PORT, "0.0.0.0", () => {
        server.removeListener("error", reject);
        readinessState.httpListening = true;
        resolve(PORT);
      });
    });
    const activePort = PORT;
    console.log("\n============================================");
    console.log("TICKET-HUB BACKEND IS LIVE");
    console.log("============================================");
    console.log(`   HTTP Server: http://localhost:${activePort}`);
    console.log(`   NGROK URL: ${NGROK_URL}`);
    console.log(`   WebSocket Server: ws://localhost:${activePort}/ws`);
    console.log(
      `   Dashboard WebSocket: ws://localhost:${activePort}/ws/dashboard`,
    );
    console.log(`   Health Check: http://localhost:${activePort}/health`);
    console.log("============================================\n");

    markStartupStage("metrics-init");
    setTimeout(async () => {
      await initializeMetricsSystem();
      if (readinessState.metricsInitialized) {
        markStartupStage("ready");
      }
    }, 2000);
  } catch (err) {
    recordStartupFailure(readinessState.currentStage || "startup", err);
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
})();

// ============================
// GRACEFUL SHUTDOWN
// ============================
process.on("SIGTERM", async () => {
  console.log("\nSIGTERM received. Shutting down gracefully...");
  if (metricsService && metricsService.stop) {
    metricsService.stop();
  }
  try {
    await db.close();
  } catch (err) {
    console.error("Error closing database:", err);
  }
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
process.on("SIGINT", () => {
  console.log("\nSIGINT received. Shutting down gracefully...");
  if (metricsService && metricsService.stop) {
    metricsService.stop();
  }
  console.log("Server shutdown complete.");
  process.exit(0);
});

export { app, server };
