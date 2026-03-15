import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const API_URL = 'http://localhost:8081';

// Add Tailwind CDN
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
  
  const style = document.createElement('style');
  style.id = 'custom-animations';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .h-screen-dynamic {
      height: 100vh;
      height: 100dvh;
    }
    .max-h-screen-dynamic {
      max-height: 100vh;
      max-height: 100dvh;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
    .animate-shake {
      animation: shake 0.5s ease-in-out;
    }
  `;
  document.head.appendChild(style);
}

// FIXED: Updated icon mapping with valid ionicons names
const iconMap = {
  Activity: 'pulse',
  AlertTriangle: 'warning',
  ArrowLeft: 'arrow-back',
  Ban: 'ban',
  BarChart: 'bar-chart',
  CheckCircle: 'checkmark-circle',
  Clock: 'time',
  Cpu: 'hardware-chip',
  Database: 'server',
  Download: 'download',
  Edit: 'create',
  HardDrive: 'save',
  Lock: 'lock-closed',
  Mail: 'mail',
  Memory: 'cellular',
  RefreshCw: 'refresh',
  Search: 'search',
  Settings: 'settings',
  Shield: 'shield',
  Tag: 'pricetag',
  TrendingUp: 'trending-up',
  Unlock: 'lock-open',
  UserCheck: 'person-add',
  Users: 'people',
  UserX: 'person-remove',
  XCircle: 'close-circle'
};

const AdminToolsDashboard = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [businessMetrics, setBusinessMetrics] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [systemMetricsDetailed, setSystemMetricsDetailed] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [error, setError] = useState(null);
  const [wsError, setWsError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [ws, setWs] = useState(null); // Added for WebSocket connection

  // NEW: Token retrieval helper
  const getToken = () => {
    // Check multiple possible storage keys
    const token = localStorage.getItem('userToken') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('adminToken') ||
                  sessionStorage.getItem('userToken') ||
                  sessionStorage.getItem('token');
    
    // Also check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    return token || tokenFromUrl;
  };

  const buildDashboardWsUrl = (token) => {
    try {
      const api = new URL(API_URL);
      const wsProtocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${api.host}/ws/dashboard?token=${encodeURIComponent(token)}`;
    } catch {
      return `ws://localhost:8081/ws/dashboard?token=${encodeURIComponent(token)}`;
    }
  };

  // NEW: Login check function
  const checkLoginStatus = async () => {
    try {
      const token = getToken();
      
      if (!token) {
        setIsLoggedIn(false);
        return false;
      }

      // Validate token with backend
      const validationResponse = await fetch(`${API_URL}/api/auth/validate-token`, {
        credentials: 'include',
headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (validationResponse.ok) {
        const result = await validationResponse.json();
        if (result.success) {
          setIsLoggedIn(true);
          return true;
        }
      }
      
      // Token invalid, clear storage
      localStorage.removeItem('userToken');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminToken');
      sessionStorage.clear();
      
      setIsLoggedIn(false);
      return false;
    } catch (error) {
      console.error('Login check error:', error);
      setIsLoggedIn(false);
      return false;
    }
  };

  // NEW: Demo login function
  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/admin/demo-login`, {
        method: 'POST',
        credentials: 'include',
headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@tickethub.co.za',
          password: 'admin123'
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
      
      // Store the token
      localStorage.setItem('userToken', result.token);
      localStorage.setItem('token', result.token);
      
      setIsLoggedIn(true);
      
      // Fetch dashboard data
      await fetchDashboardData();
      fetchBusinessMetrics();
      fetchSystemMetrics();
      fetchDetailedSystemMetrics();
      
      setError(null);
    } catch (error) {
      console.error('Demo login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Fetch dashboard data with better error handling
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      
      if (!token) {
        setIsLoggedIn(false);
        throw new Error('No authentication token found. Please login.');
      }

      const response = await fetch(`${API_URL}/api/metrics/dashboard-metrics`, {
        method: 'GET',
        credentials: 'include',
headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('userToken');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        sessionStorage.clear();
        setIsLoggedIn(false);
        throw new Error('Session expired. Please login again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }

      if (!response.ok) {
        throw new Error(`API Error: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch metrics');
      }
      
      const metricsData = result.data;
      
      const alerts = metricsData.alerts?.map((alert, index) => ({
        id: alert.id || index + 1,
        type: alert.type || 'system',
        title: alert.title || 'System Alert',
        message: alert.message || 'System notification',
        severity: alert.severity || 'medium',
        time: alert.time || 'Just now',
        count: 1,
        icon: getAlertIcon(alert.type || 'system'),
        color: getAlertColor(alert.severity || 'medium'),
        details: alert.message || 'System alert details',
        affectedItems: alert.details || [],
        recommendations: alert.recommendations || []
      })) || [];
      
      const securityLogs = metricsData.security?.securityLogs?.map((log, index) => ({
        id: log.id || index + 1,
        type: log.type || 'Security Event',
        user: log.user || 'Unknown',
        ip: log.ip || 'N/A',
        time: log.time || 'Just now',
        severity: log.severity || 'info',
        details: log.details || 'Security event'
      })) || [];
      
      const blockedIPsList = metricsData.security?.blockedIPsList?.map((ip, index) => ({
        ip: ip.ip || `192.168.1.${index + 100}`,
        reason: ip.reason || 'Suspicious activity',
        blocked: ip.blocked || 'Recently',
        attempts: ip.attempts || 1
      })) || [];
      
      const recentActivity = metricsData.recentActivity?.map((activity, index) => ({
        type: activity.type || 'activity',
        user: activity.user || 'System',
        time: activity.time || 'Just now',
        status: getActivityStatus(activity.type),
        details: activity.details || 'System activity'
      })) || [];
      
      const logs = metricsData.logs?.map((log, index) => ({
        id: log.id || index + 1,
        timestamp: log.timestamp || new Date().toISOString(),
        level: log.level || 'INFO',
        module: log.module || 'System',
        message: log.message || 'System log entry',
        user: log.user || 'system'
      })) || [];
      
      const pendingEvents = metricsData.platform?.pendingEvents?.map((event, index) => ({
        id: event.id || index + 1,
        name: event.name || 'Pending Event',
        organizer: event.organizer || 'Unknown',
        submitted: event.submitted || 'Recently',
        category: event.category || 'General',
        status: event.status || 'pending'
      })) || [];
      
      const backupHistory = metricsData.database?.backupHistory?.map((backup, index) => ({
        date: backup.date || new Date().toISOString(),
        size: backup.size || '0 MB',
        duration: backup.duration || '0 sec',
        status: backup.status || 'pending',
        type: backup.type || 'automatic'
      })) || [];
      
      const transformedData = {
        systemHealth: {
          status: metricsData.systemHealth?.status || 'healthy',
          uptime: metricsData.systemHealth?.uptime || '0 days',
          lastIncident: metricsData.systemHealth?.lastIncident || 'No incidents',
          responseTime: metricsData.systemHealth?.responseTime || '0 ms'
        },
        users: {
          total: metricsData.users?.total || 0,
          active: metricsData.users?.active || 0,
          inactive: metricsData.users?.inactive || 0,
          newThisWeek: metricsData.users?.newThisWeek || 0,
          suspended: metricsData.users?.suspended || 0,
          admins: metricsData.users?.admins || 0,
          eventManagers: metricsData.users?.eventManagers || 0,
          customers: metricsData.users?.customers || 0,
          growthRate: metricsData.users?.growthRate || 0,
          userList: metricsData.users?.userList?.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status || 'active',
            joined: user.joined,
            lastActive: user.lastActive,
            phone: user.phone,
            avatar: user.avatar,
            country: user.country
          })) || []
        },
        security: {
          failedLogins: metricsData.security?.failedLogins || 0,
          suspiciousActivity: metricsData.security?.suspiciousActivity || 0,
          blockedIPs: metricsData.security?.blockedIPs || 0,
          twoFactorEnabled: metricsData.security?.twoFactorEnabled || 0,
          passwordResets: metricsData.security?.passwordResets || 0,
          securityLogs,
          blockedIPsList
        },
        platform: {
          totalEvents: metricsData.platform?.totalEvents || 0,
          activeEvents: metricsData.platform?.activeEvents || 0,
          pendingApprovals: metricsData.platform?.pendingApprovals || 0,
          reportedIssues: metricsData.platform?.reportedIssues || 0,
          resolvedIssues: metricsData.platform?.resolvedIssues || 0,
          averageResolutionTime: metricsData.platform?.averageResolutionTime || '0 hours',
          pendingEvents
        },
        database: {
          size: metricsData.database?.size || '0 MB',
          backupStatus: metricsData.database?.backupStatus || 'pending',
          lastBackup: metricsData.database?.lastBackup || 'Never',
          queries: metricsData.database?.queries || 0,
          slowQueries: metricsData.database?.slowQueries || 0,
          backupHistory
        },
        settings: metricsData.settings || {
          platformName: 'Ticket Hub',
          maintenanceMode: false,
          registrationEnabled: true,
          emailNotifications: true,
          twoFactorRequired: false,
          maxUploadSize: '10 MB',
          sessionTimeout: '30 minutes'
        },
        logs,
        recentActivity,
        alerts
      };
      
      setAdminData(transformedData);
      setLastSyncAt(new Date().toISOString());
      setIsLoggedIn(true);
      setError(null);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError(error.message);
      setIsLoggedIn(false);
      
      setAdminData({
        systemHealth: { status: 'unknown', uptime: '0', lastIncident: 'Unknown', responseTime: '0' },
        users: { total: 0, active: 0, inactive: 0, newThisWeek: 0, suspended: 0, admins: 0, eventManagers: 0, customers: 0, growthRate: 0, userList: [] },
        security: { failedLogins: 0, suspiciousActivity: 0, blockedIPs: 0, twoFactorEnabled: 0, passwordResets: 0, securityLogs: [], blockedIPsList: [] },
        platform: { totalEvents: 0, activeEvents: 0, pendingApprovals: 0, reportedIssues: 0, resolvedIssues: 0, averageResolutionTime: '0', pendingEvents: [] },
        database: { size: '0', backupStatus: 'unknown', lastBackup: 'Never', queries: 0, slowQueries: 0, backupHistory: [] },
        logs: [],
        recentActivity: [],
        alerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessMetrics = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/database/statistics`, {
        credentials: 'include',
headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBusinessMetrics(result);
        }
      }
    } catch (error) {
      console.error('Error fetching business metrics:', error);
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/metrics/database-comprehensive`, {
        credentials: 'include',
headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSystemMetrics(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  };

  // Fetch detailed system metrics
  const fetchDetailedSystemMetrics = async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Try to get metrics from the dashboard endpoint instead
      const response = await fetch(`${API_URL}/api/metrics/dashboard-metrics`, {
        credentials: 'include',
headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Extract metrics from the dashboard data
          const metricsData = result.data;
          const detailedMetrics = {};
          
          // Map dashboard metrics to system metrics format
          if (metricsData.systemHealth) {
            detailedMetrics['system_uptime_days'] = parseFloat(metricsData.systemHealth.uptime) || 0;
            detailedMetrics['avg_response_time'] = parseFloat(metricsData.systemHealth.responseTime) || 0;
          }
          
          if (metricsData.database) {
            detailedMetrics['database_size_mb'] = parseFloat(metricsData.database.size) || 0;
          }
          
          if (metricsData.security) {
            detailedMetrics['failed_login_attempts_24h'] = metricsData.security.failedLogins || 0;
            detailedMetrics['active_blocked_ips'] = metricsData.security.blockedIPs || 0;
          }
          
          if (metricsData.platform) {
            detailedMetrics['total_events'] = metricsData.platform.totalEvents || 0;
            detailedMetrics['active_events'] = metricsData.platform.activeEvents || 0;
            detailedMetrics['pending_events'] = metricsData.platform.pendingApprovals || 0;
          }
          
          if (metricsData.users) {
            detailedMetrics['active_users'] = metricsData.users.active || 0;
            detailedMetrics['new_users_today'] = metricsData.users.newThisWeek || 0;
          }

          const dashboardMetrics = result.metrics || {};
          detailedMetrics['cpu_usage_percent'] = parseFloat(dashboardMetrics.cpu_usage_percent) || 0;
          detailedMetrics['memory_usage_percent'] = parseFloat(dashboardMetrics.memory_usage_percent) || 0;
          detailedMetrics['disk_usage_percent'] = parseFloat(dashboardMetrics.disk_usage_percent) || 0;
          detailedMetrics['active_sessions'] = parseFloat(dashboardMetrics.active_sessions) || 0;
          detailedMetrics['api_requests_per_minute'] = parseFloat(dashboardMetrics.api_requests_per_minute) || 0;
          detailedMetrics['database_query_rate'] = parseFloat(dashboardMetrics.database_query_rate) || 0;
          detailedMetrics['db_slow_queries_1h'] = parseFloat(dashboardMetrics.db_slow_queries_1h) || 0;
          detailedMetrics['avg_response_time'] = parseFloat(dashboardMetrics.avg_response_time) || detailedMetrics['avg_response_time'] || 0;
          detailedMetrics['system_uptime_days'] = parseFloat(dashboardMetrics.system_uptime_days) || detailedMetrics['system_uptime_days'] || 0;
          
          setSystemMetricsDetailed(detailedMetrics);
        }
      } else {
        setSystemMetricsDetailed({});
      }
    } catch (error) {
      console.error('Error fetching detailed system metrics:', error);
      setSystemMetricsDetailed({});
    }
  };

  // UPDATED: useEffect with WebSocket integration and login check
  useEffect(() => {
    let socket = null; // Local variable for socket

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        
        // First check login status
        const loggedIn = await checkLoginStatus();
        
        if (loggedIn) {
          // Fetch initial data if logged in
          await fetchDashboardData();
          fetchBusinessMetrics();
          fetchSystemMetrics();
          fetchDetailedSystemMetrics();

          // Establish WebSocket connection
          const token = getToken();
          if (token) {
            const websocketUrl = buildDashboardWsUrl(token);
            socket = new WebSocket(websocketUrl);
            setWs(socket); // Store socket instance
            setWsError(null);

            socket.onopen = () => {
              console.log('WebSocket connection established');
              setWsError(null);
              // Optional: send subscription message if backend requires it
              // socket.send(JSON.stringify({ type: 'SUBSCRIBE', topic: 'dashboard_updates' }));
            };

            socket.onmessage = (event) => {
              console.log('WebSocket message received:', event.data);
              try {
                const messageData = JSON.parse(event.data);
                // This part needs to match the exact structure your backend sends.
                // Example: Assuming backend sends an object with all data types.
                if (messageData.type === 'dashboard_update' && messageData.payload) {
                  // Merge new data into existing adminData state
                  setAdminData(prevAdminData => ({
                    ...prevAdminData,
                    ...messageData.payload.adminData,
                    // Ensure nested arrays like alerts, securityLogs etc. are updated correctly if needed
                    // For simplicity, we might overwrite or merge based on message structure
                    alerts: messageData.payload.adminData?.alerts || prevAdminData?.alerts,
                    security: messageData.payload.adminData?.security || prevAdminData?.security,
                    logs: messageData.payload.adminData?.logs || prevAdminData?.logs,
                    recentActivity: messageData.payload.adminData?.recentActivity || prevAdminData?.recentActivity,
                  }));
                  setBusinessMetrics(messageData.payload.businessMetrics);
                  setSystemMetrics(messageData.payload.systemMetrics);
                  setSystemMetricsDetailed(messageData.payload.systemMetricsDetailed);
                  setLastSyncAt(new Date().toISOString());
                } else if (messageData.type === 'alert_update' && messageData.payload?.alerts) {
                  setAdminData(prev => ({ ...prev, alerts: messageData.payload.alerts }));
                }
                // Add other message types as needed (e.g., 'user_update', 'event_update')
              } catch (error) {
                console.error('Error processing WebSocket message:', error);
              }
            };

            socket.onerror = (error) => {
              console.error('WebSocket error:', error);
              // Add more detailed logging if available in the error event itself
              if (error instanceof ErrorEvent) {
                console.error('Error message:', error.message);
                console.error('Error type:', error.type);
                console.error('Error path:', error.filename);
              }
              setWsError('Live updates disconnected. Data refresh is still available.');
            };

            socket.onclose = () => {
              console.log('WebSocket connection closed');
              // Attempt to reconnect after a delay if still logged in
              setTimeout(() => {
                if (isLoggedIn) {
                  console.log('Attempting to reconnect WebSocket...');
                  initializeDashboard(); // Re-run initialization to attempt reconnection
                }
              }, 5000); // Reconnect after 5 seconds
            };
          } else {
             // Token not found, so cannot establish WS connection
             setIsLoggedIn(false);
             setError('Authentication token missing. Please log in.');
          }
        } else {
          // Not logged in, stop loading
          setLoading(false);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setError(error.message); // Set error message from fetchDashboardData, etc.
        setLoading(false);
      } finally {
         // Ensure loading is false even if there's an error in fetching initial data
         if (!isLoggedIn) setLoading(false);
      }
    };

    initializeDashboard();

    // Cleanup function to close the WebSocket connection
    return () => {
      if (socket) { // Use the local socket variable here for cleanup
        console.log('Closing WebSocket connection from cleanup');
        socket.close();
      }
    };
  }, [isLoggedIn]); // Dependency array changed to only depend on isLoggedIn

  // Helper functions
  const getAlertIcon = (type) => {
    switch(type) {
      case 'security': return 'AlertTriangle';
      case 'system': return 'Database';
      case 'platform': return 'Activity';
      case 'performance': return 'Cpu';
      case 'database': return 'HardDrive';
      default: return 'AlertTriangle';
    }
  };

  const getAlertColor = (severity) => {
    switch(severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getActivityStatus = (type) => {
    switch(type) {
      case 'user_login':
      case 'user_registered':
      case 'event_approved': return 'success';
      case 'failed_login': return 'warning';
      case 'user_suspended': return 'error';
      default: return 'info';
    }
  };

  // Get system metric value with fallback
  const getSystemMetricValue = (key) => {
    if (!systemMetricsDetailed) {
      // Return default values if no metrics
      const defaults = {
        'cpu_usage_percent': '25',
        'memory_usage_percent': '45',
        'disk_usage_percent': '52',
        'database_size_mb': adminData?.database?.size || '0',
        'avg_response_time': adminData?.systemHealth?.responseTime || '125',
        'active_sessions': '15',
        'api_requests_per_minute': '45',
        'database_query_rate': '12'
      };
      return defaults[key] || '0';
    }
    
    // If it's an object with metric_value property
    if (systemMetricsDetailed[key] && typeof systemMetricsDetailed[key] === 'object') {
      return systemMetricsDetailed[key].metric_value || '0';
    }
    
    // If it's a direct value
    if (typeof systemMetricsDetailed[key] === 'string' || typeof systemMetricsDetailed[key] === 'number') {
      return systemMetricsDetailed[key].toString();
    }
    
    return '0';
  };

  // Get metric unit
  const getMetricUnit = (key) => {
    const unitMap = {
      'cpu_usage_percent': '%',
      'memory_usage_percent': '%',
      'disk_usage_percent': '%',
      'database_size_mb': 'MB',
      'avg_response_time': 'ms',
      'active_sessions': '',
      'api_requests_per_minute': '/min',
      'database_query_rate': '/sec'
    };
    
    return unitMap[key] || '';
  };

  // Get metric display name
  const getMetricDisplayName = (key) => {
    const nameMap = {
      'cpu_usage_percent': 'CPU Usage',
      'memory_usage_percent': 'Memory Usage',
      'disk_usage_percent': 'Disk Usage',
      'database_size_mb': 'Database Size',
      'avg_response_time': 'Response Time',
      'active_sessions': 'Active Sessions',
      'api_requests_per_minute': 'API Requests',
      'database_query_rate': 'DB Queries'
    };
    
    return nameMap[key] || key;
  };

  // Get metric icon
  const getMetricIcon = (key) => {
    const iconMap = {
      'cpu_usage_percent': 'Cpu',
      'memory_usage_percent': 'Memory',
      'disk_usage_percent': 'HardDrive',
      'database_size_mb': 'Database',
      'avg_response_time': 'Activity',
      'active_sessions': 'Users',
      'api_requests_per_minute': 'TrendingUp',
      'database_query_rate': 'Database'
    };
    
    return iconMap[key] || 'Activity';
  };

  // Get metric color based on value
  const getMetricColor = (key, value) => {
    const numValue = parseFloat(value) || 0;
    
    switch(key) {
      case 'cpu_usage_percent':
      case 'memory_usage_percent':
      case 'disk_usage_percent':
        if (numValue > 80) return '#ef4444';
        if (numValue > 60) return '#f59e0b';
        return '#10b981';
        
      case 'avg_response_time':
        if (numValue > 1000) return '#ef4444';
        if (numValue > 500) return '#f59e0b';
        return '#10b981';
        
      default:
        return '#6366f1';
    }
  };

  // Icon component wrapper
  const Icon = ({ name, size = 20, color = '#000', style, className = '' }) => {
    const iconName = iconMap[name] || name;
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        <Ionicons name={iconName} size={size} color={color} />
      </span>
    );
  };

  // Modal Component
  const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
          style={{ boxShadow: '0 32px 90px -30px rgba(15, 23, 42, 0.45)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-violet-500" />
          <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200 bg-slate-50/80">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Admin insight</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
            >
              <Icon name="XCircle" size={24} color="#6b7280" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-7">
            {children}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // NEW: Login Component
  const LoginPrompt = () => {
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);

    const handleLogin = () => {
      // Store the current URL to return after login
      const returnUrl = window.location.pathname + window.location.search;
      localStorage.setItem('returnUrl', returnUrl);
      
      // Redirect to login page (adjust URL as needed)
      window.location.href = '/login';
    };

    const handleDemoLoginClick = async () => {
      setLoginLoading(true);
      setLoginError(null);
      
      try {
        await handleDemoLogin();
      } catch (error) {
        setLoginError(error.message);
      } finally {
        setLoginLoading(false);
      }
    };

    return (
      <div className="h-screen-dynamic bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Icon name="Shield" size={40} color="#4f46e5" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Admin Access Required</h2>
          <p className="text-gray-600 mb-8 text-center">Please login to access the Admin Dashboard</p>
          
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              disabled={loginLoading}
            >
              <Icon name="Lock" size={18} color="#fff" />
              Go to Login Page
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-medium">Quick Access</span>
              </div>
            </div>
            
            <button
              onClick={handleDemoLoginClick}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <>
                  <div className="animate-spin">
                    <Icon name="RefreshCw" size={18} color="#fff" />
                  </div>
                  Logging in...
                </>
              ) : (
                <>
                  <Icon name="UserCheck" size={18} color="#fff" />
                  Login as Demo Admin
                </>
              )}
            </button>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-medium text-gray-800 mb-2 text-sm">Demo Credentials:</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-mono text-gray-800">admin@tickethub.co.za</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-mono text-gray-800">admin123</span>
                </div>
              </div>
            </div>
            
            {loginError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
                <p className="text-red-600 text-sm flex items-center gap-2">
                  <Icon name="AlertTriangle" size={14} color="#dc2626" />
                  {loginError}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3 font-medium">Troubleshooting:</p>
            <ul className="text-xs text-gray-500 space-y-2">
              <li className="flex items-start gap-2">
                <Icon name="Database" size={12} color="#6b7280" className="mt-0.5" />
                <span>Ensure backend is running at <code className="bg-gray-100 px-1 rounded">{API_URL}</code></span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Settings" size={12} color="#6b7280" className="mt-0.5" />
                <span>Check browser console (F12) for detailed errors</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="RefreshCw" size={12} color="#6b7280" className="mt-0.5" />
                <span>Clear browser cache if issues persist</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // System Metrics Card Component
  const SystemMetricsCard = ({ metric }) => {
    const metricValue = getSystemMetricValue(metric.key);
    const metricUnit = getMetricUnit(metric.key);
    const displayName = getMetricDisplayName(metric.key);
    const icon = getMetricIcon(metric.key);
    const color = getMetricColor(metric.key, metricValue);
    
    const openSystemMetricsModal = () => {
      setModalTitle('System Metrics Dashboard');
      setModalContent(
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
              <Icon name={icon} size={24} color={color} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">System Performance Metrics</h3>
              <p className="text-sm text-gray-500">Real-time system monitoring and performance data</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              'cpu_usage_percent',
              'memory_usage_percent',
              'disk_usage_percent',
              'database_size_mb',
              'avg_response_time',
              'active_sessions',
              'api_requests_per_minute',
              'database_query_rate'
            ].map((metricKey) => {
              const value = getSystemMetricValue(metricKey);
              const unit = getMetricUnit(metricKey);
              const name = getMetricDisplayName(metricKey);
              const iconName = getMetricIcon(metricKey);
              const metricColor = getMetricColor(metricKey, value);
              
              return (
                <div key={metricKey} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon name={iconName} size={16} color={metricColor} />
                      <span className="text-sm font-medium text-gray-700">{name}</span>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {value} {unit}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Health */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">System Health</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">System Uptime</span>
                  <span className="text-sm font-medium text-gray-900">{adminData?.systemHealth?.uptime || '0 days'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Last Incident</span>
                  <span className="text-sm font-medium text-gray-900">{adminData?.systemHealth?.lastIncident || 'No incidents'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium text-gray-900">{adminData?.systemHealth?.responseTime || '0 ms'}</span>
                </div>
              </div>
            </div>
            
            {/* Database Status */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Database Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Backup Status</span>
                  <span className={`text-sm font-medium ${
                    adminData?.database?.backupStatus === 'success' ? 'text-green-600' :
                    adminData?.database?.backupStatus === 'failed' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {adminData?.database?.backupStatus || 'unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-sm font-medium text-gray-900">{adminData?.database?.lastBackup || 'Never'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Database Size</span>
                  <span className="text-sm font-medium text-gray-900">{adminData?.database?.size || '0 MB'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setCurrentView('database');
                  setModalOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Icon name="Database" size={16} color="#6366f1" />
                  <span>Database Management</span>
                </div>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('logs');
                  setModalOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Icon name="Activity" size={16} color="#0ea5e9" />
                  <span>View System Logs</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
      setModalOpen(true);
    };

    return (
      <div 
        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
        onClick={openSystemMetricsModal}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: `${color}20` }}>
            <Icon name={icon} size={20} color={color} />
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{displayName}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{metricValue} {metricUnit}</div>
        <div className="text-sm text-gray-600 mb-2 line-clamp-2">System performance metric</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              color === '#10b981' ? 'bg-green-500' :
              color === '#f59e0b' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500">
              {color === '#10b981' ? 'Healthy' :
               color === '#f59e0b' ? 'Warning' :
               'Critical'}
            </span>
          </div>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
    );
  };

  // Alert Card Component
  const AlertCard = ({ alert }) => {
    const statusConfig = {
      high: { label: 'Critical', color: 'red' },
      medium: { label: 'Warning', color: 'yellow' },
      low: { label: 'Info', color: 'green' }
    };

    const config = statusConfig[alert.severity];

    const openAlertModal = () => {
      setModalTitle(alert.title);
      setModalContent(
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${alert.color}20` }}>
              <Icon name={alert.icon} size={24} color={alert.color} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
              <p className="text-sm text-gray-500">Last updated: {alert.time}</p>
            </div>
          </div>
          
          {/* Alert Message */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">{alert.details}</p>
          </div>

          {/* Affected Items */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Affected Items</h4>
            <div className="flex flex-wrap gap-2">
              {alert.affectedItems?.map((item, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                {alert.type === 'security' && (
                  <>
                    <button 
                      onClick={() => {
                        setCurrentView('security');
                        setModalOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="Shield" size={16} color="#ef4444" />
                        <span>View Security Logs</span>
                      </div>
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const token = getToken();
                          const response = await fetch(`${API_URL}/api/metrics/blocked-ips`, {
        credentials: 'include',
headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          if (response.ok) {
                            const data = await response.json();
                            if (data.success) {
                              alert(`Found ${data.data.length} blocked IPs`);
                            }
                          }
                          setModalOpen(false);
                        } catch (err) {
                          console.error('Error fetching blocked IPs:', err);
                        }
                      }}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="Ban" size={16} color="#ef4444" />
                        <span>View Blocked IPs</span>
                      </div>
                    </button>
                  </>
                )}
                {alert.type === 'system' && (
                  <>
                    <button 
                      onClick={() => {
                        setCurrentView('database');
                        setModalOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="Database" size={16} color="#10b981" />
                        <span>View Database Metrics</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Alert Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Alert Details</h4>
              <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Severity:</span>
                  <span className={`font-medium ${
                    alert.severity === 'high' ? 'text-red-600' :
                    alert.severity === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">{alert.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">{alert.time}</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {alert.recommendations?.map((rec, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              onClick={() => {
                setModalOpen(false);
                fetchDashboardData();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      );
      setModalOpen(true);
    };

    return (
      <div 
        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
        onClick={openAlertModal}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: `${alert.color}20` }}>
            <Icon name={alert.icon} size={20} color={alert.color} />
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{alert.title}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{alert.count}</div>
        <div className="text-sm text-gray-600 mb-2 line-clamp-2">{alert.message}</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              alert.severity === 'high' ? 'bg-red-500' :
              alert.severity === 'medium' ? 'bg-yellow-500' :
              'bg-green-500'
            }`} />
            <span className="text-xs text-gray-500">{config.label}</span>
          </div>
          <span className="text-xs text-gray-400">{alert.time}</span>
        </div>
      </div>
    );
  };

  // Dashboard View Components
  const SystemHealthCard = ({ title, value, status, icon, color, onClick }) => (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: `${color}20` }}>
          <Icon name={icon} size={20} color={color} />
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-500">{status === 'healthy' ? 'Operational' : status === 'warning' ? 'Degraded' : 'Issues'}</span>
      </div>
    </div>
  );

  const MetricCard = ({ title, value, icon, color, trend, onClick }) => (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
            <Icon name={icon} size={20} color={color} />
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );

  const openAdminInsightModal = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  const InsightBarChart = ({ title, subtitle, items, maxValue }) => {
    const safeMax = maxValue || Math.max(...items.map((item) => Number(item.value) || 0), 1);

    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            {items.length} metrics
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const rawValue = Number(item.value) || 0;
            const width = safeMax > 0 ? Math.max(rawValue > 0 ? 10 : 0, Math.min(100, (rawValue / safeMax) * 100)) : 0;

            return (
              <div key={`${title}-${item.label}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <span className="text-sm font-semibold text-slate-900">{item.display ?? formatCompact(rawValue)}</span>
                </div>
                {item.note && <p className="mt-1 text-xs text-slate-500">{item.note}</p>}
                <div className="mt-3 h-2.5 rounded-full bg-white">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: item.color || '#0f172a',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const openExecutiveOverview = () => {
    openAdminInsightModal(
      'Executive Operations Brief',
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Revenue today</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrencyRand(revenueToday)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatCompact(ticketsSoldToday)} tickets issued</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Pending approvals</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(pendingApprovals)}</p>
                <p className="mt-1 text-xs text-slate-500">Organizer submissions awaiting action</p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Active users</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(adminData?.users?.active || 0)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatCompact(activeSessionsCount)} live sessions</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Runtime latency</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(responseTimeMs)} ms</p>
                <p className="mt-1 text-xs text-slate-500">{criticalAlerts} critical alerts open</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <InsightBarChart
                title="Risk and trust signals"
                subtitle="Security load currently affecting the production platform."
                items={securityBars}
              />
              <InsightBarChart
                title="Pipeline and fulfillment"
                subtitle="Event moderation and issue flow across the business."
                items={pipelineBars}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Decision support</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{executiveStatusLabel}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {executiveStatusMessage} This board is scoped to the {focusWindowLabel} and consolidates commercial, security,
              operational, and runtime control signals.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live posture</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{liveConnectionLabel}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Last sync {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Pending synchronization'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commercial focus</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatCompact(conversionRate)}% conversion rate</p>
                <p className="mt-1 text-xs text-slate-500">
                  Avg ticket {formatCurrencyRand(avgTicketPrice)} with {formatCompact(newUsersToday)} new users today
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Infrastructure resilience</p>
                <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{adminData?.database?.backupStatus || 'unknown'}</p>
                <p className="mt-1 text-xs text-slate-500">System uptime {adminData?.systemHealth?.uptime || '0 days'}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentView('metrics');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Icon name="BarChart" size={15} color="#fff" />
                Open commercial analytics
              </button>
              <button
                onClick={() => {
                  setCurrentView('security');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="Shield" size={15} color="#334155" />
                Review trust controls
              </button>
              <button
                onClick={handleRefreshAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="RefreshCw" size={15} color="#334155" />
                Refresh executive data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openRevenueInsight = () => {
    openAdminInsightModal(
      'Revenue Command Center',
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Revenue today</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrencyRand(revenueToday)}</p>
                <p className="mt-1 text-xs text-slate-500">Gross ticket sales captured today</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Tickets sold</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(ticketsSoldToday)}</p>
                <p className="mt-1 text-xs text-slate-500">Total completed ticket transactions today</p>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Avg ticket price</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrencyRand(avgTicketPrice)}</p>
                <p className="mt-1 text-xs text-slate-500">Average yield per successful checkout</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Conversion</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(conversionRate)}%</p>
                <p className="mt-1 text-xs text-slate-500">Checkout completion efficiency</p>
              </div>
            </div>

            <InsightBarChart
              title="Commercial demand indicators"
              subtitle="Real-time demand, acquisition, and publishing volume across the ticketing estate."
              items={revenueBars}
            />
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Commercial brief</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Revenue execution summary</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Commercial performance is being driven by {formatCompact(activeEventsCount)} active events and
              {` ${formatCompact(newUsersToday)} new users`} entering the funnel today.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Portfolio revenue</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyRand(totalRevenue)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatCompact(totalTickets)} lifetime tickets sold</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Growth pulse</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatCompact(userGrowthRate)}% user growth</p>
                <p className="mt-1 text-xs text-slate-500">{formatCompact(cacheHitRate)}% cache hit rate supporting traffic</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Publishing cadence</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatCompact(eventsCreatedToday)} events created today</p>
                <p className="mt-1 text-xs text-slate-500">{formatCompact(pendingApprovals)} submissions still waiting for moderation</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentView('metrics');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Icon name="TrendingUp" size={15} color="#fff" />
                Open revenue analytics
              </button>
              <button
                onClick={fetchBusinessMetrics}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="RefreshCw" size={15} color="#334155" />
                Refresh commercial data
              </button>
              <button
                onClick={() => {
                  setCurrentView('approvals');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="CheckCircle" size={15} color="#334155" />
                Review approvals
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openOperationsFeedInsight = () => {
    openAdminInsightModal(
      'Operations Feed',
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Alerts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(alertsCount)}</p>
                <p className="mt-1 text-xs text-slate-500">Current alerts across business and platform control surfaces</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Activity events</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(recentActivityCount)}</p>
                <p className="mt-1 text-xs text-slate-500">Recent user, moderation, and system actions</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Reported issues</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(reportedIssues)}</p>
                <p className="mt-1 text-xs text-slate-500">Issues currently impacting organizers or customers</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Resolved issues</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(resolvedIssues)}</p>
                <p className="mt-1 text-xs text-slate-500">Issues cleared by the operations team</p>
              </div>
            </div>

            <InsightBarChart
              title="Operational movement"
              subtitle="Current mix of alerts, activity volume, and issue traffic."
              items={operationsFeedBars}
            />
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Latest activity</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Live support and operations feed</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Review the freshest operational events before escalating into logs, security, or event moderation.
            </p>

            <div className="mt-5 space-y-3">
              {(adminData?.recentActivity || []).slice(0, 6).map((activity, index) => (
                <div key={`${activity.type}-${activity.time}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{activity.user || 'System'}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">{activity.type?.replace(/_/g, ' ') || 'Activity'}</p>
                    </div>
                    <span className="text-xs text-slate-500">{activity.time || 'Just now'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{activity.details || 'Operational activity recorded.'}</p>
                </div>
              ))}
              {(!adminData?.recentActivity || adminData.recentActivity.length === 0) && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">
                  No recent operational activity available.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentView('logs');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                <Icon name="Activity" size={15} color="#fff" />
                Open operations feed
              </button>
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="RefreshCw" size={15} color="#334155" />
                Refresh activity
              </button>
              <button
                onClick={() => {
                  setCurrentView('security');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="Shield" size={15} color="#334155" />
                Review trust events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openSystemRuntimeInsight = () => {
    openAdminInsightModal(
      'Runtime Control Board',
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">CPU</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(cpuUsage)}%</p>
            <p className="mt-1 text-xs text-slate-500">Current application compute saturation</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Memory</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(memoryUsage)}%</p>
            <p className="mt-1 text-xs text-slate-500">Runtime memory currently in use</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Disk</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(diskUsage)}%</p>
            <p className="mt-1 text-xs text-slate-500">Persistent storage consumption on the live stack</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Response time</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(responseTimeMs)} ms</p>
            <p className="mt-1 text-xs text-slate-500">Average API response over the active window</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <InsightBarChart
            title="Capacity utilization"
            subtitle="Compute, memory, and storage pressure against available platform capacity."
            items={runtimeUtilizationBars}
            maxValue={100}
          />
          <InsightBarChart
            title="Throughput and concurrency"
            subtitle="Current session volume and API pressure moving through production."
            items={runtimeThroughputBars}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">System health summary</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">System status</span>
                <span className="text-sm font-semibold text-slate-900">{adminData?.systemHealth?.status || 'unknown'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Uptime</span>
                <span className="text-sm font-semibold text-slate-900">{adminData?.systemHealth?.uptime || '0 days'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Last incident</span>
                <span className="text-sm font-semibold text-slate-900">{adminData?.systemHealth?.lastIncident || 'No incidents'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Live updates</span>
                <span className="text-sm font-semibold text-slate-900">{liveConnectionLabel}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Execution actions</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Respond to runtime pressure</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Use this control board to move from telemetry into action without leaving the executive dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentView('system-metrics');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Icon name="Cpu" size={15} color="#fff" />
                Open runtime workspace
              </button>
              <button
                onClick={() => {
                  setCurrentView('logs');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="Activity" size={15} color="#334155" />
                Inspect log stream
              </button>
              <button
                onClick={() => {
                  fetchDetailedSystemMetrics();
                  fetchSystemMetrics();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="RefreshCw" size={15} color="#334155" />
                Refresh runtime telemetry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openDatabaseInsight = () => {
    openAdminInsightModal(
      'Database Intelligence',
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Storage</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{adminData?.database?.size || '0 MB'}</p>
                <p className="mt-1 text-xs text-slate-500">Current primary database footprint</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Tables</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(totalTablesCount)}</p>
                <p className="mt-1 text-xs text-slate-500">Schema objects tracked in the live data store</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Rows</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(totalRowsCount)}</p>
                <p className="mt-1 text-xs text-slate-500">Estimated active records across ticketing tables</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Backup status</p>
                <p className="mt-2 text-2xl font-bold capitalize text-slate-900">{adminData?.database?.backupStatus || 'unknown'}</p>
                <p className="mt-1 text-xs text-slate-500">Last backup {adminData?.database?.lastBackup || 'Never'}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <InsightBarChart
                title="Data estate profile"
                subtitle="Live schema scale and resilience coverage."
                items={databaseEstateBars}
              />
              <InsightBarChart
                title="Query pressure"
                subtitle="Runtime database throughput, slow queries, and related pressure signals."
                items={databaseFlowBars}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Backup execution</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Recovery readiness</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Review backup recency, storage growth, and schema expansion before maintenance or peak-demand windows.
                </p>
              </div>
              <button
                onClick={() => {
                  fetchDashboardData();
                  fetchSystemMetrics();
                  fetchBusinessMetrics();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="RefreshCw" size={14} color="#334155" />
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {(adminData?.database?.backupHistory || []).slice(0, 4).map((backup, index) => (
                <div key={`${backup.date}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold capitalize text-slate-900">{backup.type || 'automatic'} backup</p>
                      <p className="mt-1 text-xs text-slate-500">{backup.date || 'Unknown time'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>Size: {backup.size || '0 MB'}</span>
                      <span>Duration: {backup.duration || '0 sec'}</span>
                      <span className={`rounded-full px-2 py-1 font-semibold ${
                        backup.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : backup.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {backup.status || 'pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!adminData?.database?.backupHistory || adminData.database.backupHistory.length === 0) && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">
                  No backup history available yet.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentView('database');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                <Icon name="Database" size={15} color="#fff" />
                Open database workspace
              </button>
              <button
                onClick={() => {
                  setCurrentView('logs');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="Activity" size={15} color="#334155" />
                Inspect database logs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openSecurityInsight = () => {
    openAdminInsightModal(
      'Security Operations',
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Failed logins</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(adminData?.security?.failedLogins || 0)}</p>
                <p className="mt-1 text-xs text-slate-500">Authentication failures in the active window</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Suspicious activity</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(adminData?.security?.suspiciousActivity || 0)}</p>
                <p className="mt-1 text-xs text-slate-500">Signals requiring investigation or action</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">Blocked IPs</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(adminData?.security?.blockedIPs || 0)}</p>
                <p className="mt-1 text-xs text-slate-500">Active protective blocks defending the platform</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Password resets</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(adminData?.security?.passwordResets || 0)}</p>
                <p className="mt-1 text-xs text-slate-500">Reset activity that may affect customer trust</p>
              </div>
            </div>

            <InsightBarChart
              title="Security event pressure"
              subtitle="Risk indicators generated by identity, access, and abuse controls."
              items={securityBars}
            />
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Blocklist execution</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Active watchlist</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Review current IP restrictions and use the security workspace for full incident investigation.
            </p>

            <div className="mt-5 space-y-3">
              {(adminData?.security?.blockedIPsList || []).slice(0, 5).map((item, index) => (
                <div key={`${item.ip}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.ip}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.reason || 'Suspicious activity'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>Attempts: {item.attempts || 0}</span>
                      <span>Blocked: {item.blocked || 'Recently'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!adminData?.security?.blockedIPsList || adminData.security.blockedIPsList.length === 0) && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">
                  No blocked IPs recorded.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentView('security');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <Icon name="Shield" size={15} color="#fff" />
                Open security center
              </button>
              <button
                onClick={() => {
                  setCurrentView('logs');
                  setModalOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="Activity" size={15} color="#334155" />
                Review security logs
              </button>
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Icon name="RefreshCw" size={15} color="#334155" />
                Refresh incidents
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openUserInsight = () => {
    openAdminInsightModal(
      'User Operations Snapshot',
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Total users</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.users?.total || 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Active</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.users?.active || 0}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Admins</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.users?.admins || 0}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Suspended</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.users?.suspended || 0}</p>
          </div>
        </div>
        <InsightBarChart
          title="Identity and role mix"
          subtitle="Current distribution across administrative, organizer, and customer roles."
          items={userRoleBars}
        />
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Newest user records</h3>
            <p className="text-sm text-gray-500">Quick review of recently active accounts</p>
          </div>
          <div className="divide-y divide-gray-100">
            {(adminData?.users?.userList || []).slice(0, 5).map((user) => (
              <div key={user.id || user.email} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name || 'Unknown user'}</p>
                  <p className="text-xs text-gray-500">{user.email || 'No email'} • {user.role || 'user'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span className="capitalize">Status: {user.status || 'active'}</span>
                  <span>Joined: {user.joined || 'Unknown'}</span>
                  <span>Last active: {user.lastActive || 'Unknown'}</span>
                </div>
              </div>
            ))}
            {(!adminData?.users?.userList || adminData.users.userList.length === 0) && (
              <div className="px-5 py-6 text-sm text-gray-500">No user records available.</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setCurrentView('users');
              setModalOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Icon name="Users" size={16} color="#fff" />
            Open user management
          </button>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Icon name="RefreshCw" size={16} color="#374151" />
            Refresh user metrics
          </button>
          <button
            onClick={() => {
              setCurrentView('logs');
              setModalOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Icon name="Activity" size={16} color="#374151" />
            Review user activity
          </button>
        </div>
      </div>
    );
  };

  const openPipelineInsight = () => {
    openAdminInsightModal(
      'Event Pipeline Control',
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600">Total events</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.platform?.totalEvents || 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Active events</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.platform?.activeEvents || 0}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending approvals</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.platform?.pendingApprovals || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Queue size</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.platform?.pendingEvents?.length || 0}</p>
          </div>
        </div>
        <InsightBarChart
          title="Pipeline load"
          subtitle="Event operations, issue load, and moderation throughput."
          items={pipelineBars}
        />
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending event queue</h3>
            <p className="text-sm text-gray-500">The next submissions waiting for action</p>
          </div>
          <div className="divide-y divide-gray-100">
            {(adminData?.platform?.pendingEvents || []).slice(0, 5).map((event) => (
              <div key={event.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{event.name || 'Pending event'}</p>
                  <p className="text-xs text-gray-500">{event.organizer || 'Unknown organizer'} • {event.category || 'General'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span>Submitted: {event.submitted || 'Recently'}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">{event.status || 'pending'}</span>
                </div>
              </div>
            ))}
            {(!adminData?.platform?.pendingEvents || adminData.platform.pendingEvents.length === 0) && (
              <div className="px-5 py-6 text-sm text-gray-500">No pending events right now.</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setCurrentView('approvals');
              setModalOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700"
          >
            <Icon name="CheckCircle" size={16} color="#fff" />
            Open approvals queue
          </button>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Icon name="RefreshCw" size={16} color="#374151" />
            Refresh pipeline
          </button>
          <button
            onClick={() => {
              setCurrentView('metrics');
              setModalOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Icon name="BarChart" size={16} color="#374151" />
            Open revenue analytics
          </button>
        </div>
      </div>
    );
  };

  const QuickActionCard = ({
    title,
    description,
    icon,
    color,
    onClick,
    secondaryAction,
    secondaryLabel = 'View details',
    primaryLabel = 'Open workspace',
    stats = []
  }) => (
    <div
      className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ boxShadow: '0 18px 40px -26px rgba(15, 23, 42, 0.32)' }}
    >
      <button onClick={secondaryAction || onClick} className="w-full text-left">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/40"
            style={{ background: `linear-gradient(135deg, ${color}26, ${color}12)` }}
          >
            <Icon name={icon} size={24} color={color} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Control module</p>
            <h3 className="mt-1 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
      </button>

      {stats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.slice(0, 3).map((stat) => (
            <span key={`${title}-${stat.label}`} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {stat.label}: <span className="ml-1 font-semibold text-slate-900">{stat.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onClick}
          className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
          style={{ backgroundColor: color }}
        >
          <Icon name={icon} size={14} color="#fff" />
          {primaryLabel}
        </button>
        <button
          onClick={secondaryAction || onClick}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Icon name="BarChart" size={14} color="#374151" />
          {secondaryLabel}
        </button>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const statusColors = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800'
    };

    const typeIcons = {
      user_registered: 'UserCheck',
      event_approved: 'CheckCircle',
      failed_login: 'AlertTriangle',
      password_reset: 'Lock',
      user_suspended: 'UserX',
      user_login: 'UserCheck'
    };

    const iconName = typeIcons[activity.type] || 'Activity';

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusColors[activity.status]}`}>
          <Icon name={iconName} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{activity.user}</p>
          <p className="text-xs text-gray-500 capitalize">{activity.type?.replace(/_/g, ' ') || 'Activity'}</p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
      </div>
    );
  };

  // Business Metrics View
  const BusinessMetricsView = () => {
    const getSystemMetricsValue = (key) => {
      if (!systemMetrics || !systemMetrics.statistics) return '0';
      if (key === 'totalTables') return systemMetrics.statistics.totalTables || '0';
      if (key === 'totalRows') return systemMetrics.statistics.totalRows || '0';
      if (key === 'actualFileSizeMB') return systemMetrics.statistics.actualFileSizeMB || '0 MB';
      return '0';
    };

    const getBusinessMetricsValue = (key) => {
      if (!businessMetrics || !businessMetrics.statistics) return '0';
      const stats = businessMetrics.statistics;
      if (key === 'ticketsSoldToday') return stats.tickets_sold_today || '0';
      if (key === 'revenueToday') return `R ${stats.revenue_today || '0'}`;
      if (key === 'newUsersToday') return stats.new_users_today || '0';
      if (key === 'eventsCreatedToday') return stats.events_created_today || '0';
      if (key === 'totalTickets') return stats.total_tickets || '0';
      if (key === 'totalRevenue') return `R ${stats.total_revenue || '0'}`;
      if (key === 'totalEvents') return stats.total_events || '0';
      if (key === 'activeEvents') return stats.active_events || '0';
      if (key === 'pendingEvents') return stats.pending_events || '0';
      if (key === 'userGrowthRate') return `${stats.user_growth_rate || '0'}%`;
      if (key === 'eventGrowthRate') return `${stats.event_growth_rate || '0'}%`;
      if (key === 'ticketConversionRate') return `${stats.ticket_conversion_rate || '0'}%`;
      if (key === 'avgTicketPrice') return `R ${stats.avg_ticket_price || '0'}`;
      if (key === 'avgSessionDuration') return `${stats.avg_session_duration || '0'} min`;
      if (key === 'cacheHitRate') return `${stats.cache_hit_rate || '0'}%`;
      return '0';
    };

    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Metrics Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">Comprehensive business intelligence and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchBusinessMetrics}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh metrics"
            >
              <Icon name="RefreshCw" size={20} color="#4b5563" />
            </button>
          </div>
        </div>

        {/* Revenue & Sales Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Sales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Revenue Today"
              value={getBusinessMetricsValue('revenueToday')}
              icon="TrendingUp"
              color="#10b981"
              trend={5.2}
            />
            <MetricCard
              title="Tickets Sold Today"
              value={getBusinessMetricsValue('ticketsSoldToday')}
              icon="CheckCircle"
              color="#3b82f6"
              trend={3.1}
            />
            <MetricCard
              title="Total Revenue"
              value={getBusinessMetricsValue('totalRevenue')}
              icon="BarChart"
              color="#8b5cf6"
            />
            <MetricCard
              title="Total Tickets Sold"
              value={getBusinessMetricsValue('totalTickets')}
              icon="Activity"
              color="#f59e0b"
            />
          </div>
        </div>

        {/* User & Growth Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User & Growth Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="New Users Today"
              value={getBusinessMetricsValue('newUsersToday')}
              icon="UserCheck"
              color="#6366f1"
              trend={12.5}
            />
            <MetricCard
              title="User Growth Rate"
              value={getBusinessMetricsValue('userGrowthRate')}
              icon="TrendingUp"
              color="#10b981"
            />
            <MetricCard
              title="Avg Session Duration"
              value={getBusinessMetricsValue('avgSessionDuration')}
              icon="Clock"
              color="#f59e0b"
            />
            <MetricCard
              title="Ticket Conversion Rate"
              value={getBusinessMetricsValue('ticketConversionRate')}
              icon="Activity"
              color="#ec4899"
            />
          </div>
        </div>

        {/* Event & Platform Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event & Platform Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Events Created Today"
              value={getBusinessMetricsValue('eventsCreatedToday')}
              icon="Activity"
              color="#3b82f6"
              trend={2.4}
            />
            <MetricCard
              title="Total Events"
              value={getBusinessMetricsValue('totalEvents')}
              icon="Database"
              color="#8b5cf6"
            />
            <MetricCard
              title="Active Events"
              value={getBusinessMetricsValue('activeEvents')}
              icon="CheckCircle"
              color="#10b981"
            />
            <MetricCard
              title="Pending Events"
              value={getBusinessMetricsValue('pendingEvents')}
              icon="Clock"
              color="#f59e0b"
            />
          </div>
        </div>

        {/* Performance & System Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Cache Hit Rate"
              value={getBusinessMetricsValue('cacheHitRate')}
              icon="Activity"
              color="#10b981"
            />
            <MetricCard
              title="Avg Ticket Price"
              value={getBusinessMetricsValue('avgTicketPrice')}
              icon="TrendingUp"
              color="#ec4899"
            />
            <MetricCard
              title="Event Growth Rate"
              value={getBusinessMetricsValue('eventGrowthRate')}
              icon="TrendingUp"
              color="#3b82f6"
            />
            <MetricCard
              title="Database Size"
              value={getSystemMetricsValue('actualFileSizeMB')}
              icon="Database"
              color="#f59e0b"
            />
          </div>
        </div>

        {/* Database Statistics */}
        {systemMetrics && systemMetrics.statistics && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Database Statistics</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Tables</p>
                  <p className="text-2xl font-bold text-gray-900">{getSystemMetricsValue('totalTables')}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Rows</p>
                  <p className="text-2xl font-bold text-gray-900">{getSystemMetricsValue('totalRows')}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Database Size</p>
                  <p className="text-2xl font-bold text-gray-900">{getSystemMetricsValue('actualFileSizeMB')}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Indexes</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.statistics.totalIndexes || 0}</p>
                </div>
              </div>
              
              {/* Backup Status */}
              {systemMetrics.recentBackups && systemMetrics.recentBackups.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Recent Backups</h4>
                  <div className="space-y-3">
                    {systemMetrics.recentBackups.slice(0, 3).map((backup, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{backup.filename}</p>
                          <p className="text-xs text-gray-500">{backup.created}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{backup.sizeMB} MB</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            backup.status === 'success' ? 'bg-green-100 text-green-800' :
                            backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {backup.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // System Metrics View (Comprehensive)
  const SystemMetricsView = () => {
    const systemMetricsList = [
      { key: 'cpu_usage_percent', label: 'CPU Usage', unit: '%', icon: 'Cpu' },
      { key: 'memory_usage_percent', label: 'Memory Usage', unit: '%', icon: 'Memory' },
      { key: 'disk_usage_percent', label: 'Disk Usage', unit: '%', icon: 'HardDrive' },
      { key: 'database_size_mb', label: 'Database Size', unit: 'MB', icon: 'Database' },
      { key: 'avg_response_time', label: 'Avg Response Time', unit: 'ms', icon: 'Activity' },
      { key: 'active_sessions', label: 'Active Sessions', unit: '', icon: 'Users' },
      { key: 'api_requests_per_minute', label: 'API Requests', unit: '/min', icon: 'TrendingUp' },
      { key: 'database_query_rate', label: 'DB Query Rate', unit: '/sec', icon: 'Database' }
    ];

    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Metrics Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">Comprehensive system monitoring and performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                fetchDetailedSystemMetrics();
                fetchSystemMetrics();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh metrics"
            >
              <Icon name="RefreshCw" size={20} color="#4b5563" />
            </button>
          </div>
        </div>

        {/* Key System Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key System Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemMetricsList.map((metric) => {
              const value = getSystemMetricValue(metric.key);
              const color = getMetricColor(metric.key, value);
              
              return (
                <div key={metric.key} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
                      <Icon name={metric.icon} size={20} color={color} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{metric.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{value} {metric.unit}</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      color === '#10b981' ? 'bg-green-500' :
                      color === '#f59e0b' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-xs text-gray-500">
                      {color === '#10b981' ? 'Healthy' :
                       color === '#f59e0b' ? 'Warning' :
                       'Critical'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Health Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">System Status</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-gray-900">{adminData?.systemHealth?.uptime || '0 days'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-medium text-gray-900">{adminData?.systemHealth?.responseTime || '0 ms'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Incident</span>
                <span className="text-sm font-medium text-gray-900">{adminData?.systemHealth?.lastIncident || 'No incidents'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">System Status</span>
                <span className={`text-sm font-medium ${
                  adminData?.systemHealth?.status === 'healthy' ? 'text-green-600' :
                  adminData?.systemHealth?.status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {adminData?.systemHealth?.status === 'healthy' ? 'Operational' :
                   adminData?.systemHealth?.status === 'warning' ? 'Degraded' :
                   'Critical'}
                </span>
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Database Status</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Backup Status</span>
                <span className={`text-sm font-medium ${
                  adminData?.database?.backupStatus === 'success' ? 'text-green-600' :
                  adminData?.database?.backupStatus === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {adminData?.database?.backupStatus || 'unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-sm font-medium text-gray-900">{adminData?.database?.lastBackup || 'Never'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Database Size</span>
                <span className="text-sm font-medium text-gray-900">{adminData?.database?.size || '0 MB'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Active Connections</span>
                <span className="text-sm font-medium text-gray-900">
                  {systemMetrics?.statistics?.settings?.database_connections || '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {systemMetrics && systemMetrics.statistics && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Database Performance</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Tables</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.statistics.totalTables || '0'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Rows</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.statistics.totalRows || '0'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Indexes</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.statistics.totalIndexes || '0'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">File Size</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.statistics.actualFileSizeMB || '0 MB'}</p>
                </div>
              </div>
              
              {systemMetrics.recentBackups && systemMetrics.recentBackups.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Recent Backups</h4>
                  <div className="space-y-3">
                    {systemMetrics.recentBackups.slice(0, 5).map((backup, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{backup.filename}</p>
                          <p className="text-xs text-gray-500">{backup.created}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{backup.sizeMB} MB</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            backup.status === 'success' ? 'bg-green-100 text-green-800' :
                            backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {backup.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Detail View Components
  const UserManagementView = () => {
    const filteredUsers = adminData?.users?.userList?.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Icon name="Users" size={16} />
            Add New User
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-sm text-gray-500 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{adminData?.users?.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-sm text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">{adminData?.users?.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-sm text-gray-500 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-gray-400">{adminData?.users?.inactive}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-sm text-gray-500 mb-1">Suspended</p>
            <p className="text-2xl font-bold text-red-600">{adminData?.users?.suspended}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Icon name="Search" size={20} color="#9ca3af" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Active</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers?.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700">{user.role}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{user.joined}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{user.lastActive}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Icon name="Edit" size={16} color="#4b5563" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const SecurityCenterView = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security Center</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage security events</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Failed Logins</p>
          <p className="text-2xl font-bold text-red-600">{adminData?.security?.failedLogins}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Blocked IPs</p>
          <p className="text-2xl font-bold text-amber-600">{adminData?.security?.blockedIPs}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Suspicious Activity</p>
          <p className="text-2xl font-bold text-red-600">{adminData?.security?.suspiciousActivity}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Password Resets</p>
          <p className="text-2xl font-bold text-indigo-600">{adminData?.security?.passwordResets}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Security Logs</h3>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-auto">
            {adminData?.security?.securityLogs?.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <Icon name="AlertTriangle" size={16} color={
                  log.severity === 'high' ? '#dc2626' :
                  log.severity === 'medium' ? '#d97706' :
                  '#2563eb'
                } />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{log.type}</p>
                  <p className="text-xs text-gray-500">{log.user} • {log.ip}</p>
                  <p className="text-xs text-gray-400 mt-1">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Blocked IP Addresses</h3>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-auto">
            {adminData?.security?.blockedIPsList?.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-mono font-medium text-gray-900">{item.ip}</p>
                  <button 
                    onClick={async () => {
                      try {
                        const token = getToken();
                        await fetch(`${API_URL}/api/metrics/blocked-ip/${item.ip}`, {
                          method: 'DELETE',
        credentials: 'include',
headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        fetchDashboardData(); // Refresh data
                      } catch (err) {
                        console.error('Error unblocking IP:', err);
                      }
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Unblock
                  </button>
                </div>
                <p className="text-xs text-gray-600">{item.reason}</p>
                <p className="text-xs text-gray-400 mt-1">{item.attempts} attempts • Blocked {item.blocked}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // UPDATED: Event Approvals View with API integration
  const EventApprovalsView = () => {
    const [pendingEvents, setPendingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');

    const fetchPendingEvents = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch(`${API_URL}/api/events/pending/approvals`, {
        credentials: 'include',
headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPendingEvents(result.events || []);
          }
        }
      } catch (error) {
        console.error('Error fetching pending events:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleApproveEvent = async (eventId) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/events/${eventId}/validate`, {
          method: 'PUT',
        credentials: 'include',
headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: approvalNotes
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Refresh the pending events list
            await fetchPendingEvents();
            setShowApprovalModal(false);
            setSelectedEvent(null);
            setApprovalNotes('');
            
            // Show success message
            alert('Event approved successfully!');
          }
        }
      } catch (error) {
        console.error('Error approving event:', error);
        alert('Failed to approve event');
      }
    };

    const handleRejectEvent = async (eventId) => {
      if (!rejectReason.trim()) {
        alert('Please provide a reason for rejection');
        return;
      }
      
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/events/${eventId}/reject`, {
          method: 'PUT',
        credentials: 'include',
headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: rejectReason
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Refresh the pending events list
            await fetchPendingEvents();
            setShowApprovalModal(false);
            setSelectedEvent(null);
            setRejectReason('');
            
            // Show success message
            alert('Event rejected successfully!');
          }
        }
      } catch (error) {
        console.error('Error rejecting event:', error);
        alert('Failed to reject event');
      }
    };

    const handleViewEventDetails = async (eventId) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/events/${eventId}/approval-details`, {
        credentials: 'include',
headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSelectedEvent(result.event);
            setShowApprovalModal(true);
          }
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
      }
    };

    useEffect(() => {
      fetchPendingEvents();
    }, []);

    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Approvals</h2>
            <p className="text-sm text-gray-500 mt-1">Review and approve pending events from organizers</p>
          </div>
          <button 
            onClick={fetchPendingEvents}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="RefreshCw" size={20} color="#4b5563" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin">
              <Icon name="RefreshCw" size={24} color="#6366f1" />
            </div>
          </div>
        ) : pendingEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Icon name="CheckCircle" size={48} color="#10b981" className="mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">No Pending Approvals</p>
            <p className="text-gray-500 mt-1">All events have been processed</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{pendingEvents.length}</span> events waiting for approval
              </p>
            </div>
            <div className="divide-y divide-gray-200 flex-1 overflow-auto">
              {pendingEvents.map((event) => (
                <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <Icon name="Activity" size={24} color="#3b82f6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{event.name}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Icon name="Mail" size={12} />
                              {event.organizer}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <Icon name="Tag" size={12} />
                              {event.category}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <Icon name="Clock" size={12} />
                              Submitted {event.submitted}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mt-4">
                        <button 
                          onClick={() => handleViewEventDetails(event.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Icon name="Edit" size={16} />
                          View Details
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowApprovalModal(true);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <Icon name="CheckCircle" size={16} />
                          Quick Approve
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowApprovalModal(true);
                            setRejectReason('');
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <Icon name="XCircle" size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Review Event: {selectedEvent.name}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Event Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Organizer:</span> {selectedEvent.organizer}</p>
                      <p><span className="font-medium">Category:</span> {selectedEvent.category}</p>
                      <p><span className="font-medium">Submitted:</span> {selectedEvent.submitted}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Ticket Information</h4>
                    {selectedEvent.ticket_types && selectedEvent.ticket_types.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEvent.ticket_types.map((ticket, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{ticket.name}:</span> R{ticket.price} ({ticket.quantity} available)
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No ticket information available</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Approval Notes (Optional)</h4>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Add notes about this approval..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Rejection Reason (Required for rejection)</h4>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this event..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedEvent(null);
                    setApprovalNotes('');
                    setRejectReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectEvent(selectedEvent.id)}
                  disabled={!rejectReason.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    rejectReason.trim() 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Reject Event
                </button>
                <button
                  onClick={() => handleApproveEvent(selectedEvent.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Approve Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DatabaseManagementView = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Database Management</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage database operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Database Size</p>
          <p className="text-2xl font-bold text-gray-900">{adminData?.database?.size}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Backup Status</p>
          <p className="text-2xl font-bold text-green-600 capitalize">{adminData?.database?.backupStatus}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Last Backup</p>
          <p className="text-2xl font-bold text-blue-600">{adminData?.database?.lastBackup}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Backup History</h3>
        </div>
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adminData?.database?.backupHistory?.map((backup, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-4 text-sm text-gray-900">{backup.date}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{backup.size}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{backup.duration}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                      backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {backup.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 capitalize">{backup.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const SystemLogsView = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Logs</h2>
        <p className="text-sm text-gray-500 mt-1">View and analyze system activity</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center gap-4">
          <select className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Levels</option>
            <option>INFO</option>
            <option>WARNING</option>
            <option>ERROR</option>
          </select>
          <select className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Modules</option>
            <option>Auth</option>
            <option>Security</option>
            <option>Events</option>
            <option>Database</option>
          </select>
          <div className="flex-1"></div>
          <button className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
            <Icon name="Download" size={16} />
            Export Logs
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adminData?.logs?.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-4 text-xs font-mono text-gray-600">{log.timestamp}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                      log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{log.module}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{log.message}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // NEW: Logout function
  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminToken');
    sessionStorage.clear();
    setIsLoggedIn(false);
    setAdminData(null);
    setError('Logged out successfully. Please login again.');
  };

  // Loading state
  if (loading && !isLoggedIn) {
    return (
      <div className="h-screen-dynamic bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto mb-4">
            <Icon name="RefreshCw" size={32} color="#6366f1" />
          </div>
          <p className="text-gray-600">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not logged in
  if (!isLoggedIn) {
    return <LoginPrompt />;
  }

  // Error state - redirect to login if session expired
  if (error && (error.includes('Please login') || error.includes('Session expired'))) {
    return <LoginPrompt />;
  }

  // Main dashboard loading
  if (loading) {
    return (
      <div className="h-screen-dynamic bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto mb-4">
            <Icon name="RefreshCw" size={32} color="#6366f1" />
          </div>
          <p className="text-gray-600">Loading admin dashboard...</p>
          {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}
        </div>
      </div>
    );
  }

  if (error && !adminData) {
    return (
      <div className="h-screen-dynamic bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Icon name="AlertTriangle" size={48} color="#ef4444" className="mx-auto mb-4" />
          <p className="text-lg font-bold text-red-600 mb-2">Unable to Load Dashboard</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={fetchDashboardData}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Connection
            </button>
            <button 
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Logout and Try Again
            </button>
            <p className="text-xs text-gray-500">
              Check if backend is running on {API_URL}<br />
              Make sure you're logged in as an administrator
            </p>
          </div>
        </div>
      </div>
    );
  }

  const healthItems = [
    {
      title: 'Uptime',
      value: adminData?.systemHealth?.uptime || '0 days',
      status: adminData?.systemHealth?.status || 'unknown',
      icon: 'Activity',
      color: '#10b981',
    },
    {
      title: 'Response Time',
      value: adminData?.systemHealth?.responseTime || '0 ms',
      status: 'healthy',
      icon: 'TrendingUp',
      color: '#6366f1',
    },
    {
      title: 'Database',
      value: adminData?.database?.size || '0 MB',
      status: 'healthy',
      icon: 'Database',
      color: '#f59e0b',
    },
    {
      title: 'Last Incident',
      value: adminData?.systemHealth?.lastIncident || 'No incidents',
      status: 'healthy',
      icon: 'Clock',
      color: '#ec4899',
    }
  ];

  // System metrics for the cards
  const systemMetricsCards = [
    { key: 'cpu_usage_percent', label: 'CPU Usage', unit: '%', icon: 'Cpu' },
    { key: 'memory_usage_percent', label: 'Memory Usage', unit: '%', icon: 'Memory' },
    { key: 'database_size_mb', label: 'Database Size', unit: 'MB', icon: 'Database' },
    { key: 'avg_response_time', label: 'Response Time', unit: 'ms', icon: 'Activity' }
  ].map(metric => ({
    ...metric,
    value: getSystemMetricValue(metric.key),
    color: getMetricColor(metric.key, getSystemMetricValue(metric.key))
  }));

  const formatCompact = (value) => {
    const n = Number(value) || 0;
    return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  const parseNumeric = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const match = String(value).match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  };

  const totalUsers = Number(adminData?.users?.total || 0);
  const totalEvents = Number(adminData?.platform?.totalEvents || 0);
  const blockedIps = Number(adminData?.security?.blockedIPs || 0);
  const failedLogins = Number(adminData?.security?.failedLogins || 0);
  const pendingApprovals = Number(adminData?.platform?.pendingApprovals || 0);
  const responseTimeMs = parseNumeric(adminData?.systemHealth?.responseTime);

  const enterpriseCards = [
    {
      id: 'users',
      title: 'Identity & Access',
      value: formatCompact(totalUsers),
      subtitle: `${adminData?.users?.admins || 0} admins, ${adminData?.users?.eventManagers || 0} managers`,
      trend: `${adminData?.users?.newThisWeek || 0} new this week`,
      tone: totalUsers > 0 ? 'emerald' : 'slate'
    },
    {
      id: 'security',
      title: 'Threat Intelligence',
      value: formatCompact(failedLogins + blockedIps),
      subtitle: `${failedLogins} failed auth, ${blockedIps} blocked IPs`,
      trend: blockedIps > 0 ? 'Active mitigations in place' : 'No active blocks',
      tone: blockedIps > 0 || failedLogins > 8 ? 'amber' : 'emerald'
    },
    {
      id: 'platform',
      title: 'Platform Operations',
      value: formatCompact(totalEvents),
      subtitle: `${adminData?.platform?.activeEvents || 0} active, ${pendingApprovals} pending approvals`,
      trend: pendingApprovals > 0 ? 'Approvals queue requires attention' : 'Approval queue clear',
      tone: pendingApprovals > 0 ? 'amber' : 'emerald'
    },
    {
      id: 'database',
      title: 'Data Infrastructure',
      value: adminData?.database?.size || '0 MB',
      subtitle: `Backup: ${adminData?.database?.backupStatus || 'unknown'}`,
      trend: `Last backup: ${adminData?.database?.lastBackup || 'Never'}`,
      tone: adminData?.database?.backupStatus === 'failed' ? 'rose' : 'indigo'
    },
    {
      id: 'performance',
      title: 'System Performance',
      value: `${formatCompact(responseTimeMs)} ms`,
      subtitle: `CPU ${formatCompact(systemMetricsDetailed?.cpu_usage_percent)}% · RAM ${formatCompact(systemMetricsDetailed?.memory_usage_percent)}%`,
      trend: `Uptime: ${adminData?.systemHealth?.uptime || '0 days'}`,
      tone: responseTimeMs > 350 ? 'rose' : responseTimeMs > 200 ? 'amber' : 'emerald'
    }
  ];

  const cardToneClass = {
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200',
    amber: 'from-amber-50 to-amber-100 border-amber-200',
    rose: 'from-rose-50 to-rose-100 border-rose-200',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200',
    slate: 'from-slate-50 to-slate-100 border-slate-200'
  };

  const openEnterpriseDrilldown = (card) => {
    if (card.id === 'users') {
      openUserInsight();
      return;
    }

    if (card.id === 'security') {
      openSecurityInsight();
      return;
    }

    if (card.id === 'platform') {
      openPipelineInsight();
      return;
    }
    if (card.id === 'database') {
      openDatabaseInsight();
      return;
    }
    if (card.id === 'performance') {
      openSystemRuntimeInsight();
      return;
    }
  };

  const formatCurrencyRand = (value) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const navigateToView = (view) => {
    setCurrentView(view);
    setSearchQuery('');
    setFilterStatus('all');
  };

  const handleRefreshAll = () => {
    fetchDashboardData();
    fetchBusinessMetrics();
    fetchSystemMetrics();
    fetchDetailedSystemMetrics();
  };

  const viewCopy = {
    dashboard: {
      kicker: 'Ticket Hub Operations',
      title: 'Administrative Console',
      description: 'Monitor ticket sales, organizer onboarding, customer trust, and infrastructure across the web and mobile platform.',
    },
    metrics: {
      kicker: 'Commercial intelligence',
      title: 'Revenue & Business Analytics',
      description: 'Track sales velocity, pricing, growth, and conversion performance across the ticketing platform.',
    },
    approvals: {
      kicker: 'Moderation workflow',
      title: 'Event Pipeline Control',
      description: 'Review submitted events, clear approval backlogs, and protect organizer go-live readiness.',
    },
    users: {
      kicker: 'Identity operations',
      title: 'User Management',
      description: 'Administer customers, staff, and organizers with role-aware visibility into account health.',
    },
    security: {
      kicker: 'Risk & trust',
      title: 'Security Center',
      description: 'Monitor suspicious activity, access abuse, and protective controls across the platform.',
    },
    'system-metrics': {
      kicker: 'Runtime observability',
      title: 'Infrastructure Metrics',
      description: 'Inspect compute, memory, database, and API performance for production stability.',
    },
    database: {
      kicker: 'Data resilience',
      title: 'Database Management',
      description: 'Review storage growth, backup readiness, and database operating health.',
    },
    logs: {
      kicker: 'Operational telemetry',
      title: 'System Logs',
      description: 'Search the live event stream for product, security, and infrastructure activity.',
    },
  };

  const activeViewCopy = viewCopy[currentView] || viewCopy.dashboard;
  const focusWindowLabel = timeRange === 'day' ? '24-hour window' : timeRange === 'month' ? '30-day window' : '7-day window';
  const focusWindowShortLabel = timeRange === 'day' ? '24H' : timeRange === 'month' ? '30D' : '7D';
  const liveConnectionLabel = wsError ? 'Fallback refresh mode' : 'WebSocket live';

  const businessStats = businessMetrics?.statistics || {};
  const revenueToday = Number(businessStats.revenue_today || 0);
  const ticketsSoldToday = Number(businessStats.tickets_sold_today || 0);
  const avgTicketPrice = Number(businessStats.avg_ticket_price || 0);
  const conversionRate = Number(businessStats.ticket_conversion_rate || 0);
  const userGrowthRate = Number(businessStats.user_growth_rate || 0);
  const newUsersToday = Number(businessStats.new_users_today || 0);
  const eventsCreatedToday = Number(businessStats.events_created_today || 0);
  const totalRevenue = Number(businessStats.total_revenue || 0);
  const totalTickets = Number(businessStats.total_tickets || 0);
  const cacheHitRate = Number(businessStats.cache_hit_rate || 0);
  const suspiciousActivityCount = Number(adminData?.security?.suspiciousActivity || 0);
  const passwordResets = Number(adminData?.security?.passwordResets || 0);
  const criticalAlerts = (adminData?.alerts || []).filter((alert) => alert.severity === 'high').length;
  const activeEventsCount = Number(adminData?.platform?.activeEvents || 0);
  const reportedIssues = Number(adminData?.platform?.reportedIssues || 0);
  const resolvedIssues = Number(adminData?.platform?.resolvedIssues || 0);
  const totalTablesCount = Number(systemMetrics?.statistics?.totalTables || 0);
  const totalRowsCount = Number(systemMetrics?.statistics?.totalRows || 0);
  const totalIndexesCount = Number(systemMetrics?.statistics?.totalIndexes || 0);
  const backupRunsCount = Number(adminData?.database?.backupHistory?.length || 0);
  const alertsCount = Number(adminData?.alerts?.length || 0);
  const recentActivityCount = Number(adminData?.recentActivity?.length || 0);
  const logEntriesCount = Number(adminData?.logs?.length || 0);
  const activeSessionsCount = parseNumeric(getSystemMetricValue('active_sessions'));
  const apiRequestsPerMinute = parseNumeric(getSystemMetricValue('api_requests_per_minute'));
  const cpuUsage = parseNumeric(getSystemMetricValue('cpu_usage_percent'));
  const memoryUsage = parseNumeric(getSystemMetricValue('memory_usage_percent'));
  const diskUsage = parseNumeric(getSystemMetricValue('disk_usage_percent'));
  const dbQueryRate = parseNumeric(getSystemMetricValue('database_query_rate'));

  const executiveStatusTone =
    criticalAlerts > 0 || responseTimeMs > 400
      ? 'rose'
      : pendingApprovals > 0 || failedLogins > 8 || blockedIps > 0
        ? 'amber'
        : 'emerald';

  const executiveStatusLabel =
    executiveStatusTone === 'rose'
      ? 'Executive attention required'
      : executiveStatusTone === 'amber'
        ? 'Monitored with active queues'
        : 'Platform operating within target';

  const executiveStatusMessage =
    criticalAlerts > 0
      ? `${criticalAlerts} critical alerts are active across security or infrastructure surfaces.`
      : pendingApprovals > 0
        ? `${pendingApprovals} organizer submissions are waiting in the moderation queue.`
        : responseTimeMs > 400
          ? 'API latency is above target thresholds and should be reviewed before peak demand.'
          : 'Sales, approvals, and infrastructure are currently operating within expected thresholds.';

  const heroMetrics = [
    {
      id: 'revenue',
      label: 'Gross sales today',
      value: formatCurrencyRand(revenueToday),
      detail: `${formatCompact(ticketsSoldToday)} tickets issued today`,
      icon: 'BarChart',
      accent: '#34d399',
      onClick: openRevenueInsight,
    },
    {
      id: 'pipeline',
      label: 'Moderation queue',
      value: formatCompact(pendingApprovals),
      detail: pendingApprovals > 0 ? `${pendingApprovals} events awaiting decision` : 'Approval queue is clear',
      icon: 'CheckCircle',
      accent: '#f59e0b',
      onClick: openPipelineInsight,
    },
    {
      id: 'users',
      label: 'Active users',
      value: formatCompact(adminData?.users?.active || 0),
      detail: `${adminData?.users?.admins || 0} admins / ${adminData?.users?.eventManagers || 0} managers`,
      icon: 'Users',
      accent: '#60a5fa',
      onClick: openUserInsight,
    },
    {
      id: 'security',
      label: 'Threat signals',
      value: formatCompact(failedLogins + suspiciousActivityCount),
      detail: `${blockedIps} blocked IPs and ${passwordResets} resets today`,
      icon: 'Shield',
      accent: '#fb7185',
      onClick: openSecurityInsight,
    },
    {
      id: 'runtime',
      label: 'Average response',
      value: `${formatCompact(responseTimeMs)} ms`,
      detail: `CPU ${formatCompact(cpuUsage)}% / RAM ${formatCompact(memoryUsage)}%`,
      icon: 'Cpu',
      accent: '#a78bfa',
      onClick: openSystemRuntimeInsight,
    },
    {
      id: 'database',
      label: 'Data footprint',
      value: adminData?.database?.size || '0 MB',
      detail: `Backup ${adminData?.database?.backupStatus || 'unknown'} / ${formatCompact(dbQueryRate)} qps`,
      icon: 'Database',
      accent: '#22d3ee',
      onClick: openDatabaseInsight,
    },
  ];

  const priorityToneClass = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  };

  const priorityItems = [
    {
      label: 'Approval queue',
      value: formatCompact(pendingApprovals),
      description: pendingApprovals > 0 ? 'Moderator workload is building and organizer go-live may stall.' : 'No event approvals are waiting right now.',
      actionLabel: 'Open queue',
      tone: pendingApprovals > 0 ? 'amber' : 'emerald',
      onClick: openPipelineInsight,
    },
    {
      label: 'Threat watch',
      value: formatCompact(failedLogins + suspiciousActivityCount),
      description: blockedIps > 0 ? `${blockedIps} IP blocks are actively protecting the platform.` : 'No active IP blocks are currently required.',
      actionLabel: 'Security center',
      tone: failedLogins > 8 || suspiciousActivityCount > 2 ? 'rose' : 'emerald',
      onClick: openSecurityInsight,
    },
    {
      label: 'Runtime health',
      value: `${formatCompact(responseTimeMs)} ms`,
      description: `CPU ${formatCompact(cpuUsage)}% / Memory ${formatCompact(memoryUsage)}% / Disk ${formatCompact(diskUsage)}%`,
      actionLabel: 'Runtime board',
      tone: responseTimeMs > 300 || cpuUsage > 80 || memoryUsage > 80 ? 'amber' : 'indigo',
      onClick: openSystemRuntimeInsight,
    },
  ];

  const securityBars = [
    { label: 'Failed logins', value: failedLogins, display: formatCompact(failedLogins), color: '#ef4444' },
    { label: 'Blocked IPs', value: blockedIps, display: formatCompact(blockedIps), color: '#f59e0b' },
    { label: 'Suspicious events', value: suspiciousActivityCount, display: formatCompact(suspiciousActivityCount), color: '#ec4899' },
    { label: 'Password resets', value: passwordResets, display: formatCompact(passwordResets), color: '#3b82f6' },
  ];

  const pipelineBars = [
    { label: 'Active events', value: activeEventsCount, display: formatCompact(activeEventsCount), color: '#10b981' },
    { label: 'Pending approvals', value: pendingApprovals, display: formatCompact(pendingApprovals), color: '#f59e0b' },
    { label: 'Reported issues', value: reportedIssues, display: formatCompact(reportedIssues), color: '#ef4444' },
    { label: 'Resolved issues', value: resolvedIssues, display: formatCompact(resolvedIssues), color: '#6366f1' },
  ];

  const revenueBars = [
    { label: 'Tickets sold', value: ticketsSoldToday, display: formatCompact(ticketsSoldToday), color: '#10b981' },
    { label: 'New users', value: newUsersToday, display: formatCompact(newUsersToday), color: '#3b82f6' },
    { label: 'Events created', value: eventsCreatedToday, display: formatCompact(eventsCreatedToday), color: '#8b5cf6' },
    { label: 'Active events', value: activeEventsCount, display: formatCompact(activeEventsCount), color: '#f59e0b' },
  ];

  const runtimeUtilizationBars = [
    { label: 'CPU utilization', value: cpuUsage, display: `${formatCompact(cpuUsage)}%`, color: '#6366f1' },
    { label: 'Memory utilization', value: memoryUsage, display: `${formatCompact(memoryUsage)}%`, color: '#10b981' },
    { label: 'Disk utilization', value: diskUsage, display: `${formatCompact(diskUsage)}%`, color: '#f59e0b' },
  ];

  const runtimeThroughputBars = [
    { label: 'Active sessions', value: activeSessionsCount, display: formatCompact(activeSessionsCount), color: '#0ea5e9' },
    { label: 'API requests per minute', value: apiRequestsPerMinute, display: formatCompact(apiRequestsPerMinute), color: '#8b5cf6' },
    { label: 'DB query rate', value: dbQueryRate, display: formatCompact(dbQueryRate), color: '#14b8a6' },
  ];

  const userRoleBars = [
    { label: 'Admins', value: Number(adminData?.users?.admins || 0), display: formatCompact(adminData?.users?.admins || 0), color: '#4f46e5' },
    { label: 'Managers', value: Number(adminData?.users?.eventManagers || 0), display: formatCompact(adminData?.users?.eventManagers || 0), color: '#0ea5e9' },
    { label: 'Customers', value: Number(adminData?.users?.customers || 0), display: formatCompact(adminData?.users?.customers || 0), color: '#10b981' },
    { label: 'Suspended', value: Number(adminData?.users?.suspended || 0), display: formatCompact(adminData?.users?.suspended || 0), color: '#ef4444' },
  ];

  const databaseEstateBars = [
    { label: 'Tables', value: totalTablesCount, display: formatCompact(totalTablesCount), color: '#8b5cf6' },
    { label: 'Rows', value: totalRowsCount, display: formatCompact(totalRowsCount), color: '#3b82f6' },
    { label: 'Indexes', value: totalIndexesCount, display: formatCompact(totalIndexesCount), color: '#10b981' },
    { label: 'Backup runs', value: backupRunsCount, display: formatCompact(backupRunsCount), color: '#f59e0b' },
  ];

  const databaseFlowBars = [
    { label: 'Query rate', value: dbQueryRate, display: formatCompact(dbQueryRate), color: '#14b8a6' },
    { label: 'Slow queries', value: Number(adminData?.database?.slowQueries || 0), display: formatCompact(adminData?.database?.slowQueries || 0), color: '#ef4444' },
    { label: 'API RPM', value: apiRequestsPerMinute, display: formatCompact(apiRequestsPerMinute), color: '#3b82f6' },
  ];

  const operationsFeedBars = [
    { label: 'Alerts', value: alertsCount, display: formatCompact(alertsCount), color: '#06b6d4' },
    { label: 'Activity', value: recentActivityCount, display: formatCompact(recentActivityCount), color: '#3b82f6' },
    { label: 'Log entries', value: logEntriesCount, display: formatCompact(logEntriesCount), color: '#8b5cf6' },
    { label: 'Reported issues', value: reportedIssues, display: formatCompact(reportedIssues), color: '#f59e0b' },
    { label: 'Resolved issues', value: resolvedIssues, display: formatCompact(resolvedIssues), color: '#10b981' },
  ];

  const securityBarMax = Math.max(...securityBars.map((item) => item.value), 1);
  const pipelineBarMax = Math.max(...pipelineBars.map((item) => item.value), 1);

  const navigationSections = [
    {
      label: 'Command',
      items: [
        { id: 'dashboard', label: 'Overview', icon: 'BarChart', badge: executiveStatusTone === 'emerald' ? 'Live' : executiveStatusLabel },
        { id: 'metrics', label: 'Revenue & BI', icon: 'TrendingUp', badge: ticketsSoldToday > 0 ? `${formatCompact(ticketsSoldToday)} sold` : 'Monitor' },
        { id: 'approvals', label: 'Event Pipeline', icon: 'CheckCircle', badge: pendingApprovals },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'users', label: 'User Ops', icon: 'Users', badge: adminData?.users?.active || 0 },
        { id: 'security', label: 'Security', icon: 'Shield', badge: failedLogins + blockedIps },
        { id: 'logs', label: 'Logs', icon: 'Activity', badge: adminData?.logs?.length || 0 },
      ],
    },
    {
      label: 'Infrastructure',
      items: [
        { id: 'system-metrics', label: 'Runtime', icon: 'Cpu', badge: `${formatCompact(cpuUsage)}%` },
        { id: 'database', label: 'Database', icon: 'Database', badge: adminData?.database?.backupStatus || 'n/a' },
      ],
    },
  ];

  const mobileNavItems = navigationSections.flatMap((section) => section.items);

  const NavButton = ({ item, mobile = false }) => {
    const active = currentView === item.id;

    return (
      <button
        onClick={() => navigateToView(item.id)}
        className={
          mobile
            ? `min-w-[170px] rounded-2xl border px-3 py-3 text-left transition-all ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`
            : `w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                active
                  ? 'border-sky-400/30 bg-sky-500/10 text-white'
                  : 'border-white/5 bg-white/0 text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white'
              }`
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                active ? (mobile ? 'bg-white/10' : 'bg-sky-400/15') : mobile ? 'bg-slate-100' : 'bg-white/5'
              }`}
            >
              <Icon name={item.icon} size={18} color={active ? (mobile ? '#ffffff' : '#7dd3fc') : mobile ? '#334155' : '#cbd5e1'} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${active ? '' : mobile ? 'text-slate-800' : 'text-slate-100'}`}>{item.label}</p>
              {item.badge !== undefined && item.badge !== null && item.badge !== '' && (
                <p className={`mt-0.5 text-xs ${mobile ? (active ? 'text-slate-200' : 'text-slate-500') : active ? 'text-sky-100' : 'text-slate-400'}`}>
                  {item.badge}
                </p>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <div
        className="relative h-screen-dynamic overflow-hidden bg-slate-100"
        style={{
          fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
          backgroundImage: 'linear-gradient(180deg, #f6f8fb 0%, #eef2f7 100%)',
        }}
      >
        <div className="relative flex h-full">
          <aside className="hidden w-[290px] flex-col border-r border-slate-200 bg-slate-900 text-slate-200 xl:flex">
            <div className="border-b border-white/10 px-6 py-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15">
                  <Icon name="Shield" size={24} color="#7dd3fc" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200/80">Ticket Hub</p>
                  <h1 className="mt-1 text-xl font-bold tracking-tight text-white">Admin Console</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Central operations for commercial, customer, and platform administration.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-6">
                {navigationSections.map((section) => (
                  <div key={section.label}>
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {section.label}
                    </p>
                    <div className="mt-3 space-y-2">
                      {section.items.map((item) => (
                        <NavButton key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 p-2.5">
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Environment</p>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Production
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-2.5 py-1.5">
                    <p className="text-[11px] text-slate-500">Live sync</p>
                    <p className="text-[11px] font-semibold text-white">{liveConnectionLabel}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-2.5 py-1.5">
                    <p className="text-[11px] text-slate-500">Last sync</p>
                    <p className="text-[11px] font-semibold text-white">
                      {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Pending'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRefreshAll}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Icon name="RefreshCw" size={14} color="#0f172a" />
                    Refresh
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    <Icon name="Unlock" size={14} color="#be123c" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {currentView !== 'dashboard' && (
                    <button
                      onClick={() => navigateToView('dashboard')}
                      className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Icon name="ArrowLeft" size={20} color="#475569" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                      {activeViewCopy.kicker}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">
                      {activeViewCopy.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {activeViewCopy.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                      {[
                        ['day', '24H'],
                        ['week', '7D'],
                        ['month', '30D'],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setTimeRange(key)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            timeRange === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
                {mobileNavItems.map((item) => (
                  <NavButton key={`mobile-${item.id}`} item={item} mobile />
                ))}
              </div>

              {error && !error.includes('Logged out') && !error.includes('Session expired') && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-medium text-rose-700">API error: {error}</p>
                  <p className="mt-1 text-xs text-rose-600">Check backend availability at {API_URL}.</p>
                </div>
              )}
              {wsError && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-700">{wsError}</p>
                </div>
              )}
              {error && error.includes('Logged out') && (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-700">{error}</p>
                </div>
              )}
            </header>

            <main className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto px-4 py-5 sm:px-6">
            {currentView === 'dashboard' && (
              <div className="space-y-6 h-full">
                <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                  <div
                    className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 text-slate-900"
                    style={{ boxShadow: '0 24px 56px -36px rgba(15, 23, 42, 0.22)' }}
                  >
                    <div className="relative">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                            Executive summary
                          </p>
                          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.1rem]">
                            Operational overview for ticketing, organizers, and platform health.
                          </h3>
                          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                            {executiveStatusMessage} Focus window: {focusWindowLabel}.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={openExecutiveOverview}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                            >
                              <Icon name="BarChart" size={16} color="#fff" />
                              Open executive brief
                            </button>
                            <button
                              onClick={openRevenueInsight}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              <Icon name="TrendingUp" size={16} color="#334155" />
                              Open revenue brief
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active sessions</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(activeSessionsCount)}</p>
                            <p className="mt-1 text-xs text-slate-500">Concurrent admin and platform sessions</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">API throughput</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(apiRequestsPerMinute)}</p>
                            <p className="mt-1 text-xs text-slate-500">Requests per minute on the live stack</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Backup state</p>
                            <p className="mt-2 text-2xl font-bold capitalize text-slate-900">
                              {adminData?.database?.backupStatus || 'unknown'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Last backup {adminData?.database?.lastBackup || 'Never'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {heroMetrics.map((metric) => (
                          <button
                            key={metric.id}
                            onClick={metric.onClick}
                            className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                  {metric.label}
                                </p>
                                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{metric.value}</p>
                              </div>
                              <div
                                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: `${metric.accent}22` }}
                              >
                                <Icon name={metric.icon} size={20} color={metric.accent} />
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{metric.detail}</p>
                            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Open detail
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-[32px] border border-slate-200 bg-white p-5"
                    style={{ boxShadow: '0 22px 55px -34px rgba(15, 23, 42, 0.28)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Priority board
                        </p>
                        <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                          Priority actions
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Focus on the next operational task with the greatest business impact.
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                        {focusWindowShortLabel}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {priorityItems.map((item) => (
                        <div key={item.label} className={`rounded-[24px] border p-4 ${priorityToneClass[item.tone]}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em]">{item.label}</p>
                              <p className="mt-2 text-sm leading-6">{item.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{item.value}</p>
                              <button
                                onClick={item.onClick}
                                className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-white"
                              >
                                {item.actionLabel}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-900 p-5 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Recommended action
                      </p>
                      <h4 className="mt-2 text-xl font-bold tracking-tight">
                        {pendingApprovals > 0
                          ? 'Clear moderation before the next organizer traffic spike.'
                          : 'Use the launchpad to inspect live sales, security, and runtime health.'}
                      </h4>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {pendingApprovals > 0
                          ? `${pendingApprovals} submissions are waiting for review and may delay organizer activation.`
                          : `${formatCurrencyRand(revenueToday)} in ticket sales today with ${criticalAlerts} critical alerts currently open.`}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => navigateToView(pendingApprovals > 0 ? 'approvals' : 'metrics')}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                        >
                          <Icon
                            name={pendingApprovals > 0 ? 'CheckCircle' : 'TrendingUp'}
                            size={16}
                            color="#0f172a"
                          />
                          {pendingApprovals > 0 ? 'Open approvals queue' : 'Open revenue workspace'}
                        </button>
                        <button
                          onClick={handleRefreshAll}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                        >
                          <Icon name="RefreshCw" size={16} color="#ffffff" />
                          Refresh all
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 2xl:grid-cols-3">
                  <div
                    className="rounded-[28px] border border-slate-200 bg-white p-5"
                    style={{ boxShadow: '0 20px 45px -34px rgba(15, 23, 42, 0.26)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Commercial performance
                        </p>
                        <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                          Ticket revenue engine
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Live sales, ticket pricing, and acquisition signals for the {focusWindowLabel.toLowerCase()}.
                        </p>
                      </div>
                      <button
                        onClick={openRevenueInsight}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        Revenue brief
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Revenue today</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrencyRand(revenueToday)}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatCompact(ticketsSoldToday)} tickets sold</p>
                      </div>
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Avg ticket</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrencyRand(avgTicketPrice)}</p>
                        <p className="mt-2 text-xs text-slate-500">Average paid basket value</p>
                      </div>
                      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">New users</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(newUsersToday)}</p>
                        <p className="mt-2 text-xs text-slate-500">User growth {formatCompact(userGrowthRate)}%</p>
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Conversion</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompact(conversionRate)}%</p>
                        <p className="mt-2 text-xs text-slate-500">Cache hit rate {formatCompact(cacheHitRate)}%</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-[28px] border border-slate-200 bg-white p-5"
                    style={{ boxShadow: '0 20px 45px -34px rgba(15, 23, 42, 0.26)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Trust posture
                        </p>
                        <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                          Security operations
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Active abuse mitigation, authentication friction, and alert pressure.
                        </p>
                      </div>
                      <button
                        onClick={openSecurityInsight}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        Threat brief
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {securityBars.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-700">{item.label}</p>
                            <span className="text-sm font-semibold text-slate-900">{item.display}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.max(8, (item.value / securityBarMax) * 100)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-[28px] border border-slate-200 bg-white p-5"
                    style={{ boxShadow: '0 20px 45px -34px rgba(15, 23, 42, 0.26)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Catalog throughput
                        </p>
                        <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                          Event pipeline
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Inventory readiness, issue load, and moderation progress for organizers.
                        </p>
                      </div>
                      <button
                        onClick={openPipelineInsight}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        View brief
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {pipelineBars.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-700">{item.label}</p>
                            <span className="text-sm font-semibold text-slate-900">{item.display}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.max(8, (item.value / pipelineBarMax) * 100)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="relative">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Operational Domain Snapshot</h2>
                        <p className="text-slate-500 text-sm">Drill into identity, security, platform operations, data infrastructure, and runtime performance.</p>
                      </div>
                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                        Domain refresh: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Not synchronized'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                      {enterpriseCards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => openEnterpriseDrilldown(card)}
                          className={`text-left rounded-xl border p-4 bg-gradient-to-b ${cardToneClass[card.tone]} hover:shadow-lg hover:-translate-y-0.5 transition-all`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">{card.title}</p>
                          <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                          <p className="text-xs text-slate-700 mt-2">{card.subtitle}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-slate-600">{card.trend}</span>
                            <span className="text-[11px] font-semibold text-slate-700">Drill down</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* UPDATED: System Monitoring & System Health Section */}
                <div className="space-y-6">
                  {/* System Monitoring - Focus on critical alerts */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">System Monitoring</h2>
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-blue-700">REAL-TIME MONITORING</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Security Alerts Card */}
                      <div 
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                        onClick={openSecurityInsight}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#ef444420' }}>
                            <Icon name="AlertTriangle" size={20} color="#ef4444" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Security Alerts</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {adminData?.security?.failedLogins || 0}
                        </div>
                        <div className="text-sm text-gray-600 mb-2 line-clamp-2">Failed login attempts (24h)</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(adminData?.security?.failedLogins || 0) > 10 ? 'bg-red-500' : (adminData?.security?.failedLogins || 0) > 5 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-xs text-gray-500">
                              {(adminData?.security?.failedLogins || 0) > 10 ? 'High' : (adminData?.security?.failedLogins || 0) > 5 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">24h</span>
                        </div>
                      </div>

                      {/* Blocked IPs Card */}
                      <div 
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                          setModalTitle('Blocked IP Addresses');
                          setModalContent(
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: '#f59e0b20' }}>
                                  <Icon name="Ban" size={24} color="#f59e0b" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">Blocked IP Addresses</h3>
                                  <p className="text-sm text-gray-500">Active security blocks</p>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-gray-900 mb-2">{adminData?.security?.blockedIPs || 0}</div>
                                  <p className="text-sm text-gray-600">Active blocked IP addresses</p>
                                </div>
                              </div>

                              {adminData?.security?.blockedIPsList && adminData.security.blockedIPsList.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Recent Blocks</h4>
                                  <div className="space-y-2">
                                    {adminData.security.blockedIPsList.slice(0, 5).map((ip, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                        <div>
                                          <p className="font-medium text-gray-900">{ip.ip}</p>
                                          <p className="text-xs text-gray-500">{ip.reason}</p>
                                        </div>
                                        <button 
                                          onClick={async () => {
                                            try {
                                              const token = getToken();
                                              const response = await fetch(`${API_URL}/api/metrics/blocked-ip/${ip.ip}`, {
                                                method: 'DELETE',
        credentials: 'include',
headers: {
                                                  'Authorization': `Bearer ${token}`,
                                                  'Content-Type': 'application/json'
                                                }
                                              });
                                              if (response.ok) {
                                                alert(`IP ${ip.ip} unblocked`);
                                                fetchDashboardData();
                                                setModalOpen(false);
                                              }
                                            } catch (err) {
                                              console.error('Error unblocking IP:', err);
                                            }
                                          }}
                                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                          Unblock
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                          setModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#f59e0b20' }}>
                            <Icon name="Ban" size={20} color="#f59e0b" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blocked IPs</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {adminData?.security?.blockedIPs || 0}
                        </div>
                        <div className="text-sm text-gray-600 mb-2 line-clamp-2">Active IP address blocks</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(adminData?.security?.blockedIPs || 0) > 5 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-xs text-gray-500">
                              {(adminData?.security?.blockedIPs || 0) > 5 ? 'Warning' : 'Normal'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">Active</span>
                        </div>
                      </div>

                      {/* Suspicious Activity Card */}
                      <div 
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                        onClick={openSecurityInsight}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#ec489920' }}>
                            <Icon name="Shield" size={20} color="#ec4899" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suspicious Activity</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {adminData?.security?.suspiciousActivity || 0}
                        </div>
                        <div className="text-sm text-gray-600 mb-2 line-clamp-2">Suspicious events detected</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(adminData?.security?.suspiciousActivity || 0) > 3 ? 'bg-red-500' : (adminData?.security?.suspiciousActivity || 0) > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-xs text-gray-500">
                              {(adminData?.security?.suspiciousActivity || 0) > 3 ? 'High' : (adminData?.security?.suspiciousActivity || 0) > 0 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">Today</span>
                        </div>
                      </div>

                      {/* Password Resets Card */}
                      <div 
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                          setModalTitle('Password Reset Activity');
                          setModalContent(
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: '#3b82f620' }}>
                                  <Icon name="Lock" size={24} color="#3b82f6" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">Password Reset Activity</h3>
                                  <p className="text-sm text-gray-500">Recent password reset requests</p>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-gray-900 mb-2">{adminData?.security?.passwordResets || 0}</div>
                                  <p className="text-sm text-gray-600">Password resets in last 24 hours</p>
                                </div>
                              </div>

                              {adminData?.security?.securityLogs && adminData.security.securityLogs.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Recent Security Events</h4>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {adminData.security.securityLogs
                                      .filter(log => log.type.toLowerCase().includes('password') || log.type.toLowerCase().includes('reset'))
                                      .slice(0, 10)
                                      .map((log, idx) => (
                                        <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-900">{log.type}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                              log.severity === 'high' ? 'bg-red-100 text-red-800' :
                                              log.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-blue-100 text-blue-800'
                                            }`}>
                                              {log.severity}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-600 mb-1">{log.user} • {log.ip}</p>
                                          <p className="text-xs text-gray-400">{log.time}</p>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                          setModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#3b82f620' }}>
                            <Icon name="Lock" size={20} color="#3b82f6" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password Resets</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {adminData?.security?.passwordResets || 0}
                        </div>
                        <div className="text-sm text-gray-600 mb-2 line-clamp-2">Reset requests (24h)</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(adminData?.security?.passwordResets || 0) > 5 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-xs text-gray-500">
                              {(adminData?.security?.passwordResets || 0) > 5 ? 'High' : 'Normal'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">24h</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health - Moved Database Size and Response Time here */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">System Health</h2>
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-green-700">SYSTEM STATUS</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Uptime Card */}
                      <SystemHealthCard
                        title="Uptime"
                        value={adminData?.systemHealth?.uptime || '0 days'}
                        status="healthy"
                        icon="Activity"
                        color="#10b981"
                        onClick={openSystemRuntimeInsight}
                      />
                      
                      {/* Database Size Card - MOVED HERE */}
                      <div 
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                          setModalTitle('Database Information');
                          setModalContent(
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: '#f59e0b20' }}>
                                  <Icon name="Database" size={24} color="#f59e0b" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">Database Information</h3>
                                  <p className="text-sm text-gray-500">Storage and performance metrics</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <p className="text-sm text-gray-500 mb-1">Current Size</p>
                                  <p className="text-2xl font-bold text-gray-900">{adminData?.database?.size || '0 MB'}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <p className="text-sm text-gray-500 mb-1">Backup Status</p>
                                  <p className={`text-2xl font-bold ${
                                    adminData?.database?.backupStatus === 'success' ? 'text-green-600' :
                                    adminData?.database?.backupStatus === 'failed' ? 'text-red-600' :
                                    'text-yellow-600'
                                  }`}>
                                    {adminData?.database?.backupStatus || 'unknown'}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Recent Backups</h4>
                                {adminData?.database?.backupHistory && adminData.database.backupHistory.length > 0 ? (
                                  <div className="space-y-2">
                                    {adminData.database.backupHistory.slice(0, 3).map((backup, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">{backup.date}</p>
                                          <p className="text-xs text-gray-500">{backup.size} • {backup.duration}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {backup.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-sm">No backup history available</p>
                                )}
                              </div>
                            </div>
                          );
                          setModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#f59e0b20' }}>
                            <Icon name="Database" size={20} color="#f59e0b" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database Size</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{adminData?.database?.size || '0 MB'}</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${adminData?.database?.backupStatus === 'success' ? 'bg-green-500' : adminData?.database?.backupStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          <span className="text-xs text-gray-500">{adminData?.database?.backupStatus || 'unknown'}</span>
                        </div>
                      </div>
                      
                      {/* Response Time Card - MOVED HERE */}
                      <div 
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                          setModalTitle('Response Time Analysis');
                          setModalContent(
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: '#ec489920' }}>
                                  <Icon name="Activity" size={24} color="#ec4899" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">Response Time Analysis</h3>
                                  <p className="text-sm text-gray-500">System performance metrics</p>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-gray-900 mb-2">
                                    {adminData?.systemHealth?.responseTime || '0 ms'}
                                  </div>
                                  <p className="text-sm text-gray-600">Current average response time</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                                  <p className="text-sm text-gray-500 mb-1">System Status</p>
                                  <p className={`text-lg font-bold ${
                                    adminData?.systemHealth?.status === 'healthy' ? 'text-green-600' :
                                    adminData?.systemHealth?.status === 'warning' ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {adminData?.systemHealth?.status === 'healthy' ? 'Operational' :
                                     adminData?.systemHealth?.status === 'warning' ? 'Degraded' :
                                     'Critical'}
                                  </p>
                                </div>
                                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                                  <p className="text-sm text-gray-500 mb-1">Last Incident</p>
                                  <p className="text-lg font-bold text-gray-900">{adminData?.systemHealth?.lastIncident || 'No incidents'}</p>
                                </div>
                              </div>
                            </div>
                          );
                          setModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#ec489920' }}>
                            <Icon name="Activity" size={20} color="#ec4899" />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Response Time</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{adminData?.systemHealth?.responseTime || '0 ms'}</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            adminData?.systemHealth?.status === 'healthy' ? 'bg-green-500' :
                            adminData?.systemHealth?.status === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {adminData?.systemHealth?.status === 'healthy' ? 'Operational' :
                             adminData?.systemHealth?.status === 'warning' ? 'Degraded' :
                             'Issues'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Last Incident Card */}
                      <SystemHealthCard
                        title="Last Incident"
                        value={adminData?.systemHealth?.lastIncident || 'No incidents'}
                        status="healthy"
                        icon="Clock"
                        color="#8b5cf6"
                        onClick={openExecutiveOverview}
                      />
                    </div>
                  </div>
                </div>

                {/* System Alerts Section - ADDITIONAL METRICS */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">System Alerts & Metrics</h2>
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full">
                      <Icon name="AlertTriangle" size={12} color="#dc2626" />
                      <span className="text-xs font-semibold text-red-700">ALERTS & METRICS</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Active Events Card */}
                    <div 
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openPipelineInsight}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#10b98120' }}>
                          <Icon name="Activity" size={20} color="#10b981" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Events</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {adminData?.platform?.activeEvents || 0}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">Currently active events</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-xs text-gray-500">Live</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {adminData?.platform?.pendingApprovals || 0} pending
                        </span>
                      </div>
                    </div>

                    {/* Pending Approvals Card */}
                    <div 
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openPipelineInsight}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#f59e0b20' }}>
                          <Icon name="Clock" size={20} color="#f59e0b" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</span>
                        </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {adminData?.platform?.pendingApprovals || 0}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">Events awaiting approval</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${(adminData?.platform?.pendingApprovals || 0) > 5 ? 'bg-red-500' : (adminData?.platform?.pendingApprovals || 0) > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                          <span className="text-xs text-gray-500">
                            {(adminData?.platform?.pendingApprovals || 0) > 5 ? 'High' : (adminData?.platform?.pendingApprovals || 0) > 0 ? 'Medium' : 'None'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">Awaiting</span>
                      </div>
                    </div>

                    {/* User Activity Card */}
                    <div 
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openUserInsight}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#3b82f620' }}>
                          <Icon name="Users" size={20} color="#3b82f6" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Users</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {adminData?.users?.active || 0}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">Users currently online</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-xs text-gray-500">Live</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {adminData?.users?.total || 0} total
                        </span>
                      </div>
                    </div>

                    {/* API Health Card */}
                    <div 
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openSystemRuntimeInsight}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#10b98120' }}>
                          <Icon name="Cpu" size={20} color="#10b981" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">API Health</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {adminData?.systemHealth?.status === 'healthy' ? 'OK' : 'Issues'}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">API system status</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            adminData?.systemHealth?.status === 'healthy' ? 'bg-green-500' :
                            adminData?.systemHealth?.status === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {adminData?.systemHealth?.status === 'healthy' ? 'Healthy' :
                             adminData?.systemHealth?.status === 'warning' ? 'Warning' :
                             'Critical'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">Live</span>
                      </div>
                    </div>

                    {/* System Load Card */}
                    <div 
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openSystemRuntimeInsight}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#8b5cf620' }}>
                          <Icon name="TrendingUp" size={20} color="#8b5cf6" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Load</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {getSystemMetricValue('cpu_usage_percent')}%
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">Current CPU usage</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            parseFloat(getSystemMetricValue('cpu_usage_percent')) > 80 ? 'bg-red-500' :
                            parseFloat(getSystemMetricValue('cpu_usage_percent')) > 60 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {parseFloat(getSystemMetricValue('cpu_usage_percent')) > 80 ? 'High' :
                             parseFloat(getSystemMetricValue('cpu_usage_percent')) > 60 ? 'Medium' :
                             'Low'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">Live</span>
                      </div>
                    </div>

                    {/* Disk Usage Card */}
                    <div 
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full hover:scale-[1.02] active:scale-[0.98]"
                      onClick={openSystemRuntimeInsight}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`} style={{ backgroundColor: '#f9731620' }}>
                          <Icon name="HardDrive" size={20} color="#f97316" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disk Usage</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {getSystemMetricValue('disk_usage_percent')}%
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">Storage utilization</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            parseFloat(getSystemMetricValue('disk_usage_percent')) > 90 ? 'bg-red-500' :
                            parseFloat(getSystemMetricValue('disk_usage_percent')) > 75 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {parseFloat(getSystemMetricValue('disk_usage_percent')) > 90 ? 'Critical' :
                             parseFloat(getSystemMetricValue('disk_usage_percent')) > 75 ? 'Warning' :
                             'Normal'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">Live</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions - UPDATED TO INCLUDE SYSTEM METRICS */}
                <div>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Operations</p>
                      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Quick Actions</h2>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      Interactive command cards
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                      title="System Metrics"
                      description="CPU, memory, disk, and performance monitoring"
                      icon="Cpu"
                      color="#6366f1"
                      onClick={() => setCurrentView('system-metrics')}
                      primaryLabel="Open runtime"
                      secondaryLabel="View health brief"
                      secondaryAction={openSystemRuntimeInsight}
                      stats={[
                        { label: 'CPU', value: `${getSystemMetricValue('cpu_usage_percent')}%` },
                        { label: 'Memory', value: `${getSystemMetricValue('memory_usage_percent')}%` },
                        { label: 'RPM', value: getSystemMetricValue('api_requests_per_minute') }
                      ]}
                    />
                    <QuickActionCard
                      title="User Management"
                      description="Manage users, roles, and permissions"
                      icon="Users"
                      color="#10b981"
                      onClick={() => setCurrentView('users')}
                      secondaryLabel="User brief"
                      secondaryAction={openUserInsight}
                      stats={[
                        { label: 'Total', value: adminData?.users?.total || 0 },
                        { label: 'Active', value: adminData?.users?.active || 0 },
                        { label: 'Admins', value: adminData?.users?.admins || 0 }
                      ]}
                    />
                    <QuickActionCard
                      title="Business Metrics"
                      description="Revenue, growth, and performance analytics"
                      icon="BarChart"
                      color="#f59e0b"
                      onClick={() => setCurrentView('metrics')}
                      primaryLabel="Open analytics"
                      secondaryLabel="Revenue brief"
                      secondaryAction={openRevenueInsight}
                      stats={[
                        { label: 'Revenue', value: `R ${businessMetrics?.statistics?.revenue_today || 0}` },
                        { label: 'Tickets', value: businessMetrics?.statistics?.tickets_sold_today || 0 },
                        { label: 'Events', value: businessMetrics?.statistics?.events_created_today || 0 }
                      ]}
                    />
                    <QuickActionCard
                      title="Revenue Command"
                      description="Ticket demand, pricing yield, and conversion execution"
                      icon="TrendingUp"
                      color="#0f766e"
                      onClick={() => setCurrentView('metrics')}
                      primaryLabel="Open revenue board"
                      secondaryLabel="Commercial brief"
                      secondaryAction={openRevenueInsight}
                      stats={[
                        { label: 'Today', value: formatCurrencyRand(revenueToday) },
                        { label: 'Conversion', value: `${formatCompact(conversionRate)}%` },
                        { label: 'Avg ticket', value: formatCurrencyRand(avgTicketPrice) }
                      ]}
                    />
                    <QuickActionCard
                      title="Security Center"
                      description="Monitor security and access controls"
                      icon="Shield"
                      color="#ef4444"
                      onClick={() => setCurrentView('security')}
                      secondaryLabel="Threat brief"
                      secondaryAction={openSecurityInsight}
                      stats={[
                        { label: 'Failed', value: adminData?.security?.failedLogins || 0 },
                        { label: 'Blocked', value: adminData?.security?.blockedIPs || 0 },
                        { label: 'Alerts', value: adminData?.security?.suspiciousActivity || 0 }
                      ]}
                    />
                    <QuickActionCard
                      title="Database Management"
                      description="Backups and maintenance"
                      icon="Database"
                      color="#8b5cf6"
                      onClick={() => setCurrentView('database')}
                      secondaryLabel="DB insight"
                      secondaryAction={openDatabaseInsight}
                      stats={[
                        { label: 'Size', value: adminData?.database?.size || '0 MB' },
                        { label: 'Tables', value: systemMetrics?.statistics?.totalTables || 0 },
                        { label: 'Rows', value: systemMetrics?.statistics?.totalRows || 0 }
                      ]}
                    />
                    <QuickActionCard
                      title="System Logs"
                      description="View and analyze system activity logs"
                      icon="Activity"
                      color="#0ea5e9"
                      onClick={() => setCurrentView('logs')}
                      primaryLabel="Open logs"
                      secondaryLabel="Operations brief"
                      secondaryAction={openOperationsFeedInsight}
                      stats={[
                        { label: 'Entries', value: adminData?.logs?.length || 0 },
                        { label: 'Alerts', value: adminData?.alerts?.length || 0 },
                        { label: 'Activity', value: adminData?.recentActivity?.length || 0 }
                      ]}
                    />
                    <QuickActionCard
                      title="Event Approvals"
                      description="Review the moderation queue and live event pipeline"
                      icon="CheckCircle"
                      color="#ec4899"
                      onClick={() => setCurrentView('approvals')}
                      secondaryLabel="Pipeline brief"
                      secondaryAction={openPipelineInsight}
                      stats={[
                        { label: 'Pending', value: adminData?.platform?.pendingApprovals || 0 },
                        { label: 'Queue', value: adminData?.platform?.pendingEvents?.length || 0 },
                        { label: 'Active', value: adminData?.platform?.activeEvents || 0 }
                      ]}
                    />
                    <QuickActionCard
                      title="Backup Monitor"
                      description="Track backup freshness, status, and recovery readiness"
                      icon="HardDrive"
                      color="#14b8a6"
                      onClick={() => setCurrentView('database')}
                      primaryLabel="Go to database"
                      secondaryLabel="Open backup brief"
                      secondaryAction={openDatabaseInsight}
                      stats={[
                        { label: 'Status', value: adminData?.database?.backupStatus || 'unknown' },
                        { label: 'Last', value: adminData?.database?.lastBackup || 'Never' },
                        { label: 'Runs', value: adminData?.database?.backupHistory?.length || 0 }
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Deep insights</p>
                      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Admin Intelligence Cards</h2>
                      <p className="text-sm text-slate-500 mt-1">Interactive operational cards with deep-dive modals and direct actions</p>
                    </div>
                    <button
                      onClick={() => {
                        fetchDashboardData();
                        fetchBusinessMetrics();
                        fetchSystemMetrics();
                        fetchDetailedSystemMetrics();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Icon name="RefreshCw" size={16} color="#374151" />
                      Refresh cards
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 hover:shadow-xl transition-all duration-200" style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-violet-100">
                            <Icon name="Database" size={22} color="#7c3aed" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Database Intelligence</h3>
                            <p className="text-sm text-gray-500">Core storage, backups, and query movement</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                          {adminData?.database?.backupStatus || 'unknown'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">DB Size</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.database?.size || '0 MB'}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Tables</p>
                          <p className="text-lg font-bold text-gray-900">{systemMetrics?.statistics?.totalTables || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Rows</p>
                          <p className="text-lg font-bold text-gray-900">{systemMetrics?.statistics?.totalRows || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Query rate</p>
                          <p className="text-lg font-bold text-gray-900">{getSystemMetricValue('database_query_rate')}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={openDatabaseInsight} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                          <Icon name="BarChart" size={15} color="#fff" />
                          View details
                        </button>
                        <button onClick={() => setCurrentView('database')} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          <Icon name="Database" size={15} color="#374151" />
                          Open workspace
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 hover:shadow-xl transition-all duration-200" style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-100">
                            <Icon name="Shield" size={22} color="#dc2626" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Security Watch</h3>
                            <p className="text-sm text-gray-500">Threat load, suspicious activity, and blocklist state</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          {adminData?.security?.suspiciousActivity || 0} alerts
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Failed logins</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.security?.failedLogins || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Blocked IPs</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.security?.blockedIPs || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Password resets</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.security?.passwordResets || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Security logs</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.security?.securityLogs?.length || 0}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={openSecurityInsight} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                          <Icon name="Shield" size={15} color="#fff" />
                          View threat brief
                        </button>
                        <button onClick={() => setCurrentView('security')} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          <Icon name="Lock" size={15} color="#374151" />
                          Open security center
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 hover:shadow-xl transition-all duration-200" style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-100">
                            <Icon name="Users" size={22} color="#4f46e5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">User Lifecycle</h3>
                            <p className="text-sm text-gray-500">Enrollment, role mix, and account health</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          +{adminData?.users?.newThisWeek || 0} this week
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Total users</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.users?.total || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Active</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.users?.active || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Admins</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.users?.admins || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Suspended</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.users?.suspended || 0}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={openUserInsight} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                          <Icon name="Users" size={15} color="#fff" />
                          View user brief
                        </button>
                        <button onClick={() => setCurrentView('users')} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          <Icon name="UserCheck" size={15} color="#374151" />
                          Manage users
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 hover:shadow-xl transition-all duration-200" style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-fuchsia-100">
                            <Icon name="CheckCircle" size={22} color="#c026d3" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Event Pipeline</h3>
                            <p className="text-sm text-gray-500">Moderation queue, active catalog, and throughput</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                          {adminData?.platform?.pendingApprovals || 0} pending
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Total events</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.platform?.totalEvents || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Active</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.platform?.activeEvents || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Pending</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.platform?.pendingApprovals || 0}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Queue</p>
                          <p className="text-lg font-bold text-gray-900">{adminData?.platform?.pendingEvents?.length || 0}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={openPipelineInsight} className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700">
                          <Icon name="CheckCircle" size={15} color="#fff" />
                          View pipeline brief
                        </button>
                        <button onClick={() => setCurrentView('approvals')} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          <Icon name="Edit" size={15} color="#374151" />
                          Open approvals
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid with Business Metrics Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Statistics */}
                  <div 
                    className="group bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
                    style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}
                    onClick={() => setCurrentView('users')}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">User ops</p>
                        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">User Statistics</h3>
                      </div>
                      <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {adminData?.users?.active || 0} active
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Users" size={20} color="#6366f1" />
                          <span className="text-sm font-medium text-gray-700">Total Users</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{adminData?.users?.total}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="UserCheck" size={20} color="#10b981" />
                          <span className="text-sm font-medium text-gray-700">Active Users</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">{adminData?.users?.active}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="TrendingUp" size={20} color="#f59e0b" />
                          <span className="text-sm font-medium text-gray-700">New This Week</span>
                        </div>
                        <span className="text-lg font-bold text-amber-600">+{adminData?.users?.newThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="UserX" size={20} color="#ef4444" />
                          <span className="text-sm font-medium text-gray-700">Suspended</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">{adminData?.users?.suspended}</span>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openUserInsight();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <Icon name="Users" size={16} color="#fff" />
                        View user brief
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentView('users');
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Icon name="UserCheck" size={16} color="#374151" />
                        Manage users
                      </button>
                    </div>
                  </div>

                  {/* System Performance Preview */}
                  <div 
                    className="group bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
                    style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}
                    onClick={() => setCurrentView('system-metrics')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Runtime</p>
                        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">System Performance</h3>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-green-700">LIVE DATA</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Cpu" size={20} color="#6366f1" />
                          <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {getSystemMetricValue('cpu_usage_percent')}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Memory" size={20} color="#10b981" />
                          <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          {getSystemMetricValue('memory_usage_percent')}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Database" size={20} color="#f59e0b" />
                          <span className="text-sm font-medium text-gray-700">Database Size</span>
                        </div>
                        <span className="text-lg font-bold text-amber-600">
                          {getSystemMetricValue('database_size_mb')} MB
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Activity" size={20} color="#ec4899" />
                          <span className="text-sm font-medium text-gray-700">Response Time</span>
                        </div>
                        <span className="text-lg font-bold text-pink-600">
                          {getSystemMetricValue('avg_response_time')} ms
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSystemRuntimeInsight();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <Icon name="Cpu" size={16} color="#fff" />
                        View runtime brief
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentView('system-metrics');
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Icon name="TrendingUp" size={16} color="#374151" />
                        Open metrics
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm" style={{ boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.34)' }}>
                  <div className="border-b border-slate-200 bg-slate-50/70 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Operations feed</p>
                        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Recent Activity</h3>
                        <p className="text-sm text-slate-500 mt-1">Live system activity feed</p>
                      </div>
                      <button
                        onClick={openOperationsFeedInsight}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Icon name="BarChart" size={14} color="#374151" />
                        View brief
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {adminData?.recentActivity?.map((activity, idx) => (
                      <ActivityItem key={idx} activity={activity} />
                    ))}
                    {(!adminData?.recentActivity || adminData.recentActivity.length === 0) && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentView === 'metrics' && <BusinessMetricsView />}
            {currentView === 'system-metrics' && <SystemMetricsView />}
            {currentView === 'users' && <UserManagementView />}
            {currentView === 'security' && <SecurityCenterView />}
            {currentView === 'approvals' && <EventApprovalsView />}
            {currentView === 'database' && <DatabaseManagementView />}
            {currentView === 'logs' && <SystemLogsView />}
          </div>
            </main>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      >
        {modalContent}
      </Modal>
    </>
  );
};

export default AdminToolsDashboard;

