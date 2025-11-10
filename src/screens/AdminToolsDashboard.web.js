import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const API_URL = 'http://localhost:3000';

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

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAdminData = async () => {
    try {
      const mockData = {
        systemHealth: {
          status: 'healthy',
          uptime: '99.8%',
          lastIncident: '12 days ago',
          responseTime: '145ms'
        },
        users: {
          total: 2847,
          active: 1923,
          inactive: 924,
          newThisWeek: 156,
          suspended: 12,
          admins: 8,
          eventManagers: 45,
          customers: 2794,
          growthRate: 12.3,
          userList: [
            { id: 1, name: 'John Smith', email: 'john@example.com', role: 'Customer', status: 'active', joined: '2024-01-15', lastActive: '2 hours ago' },
            { id: 2, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Event Manager', status: 'active', joined: '2024-02-20', lastActive: '5 min ago' },
            { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Customer', status: 'inactive', joined: '2024-03-10', lastActive: '2 days ago' },
            { id: 4, name: 'Emma Davis', email: 'emma@example.com', role: 'Admin', status: 'active', joined: '2023-12-01', lastActive: '1 hour ago' },
            { id: 5, name: 'Alex Brown', email: 'alex@example.com', role: 'Customer', status: 'suspended', joined: '2024-04-05', lastActive: '1 week ago' },
            { id: 6, name: 'Lisa Anderson', email: 'lisa@example.com', role: 'Event Manager', status: 'active', joined: '2024-01-28', lastActive: '10 min ago' },
            { id: 7, name: 'Tom Wilson', email: 'tom@example.com', role: 'Customer', status: 'active', joined: '2024-05-12', lastActive: '30 min ago' },
            { id: 8, name: 'Kate Miller', email: 'kate@example.com', role: 'Customer', status: 'active', joined: '2024-03-22', lastActive: '3 hours ago' }
          ]
        },
        security: {
          failedLogins: 23,
          suspiciousActivity: 5,
          blockedIPs: 18,
          twoFactorEnabled: 67.8,
          passwordResets: 89,
          securityLogs: [
            { id: 1, type: 'Failed Login', user: 'unknown@example.com', ip: '192.168.1.100', time: '5 min ago', severity: 'high' },
            { id: 2, type: 'Suspicious Activity', user: 'test@example.com', ip: '10.0.0.50', time: '15 min ago', severity: 'medium' },
            { id: 3, type: 'IP Blocked', user: 'spam@example.com', ip: '172.16.0.1', time: '1 hour ago', severity: 'high' },
            { id: 4, type: 'Password Reset', user: 'john@example.com', ip: '192.168.1.50', time: '2 hours ago', severity: 'low' },
            { id: 5, type: 'Failed Login', user: 'admin@example.com', ip: '203.0.113.0', time: '3 hours ago', severity: 'high' }
          ],
          blockedIPsList: [
            { ip: '192.168.1.100', reason: 'Brute force attack', blocked: '2 hours ago', attempts: 45 },
            { ip: '10.0.0.50', reason: 'Suspicious activity', blocked: '5 hours ago', attempts: 12 },
            { ip: '172.16.0.1', reason: 'Multiple failed logins', blocked: '1 day ago', attempts: 28 }
          ]
        },
        platform: {
          totalEvents: 456,
          activeEvents: 34,
          pendingApprovals: 7,
          reportedIssues: 12,
          resolvedIssues: 145,
          averageResolutionTime: '2.4 hours',
          pendingEvents: [
            { id: 1, name: 'Tech Summit 2025', organizer: 'TechCorp', submitted: '2 hours ago', category: 'Technology', status: 'pending' },
            { id: 2, name: 'Music Festival', organizer: 'EventPro', submitted: '5 hours ago', category: 'Music', status: 'pending' },
            { id: 3, name: 'Art Exhibition', organizer: 'Gallery Inc', submitted: '1 day ago', category: 'Arts', status: 'pending' },
            { id: 4, name: 'Food Expo', organizer: 'Culinary Co', submitted: '1 day ago', category: 'Food', status: 'pending' }
          ]
        },
        database: {
          size: '24.5 GB',
          backupStatus: 'completed',
          lastBackup: '2 hours ago',
          queries: 45678,
          slowQueries: 12,
          backupHistory: [
            { date: '2024-11-08 02:00', size: '24.5 GB', duration: '12 min', status: 'success' },
            { date: '2024-11-07 02:00', size: '24.2 GB', duration: '11 min', status: 'success' },
            { date: '2024-11-06 02:00', size: '23.9 GB', duration: '10 min', status: 'success' },
            { date: '2024-11-05 02:00', size: '23.6 GB', duration: '12 min', status: 'success' }
          ]
        },
        settings: {
          platformName: 'EventPro',
          maintenanceMode: false,
          registrationEnabled: true,
          emailNotifications: true,
          twoFactorRequired: false,
          maxUploadSize: '10 MB',
          sessionTimeout: '30 minutes'
        },
        logs: [
          { id: 1, timestamp: '2024-11-08 14:30:45', level: 'INFO', module: 'Auth', message: 'User login successful', user: 'john@example.com' },
          { id: 2, timestamp: '2024-11-08 14:28:12', level: 'WARNING', module: 'Security', message: 'Failed login attempt', user: 'unknown' },
          { id: 3, timestamp: '2024-11-08 14:25:33', level: 'INFO', module: 'Events', message: 'New event created', user: 'sarah@example.com' },
          { id: 4, timestamp: '2024-11-08 14:20:18', level: 'ERROR', module: 'Database', message: 'Slow query detected', user: 'system' },
          { id: 5, timestamp: '2024-11-08 14:15:42', level: 'INFO', module: 'Payment', message: 'Payment processed', user: 'mike@example.com' }
        ],
        recentActivity: [
          { type: 'user_registered', user: 'John Smith', time: '5 min ago', status: 'success' },
          { type: 'event_approved', user: 'Admin Team', time: '12 min ago', status: 'success' },
          { type: 'failed_login', user: 'Unknown', time: '18 min ago', status: 'warning' },
          { type: 'password_reset', user: 'Sarah Wilson', time: '25 min ago', status: 'info' },
          { type: 'user_suspended', user: 'Admin Team', time: '1 hour ago', status: 'error' }
        ],
        alerts: [
          { 
            id: 1,
            type: 'security', 
            title: 'Security Alert',
            message: 'Multiple failed login attempts detected', 
            severity: 'high', 
            time: '10 min ago',
            count: 23,
            icon: 'AlertTriangle',
            color: '#ef4444',
            details: '23 failed login attempts from 5 different IP addresses in the last hour. 3 IPs have been automatically blocked.',
            affectedItems: ['192.168.1.100', '10.0.0.50', '203.0.113.0'],
            recommendations: ['Review security logs', 'Check IP block list', 'Enable 2FA for admin accounts']
          },
          { 
            id: 2,
            type: 'system', 
            title: 'Backup Status',
            message: 'Database backup completed successfully', 
            severity: 'low', 
            time: '2 hours ago',
            count: 1,
            icon: 'CheckCircle',
            color: '#10b981',
            details: 'Automated nightly backup completed successfully. Backup size: 24.5 GB, Duration: 12 minutes. All tables backed up without errors.',
            affectedItems: ['users_table', 'events_table', 'payments_table'],
            recommendations: ['Verify backup integrity', 'Test restore process', 'Update backup schedule if needed']
          },
          { 
            id: 3,
            type: 'platform', 
            title: 'Pending Events',
            message: '7 events pending approval', 
            severity: 'medium', 
            time: '3 hours ago',
            count: 7,
            icon: 'Clock',
            color: '#f59e0b',
            details: '7 events are awaiting admin approval. Average wait time: 4.2 hours. 2 events have been waiting for more than 6 hours.',
            affectedItems: ['Tech Summit 2025', 'Music Festival', 'Art Exhibition', 'Food Expo'],
            recommendations: ['Review pending events', 'Set up auto-approval rules', 'Notify event organizers']
          }
        ]
      };

      setAdminData(mockData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
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
                    <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Icon name="Ban" size={16} color="#ef4444" />
                        <span>Block Suspicious IPs</span>
                      </div>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Icon name="AlertTriangle" size={16} color="#ef4444" />
                        <span>Review Failed Logins</span>
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
                        <span>View Backup History</span>
                      </div>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Icon name="Settings" size={16} color="#10b981" />
                        <span>Schedule New Backup</span>
                      </div>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Icon name="Download" size={16} color="#10b981" />
                        <span>Download Latest Backup</span>
                      </div>
                    </button>
                  </>
                )}
                {alert.type === 'platform' && (
                  <>
                    <button 
                      onClick={() => {
                        setCurrentView('approvals');
                        setModalOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <Icon name="CheckCircle" size={16} color="#f59e0b" />
                        <span>Review Pending Events</span>
                      </div>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Icon name="Users" size={16} color="#f59e0b" />
                        <span>Bulk Approve Events</span>
                      </div>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Icon name="Activity" size={16} color="#f59e0b" />
                        <span>View Event Queue</span>
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
                  <span className="text-gray-600">Count:</span>
                  <span className="font-medium text-gray-900">{alert.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">{alert.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">{alert.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-yellow-600">Active</span>
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
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Dismiss Alert
            </button>
            <button 
              onClick={() => {
                if (alert.type === 'security') setCurrentView('security');
                if (alert.type === 'platform') setCurrentView('approvals');
                if (alert.type === 'system') setCurrentView('database');
                setModalOpen(false);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              View Full Details
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

  // Test function to verify modal is working
  const testModal = () => {
    setModalTitle('Test Modal');
    setModalContent(
      <div className="space-y-4">
        <div className="text-center">
          <Icon name="CheckCircle" size={48} color="#10b981" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Modal is Working!</h3>
          <p className="text-gray-600">The modal system is functioning correctly.</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            If you're not seeing alert cards, check the console for errors and ensure the adminData is loading properly.
          </p>
        </div>
        <button 
          onClick={() => setModalOpen(false)}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Close Modal
        </button>
      </div>
    );
    setModalOpen(true);
  };

  // Open modal with user details
  const openUserModal = (user) => {
    setModalTitle('User Details');
    setModalContent(
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Name:</span> {user.name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.role}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  user.status === 'active' ? 'bg-green-100 text-green-800' :
                  user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {user.status}
                </span>
              </p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Activity Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Joined:</span> {user.joined}</p>
              <p><span className="font-medium">Last Active:</span> {user.lastActive}</p>
              <p><span className="font-medium">User ID:</span> {user.id}</p>
            </div>
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Send Message
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              Reset Password
            </button>
            <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors">
              Edit Profile
            </button>
            {user.status === 'suspended' ? (
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                Activate User
              </button>
            ) : (
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                Suspend User
              </button>
            )}
          </div>
        </div>
      </div>
    );
    setModalOpen(true);
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

  const openHealthModal = (item) => {
    const statusConfig = {
      healthy: { label: 'Operational', color: 'green' },
      warning: { label: 'Degraded', color: 'yellow' },
      issues: { label: 'Issues', color: 'red' }
    };
    const config = statusConfig[item.status];

    let targetView = '';
    if (item.title === 'Uptime' || item.title === 'Response Time' || item.title === 'Last Incident') {
      targetView = 'logs';
    } else if (item.title === 'Database') {
      targetView = 'database';
    }

    setModalTitle(item.title);
    setModalContent(
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${item.color}20` }}>
            <Icon name={item.icon} size={24} color={item.color} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500">Current status: {config.label}</p>
          </div>
        </div>
        
        {/* Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">{item.details}</p>
        </div>

        {/* Affected Items */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Affected Components</h4>
          <div className="flex flex-wrap gap-2">
            {item.affectedItems?.map((comp, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {comp}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  if (targetView) setCurrentView(targetView);
                  setModalOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Icon name="Activity" size={16} color={item.color} />
                  <span>View Related Logs</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon name="Settings" size={16} color={item.color} />
                  <span>Run Diagnostics</span>
                </div>
              </button>
              {item.title === 'Database' && (
                <button 
                  onClick={() => {
                    setCurrentView('database');
                    setModalOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="Database" size={16} color={item.color} />
                    <span>Manage Database</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Status Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Status Details</h4>
            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  item.status === 'healthy' ? 'text-green-600' :
                  item.status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {config.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Value:</span>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {item.recommendations?.map((rec, index) => (
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
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={() => {
              if (targetView) setCurrentView(targetView);
              setModalOpen(false);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            View Full Details
          </button>
        </div>
      </div>
    );
    setModalOpen(true);
  };

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
      user_suspended: 'UserX'
    };

    const iconName = typeIcons[activity.type] || 'Activity';

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusColors[activity.status]}`}>
          <Icon name={iconName} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{activity.user}</p>
          <p className="text-xs text-gray-500 capitalize">{activity.type.replace(/_/g, ' ')}</p>
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
                    onClick={() => openUserModal(user)}
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
                        <button 
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserModal(user);
                          }}
                        >
                          <Icon name="Edit" size={16} color="#4b5563" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          {user.status === 'suspended' ? (
                            <Icon name="Unlock" size={16} color="#10b981" />
                          ) : (
                            <Icon name="Ban" size={16} color="#ef4444" />
                          )}
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
          <p className="text-sm text-gray-500 mb-1">2FA Enabled</p>
          <p className="text-2xl font-bold text-green-600">{adminData?.security?.twoFactorEnabled}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Suspicious Activity</p>
          <p className="text-2xl font-bold text-red-600">{adminData?.security?.suspiciousActivity}</p>
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
                  <button className="text-xs text-red-600 hover:text-red-700 font-medium">Unblock</button>
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
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      View Details
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
          <p className="text-sm text-gray-500 mb-1">Total Queries</p>
          <p className="text-2xl font-bold text-indigo-600">{adminData?.database?.queries?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Slow Queries</p>
          <p className="text-2xl font-bold text-amber-600">{adminData?.database?.slowQueries}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-sm text-gray-500 mb-1">Last Backup</p>
          <p className="text-sm font-bold text-green-600">{adminData?.database?.lastBackup}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors hover:scale-[1.02] active:scale-[0.98]">
            Create Backup Now
          </button>
          <button className="p-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors hover:scale-[1.02] active:scale-[0.98]">
            Optimize Tables
          </button>
          <button className="p-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors hover:scale-[1.02] active:scale-[0.98]">
            View Full Logs
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Backup History</h3>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adminData?.database?.backupHistory?.map((backup, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-4 text-sm text-gray-900">{backup.date}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{backup.size}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{backup.duration}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {backup.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                      <Icon name="Download" size={16} className="inline" />
                    </button>
                  </td>
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
            <option>Payment</option>
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

  const SettingsView = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure platform-wide settings</p>
      </div>

      <div className="space-y-6 flex-1 overflow-auto pr-2">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">General Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Platform Name</p>
                <p className="text-sm text-gray-500">The name displayed across the platform</p>
              </div>
              <input
                type="text"
                defaultValue={adminData?.settings?.platformName}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-500">Temporarily disable public access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={adminData?.settings?.maintenanceMode} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Security Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">User Registration</p>
                <p className="text-sm text-gray-500">Allow new users to register</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={adminData?.settings?.registrationEnabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Require 2FA for all users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={adminData?.settings?.twoFactorRequired} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Session Timeout</p>
                <p className="text-sm text-gray-500">Auto logout after inactivity</p>
              </div>
              <select className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>15 minutes</option>
                <option selected>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notification Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Send system email notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={adminData?.settings?.emailNotifications} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 sticky bottom-0 bg-gray-50 p-4 rounded-lg mt-4">
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Save Changes
        </button>
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
        </div>
      </div>
    );
  }

  const healthItems = [
    {
      title: 'Uptime',
      value: adminData?.systemHealth?.uptime || '99.8%',
      status: 'healthy',
      icon: 'Activity',
      color: '#10b981',
      details: 'System uptime is calculated based on the last 30 days of operation. Current status is optimal with no downtime recorded in the past week.',
      affectedItems: ['Web Server', 'Database Server', 'API Endpoints'],
      recommendations: ['Monitor server logs', 'Check resource usage', 'Schedule maintenance']
    },
    {
      title: 'Response Time',
      value: adminData?.systemHealth?.responseTime || '145ms',
      status: 'healthy',
      icon: 'TrendingUp',
      color: '#6366f1',
      details: 'Average response time for API calls and page loads. Measured over the last 24 hours. Current performance is within acceptable limits.',
      affectedItems: ['Frontend', 'Backend API', 'Database Queries'],
      recommendations: ['Optimize slow queries', 'Check network latency', 'Scale resources if needed']
    },
    {
      title: 'Database',
      value: adminData?.database?.size || '24.5 GB',
      status: 'healthy',
      icon: 'Database',
      color: '#f59e0b',
      details: 'Current database size and status. Includes all tables and indexes. Growth rate is normal.',
      affectedItems: ['Users Table', 'Events Table', 'Logs Table'],
      recommendations: ['Run optimization', 'Check disk space', 'Schedule backups']
    },
    {
      title: 'Last Incident',
      value: adminData?.systemHealth?.lastIncident || '12 days ago',
      status: 'healthy',
      icon: 'Clock',
      color: '#ec4899',
      details: 'Time since the last system incident or downtime. No major issues reported recently.',
      affectedItems: ['None'],
      recommendations: ['Review incident reports', 'Update emergency procedures', 'Test failover']
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
                  {currentView === 'settings' && 'Platform configuration'}
                </p>
              </div>
            </div>
            {currentView === 'dashboard' && (
              <div className="flex items-center gap-2">
                {/* Test Modal Button - Remove in production */}
                <button
                  onClick={testModal}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Test Modal
                </button>
                <div className="hidden sm:flex gap-2 bg-gray-100 p-1 rounded-lg">
                  {['today', 'week', 'month'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        timeRange === range
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 h-full overflow-auto">
            {currentView === 'dashboard' && (
              <div className="space-y-6 h-full">
                {/* Debug Info - Remove in production */}
                {!adminData?.alerts && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      No alerts data found. Check the mockData structure in fetchAdminData.
                    </p>
                  </div>
                )}

                {/* Updated Alert Cards Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">System Alerts</h2>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-blue-700">ACTIVE ALERTS</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminData?.alerts?.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>

                {/* System Health */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">System Health</h2>
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-green-700">ALL SYSTEMS OPERATIONAL</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {healthItems.map((item) => (
                      <SystemHealthCard key={item.title} {...item} onClick={() => openHealthModal(item)} />
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
                      title="Platform Settings"
                      description="Configure platform-wide settings"
                      icon="Settings"
                      color="#10b981"
                      onClick={() => setCurrentView('settings')}
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
                      description="Backups, optimization, and maintenance"
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
                        <span className="text-lg font-bold text-gray-900">{adminData?.users?.total?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon name="UserCheck" size={20} color="#10b981" />
                          <span className="text-sm font-medium text-gray-700">Active Users</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">{adminData?.users?.active?.toLocaleString()}</span>
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
                          <Icon name="Lock" size={20} color="#10b981" />
                          <span className="text-sm font-medium text-gray-700">2FA Enabled</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">{adminData?.security?.twoFactorEnabled}%</span>
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
                  </div>
                </div>
              </div>
            )}

            {currentView === 'users' && <UserManagementView />}
            {currentView === 'security' && <SecurityCenterView />}
            {currentView === 'approvals' && <EventApprovalsView />}
            {currentView === 'database' && <DatabaseManagementView />}
            {currentView === 'logs' && <SystemLogsView />}
            {currentView === 'settings' && <SettingsView />}
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