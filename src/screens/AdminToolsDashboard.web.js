import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const API_URL = 'http://localhost:8081'; // Updated to your backend port

// Add Tailwind CDN
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
  
  // Add custom styles for animations
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
  `;
  document.head.appendChild(style);
}

// Icon mapping from lucide-react to Ionicons
const iconMap = {
  Activity: 'pulse',
  AlertTriangle: 'warning',
  ArrowLeft: 'arrow-back',
  Ban: 'ban',
  CheckCircle: 'checkmark-circle',
  Clock: 'time',
  Database: 'server',
  Download: 'download',
  Edit: 'create',
  Lock: 'lock-closed',
  Mail: 'mail',
  RefreshCw: 'refresh',
  Search: 'search',
  Settings: 'settings',
  Shield: 'shield',
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
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real metrics data from API
      const response = await fetch(`${API_URL}/api/metrics/dashboard-metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch metrics');
      }
      
      // Transform API data to match expected format
      const metricsData = result.data;
      
      // Create alerts from system alerts
      const alerts = metricsData.alerts.map((alert, index) => ({
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
      }));
      
      // Create security logs
      const securityLogs = metricsData.security?.securityLogs?.map((log, index) => ({
        id: log.id || index + 1,
        type: log.type || 'Security Event',
        user: log.user || 'Unknown',
        ip: log.ip || 'N/A',
        time: log.time || 'Just now',
        severity: log.severity || 'info',
        details: log.details || 'Security event'
      })) || [];
      
      // Create blocked IPs list
      const blockedIPsList = metricsData.security?.blockedIPsList?.map((ip, index) => ({
        ip: ip.ip || `192.168.1.${index + 100}`,
        reason: ip.reason || 'Suspicious activity',
        blocked: ip.blocked || 'Recently',
        attempts: ip.attempts || 1
      })) || [];
      
      // Create recent activity
      const recentActivity = metricsData.recentActivity?.map((activity, index) => ({
        type: activity.type || 'activity',
        user: activity.user || 'System',
        time: activity.time || 'Just now',
        status: getActivityStatus(activity.type),
        details: activity.details || 'System activity'
      })) || [];
      
      // Create system logs
      const logs = metricsData.logs?.map((log, index) => ({
        id: log.id || index + 1,
        timestamp: log.timestamp || new Date().toISOString(),
        level: log.level || 'INFO',
        module: log.module || 'System',
        message: log.message || 'System log entry',
        user: log.user || 'system'
      })) || [];
      
      // Create pending events
      const pendingEvents = metricsData.platform?.pendingEvents?.map((event, index) => ({
        id: event.id || index + 1,
        name: event.name || 'Pending Event',
        organizer: event.organizer || 'Unknown',
        submitted: event.submitted || 'Recently',
        category: event.category || 'General',
        status: 'pending'
      })) || [];
      
      // Create backup history
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
          twoFactorEnabled: 0,
          passwordResets: metricsData.security?.passwordResets || 0,
          securityLogs,
          blockedIPsList
        },
        platform: {
          totalEvents: metricsData.platform?.totalEvents || 0,
          activeEvents: metricsData.platform?.activeEvents || 0,
          pendingApprovals: metricsData.platform?.pendingApprovals || 0,
          reportedIssues: 0,
          resolvedIssues: 0,
          averageResolutionTime: '0 hours',
          pendingEvents
        },
        database: {
          size: metricsData.database?.size || '0 MB',
          backupStatus: metricsData.database?.backupStatus || 'pending',
          lastBackup: metricsData.database?.lastBackup || 'Never',
          queries: 0,
          slowQueries: 0,
          backupHistory
        },
        settings: {
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
        alerts: alerts.length > 0 ? alerts : [
          {
            id: 1,
            type: 'system',
            title: 'System Monitoring Active',
            message: 'Metrics collection is running',
            severity: 'low',
            time: 'Just now',
            count: 1,
            icon: 'CheckCircle',
            color: '#10b981',
            details: 'System metrics are being collected successfully.',
            affectedItems: ['metrics_service'],
            recommendations: ['Review collected metrics', 'Check system logs']
          }
        ]
      };
      
      setAdminData(transformedData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError(error.message);
      // Fallback to minimal data structure
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

  // Helper functions
  const getAlertIcon = (type) => {
    switch(type) {
      case 'security': return 'AlertTriangle';
      case 'system': return 'Database';
      case 'platform': return 'Activity';
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon name="XCircle" size={24} color="#6b7280" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>,
      document.body
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
                          const response = await fetch(`${API_URL}/api/metrics/blocked-ips`);
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
                // Acknowledge alert via API
                if (alert.id) {
                  fetch(`${API_URL}/api/metrics/alert/${alert.id}/acknowledge`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                      'Content-Type': 'application/json'
                    }
                  });
                }
                setModalOpen(false);
                fetchAdminData(); // Refresh data
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

  const QuickActionCard = ({ title, description, icon, color, onClick }) => (
    <button
      onClick={onClick}
      className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all text-left w-full hover:scale-[1.02] active:scale-[0.98] h-full"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${color}20` }}>
          <Icon name={icon} size={24} color={color} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </button>
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
                        await fetch(`${API_URL}/api/metrics/blocked-ip/${item.ip}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        fetchAdminData(); // Refresh data
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

  const EventApprovalsView = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Event Approvals</h2>
        <p className="text-sm text-gray-500 mt-1">Review and approve pending events</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{adminData?.platform?.pendingApprovals}</span> events waiting for approval
          </p>
        </div>
        <div className="divide-y divide-gray-200 flex-1 overflow-auto">
          {adminData?.platform?.pendingEvents?.map((event) => (
            <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{event.name}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500 mb-3">
                    <span>Organizer: {event.organizer}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Category: {event.category}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Submitted {event.submitted}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                      <Icon name="CheckCircle" size={16} />
                      Approve
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
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
    </div>
  );

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

  return (
    <>
      <div className="h-screen-dynamic bg-gray-50 overflow-hidden flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {currentView !== 'dashboard' && (
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon name="ArrowLeft" size={20} color="#4b5563" />
                </button>
              )}
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {currentView === 'dashboard' && 'Admin Control Center'}
                  {currentView === 'users' && 'User Management'}
                  {currentView === 'security' && 'Security Center'}
                  {currentView === 'approvals' && 'Event Approvals'}
                  {currentView === 'database' && 'Database Management'}
                  {currentView === 'logs' && 'System Logs'}
                  {currentView === 'settings' && 'Platform Settings'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {currentView === 'dashboard' && 'System administration and monitoring'}
                  {currentView === 'users' && 'Manage user accounts and permissions'}
                  {currentView === 'security' && 'Monitor security events'}
                  {currentView === 'approvals' && 'Review and approve events'}
                  {currentView === 'database' && 'Database operations'}
                  {currentView === 'logs' && 'System activity logs'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAdminData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <Icon name="RefreshCw" size={20} color="#4b5563" />
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">API Error: {error}</p>
              <p className="text-red-500 text-xs">Check if backend is running on {API_URL}</p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 h-full overflow-auto">
            {currentView === 'dashboard' && (
              <div className="space-y-6 h-full">
                {/* Updated Alert Cards Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">System Alerts</h2>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-blue-700">SYSTEM MONITORING</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminData?.alerts?.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                    {(!adminData?.alerts || adminData.alerts.length === 0) && (
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-center py-8">
                          <Icon name="CheckCircle" size={48} color="#10b981" className="mx-auto mb-4" />
                          <p className="text-gray-600">No active alerts</p>
                          <p className="text-sm text-gray-500">System is running normally</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Health */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">System Health</h2>
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-green-700">SYSTEM STATUS</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {healthItems.map((item) => (
                      <SystemHealthCard key={item.title} {...item} />
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                      title="User Management"
                      description="Manage users, roles, and permissions"
                      icon="Users"
                      color="#6366f1"
                      onClick={() => setCurrentView('users')}
                    />
                    <QuickActionCard
                      title="Security Center"
                      description="Monitor security and access controls"
                      icon="Shield"
                      color="#ef4444"
                      onClick={() => setCurrentView('security')}
                    />
                    <QuickActionCard
                      title="Event Approvals"
                      description={`${adminData?.platform?.pendingApprovals || 0} events pending review`}
                      icon="CheckCircle"
                      color="#f59e0b"
                      onClick={() => setCurrentView('approvals')}
                    />
                    <QuickActionCard
                      title="Database Management"
                      description="Backups and maintenance"
                      icon="Database"
                      color="#8b5cf6"
                      onClick={() => setCurrentView('database')}
                    />
                    <QuickActionCard
                      title="System Logs"
                      description="View and analyze system activity logs"
                      icon="Activity"
                      color="#0ea5e9"
                      onClick={() => setCurrentView('logs')}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Statistics */}
                  <div 
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setCurrentView('users')}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">User Statistics</h3>
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
                  </div>

                  {/* Security Overview */}
                  <div 
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setCurrentView('security')}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Security Overview</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="AlertTriangle" size={20} color="#ef4444" />
                          <span className="text-sm font-medium text-gray-700">Failed Logins</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">{adminData?.security?.failedLogins}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Shield" size={20} color="#f59e0b" />
                          <span className="text-sm font-medium text-gray-700">Blocked IPs</span>
                        </div>
                        <span className="text-lg font-bold text-amber-600">{adminData?.security?.blockedIPs}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="Mail" size={20} color="#6366f1" />
                          <span className="text-sm font-medium text-gray-700">Password Resets</span>
                        </div>
                        <span className="text-lg font-bold text-indigo-600">{adminData?.security?.passwordResets}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                    <p className="text-sm text-gray-500 mt-1">Live system activity feed</p>
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

            {currentView === 'users' && <UserManagementView />}
            {currentView === 'security' && <SecurityCenterView />}
            {currentView === 'approvals' && <EventApprovalsView />}
            {currentView === 'database' && <DatabaseManagementView />}
            {currentView === 'logs' && <SystemLogsView />}
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