// src/utils/api.js - NEW FILE FOR CENTRALIZED API CALLS
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8081";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 second timeout
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        // Clean the token
        const cleanToken = token.replace(/^"(.*)"$/, "$1").trim();
        config.headers.Authorization = `Bearer ${cleanToken}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });

    // Handle specific errors
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        "Cannot connect to server. Make sure backend is running on",
        API_URL,
      );
    } else if (error.response?.status === 401) {
      console.error("Unauthorized - token may be expired");
    } else if (error.response?.status === 403) {
      console.error("Forbidden - insufficient permissions");
    } else if (error.response?.status === 404) {
      console.error("Endpoint not found:", error.config?.url);
    } else if (error.response?.status === 500) {
      console.error("Server error:", error.response?.data?.error);
    }

    return Promise.reject(error);
  },
);

// API helper functions
export const adminAPI = {
  // Dashboard stats
  getDashboardStats: (range = "week") =>
    api.get(`/api/admin/dashboard/stats?range=${range}`),

  // Comprehensive metrics
  getComprehensiveMetrics: () => api.get("/api/metrics/database-comprehensive"),

  // Simplified dashboard
  getDashboard: () => api.get("/api/metrics/dashboard"),

  // User management
  getUsersDashboard: () => api.get("/api/admin/users/dashboard"),

  // System info
  getSystemInfo: () => api.get("/api/system/info"),

  // Database stats
  getDatabaseStatistics: () => api.get("/api/database/statistics"),

  // Metrics diagnostics
  getMetricsDiagnostics: () => api.get("/api/metrics-diagnostics"),

  // Force metrics refresh
  refreshMetrics: () => api.post("/api/metrics-refresh"),

  // Database backup
  createBackup: () => api.post("/api/database/backup"),
};

export const eventsAPI = {
  getAllEvents: () => api.get("/api/events"),

  getPublicEvents: () => api.get("/api/events/public"),

  getEventById: (id) => api.get(`/api/events/${id}`),

  createEvent: (data) => api.post("/api/events", data),

  updateEvent: (id, data) => api.put(`/api/events/${id}`, data),

  deleteEvent: (id) => api.delete(`/api/events/${id}`),

  // Approval system
  getPendingApprovals: () => api.get("/api/events/pending/approvals"),

  approveEvent: (id, notes) => api.put(`/api/events/${id}/validate`, { notes }),

  rejectEvent: (id, reason) => api.put(`/api/events/${id}/reject`, { reason }),

  archiveEvent: (id) => api.put(`/api/events/${id}/archive`),

  unarchiveEvent: (id) => api.put(`/api/events/${id}/unarchive`),
};

export const authAPI = {
  validateToken: () => api.get("/api/auth/validate-token"),

  login: (email, password) => api.post("/api/auth/login", { email, password }),

  adminLogin: (email, password) =>
    api.post("/api/admin/auth/login", { email, password }),

  demoLogin: () =>
    api.post("/api/admin/demo-login", {
      email: "admin@tickethub.co.za",
      password: "admin123",
    }),
};

export const supportAPI = {
  getTickets: () => api.get("/api/support/tickets"),

  getConversations: () => api.get("/api/support/conversations"),

  processRefund: (ticketId) =>
    api.post(`/api/support/tickets/${ticketId}/refund`),

  validateTicket: (data) => api.post("/api/support/tickets/validate", data),
};

// Health check
export const healthCheck = () => api.get("/api/health");

// Debug endpoints
export const debugAPI = {
  testDatabase: () => api.get("/api/debug/database-test"),

  testEvents: () => api.get("/api/debug/events"),

  getDatabaseStatus: () => api.get("/api/events/debug/status"),
};

export default api;
