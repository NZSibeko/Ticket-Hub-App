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
  XCircle: 'close-circle',
  BarChart: 'bar-chart',
  PieChart: 'pie-chart',
  Calendar: 'calendar',
  Globe: 'globe'
};

const Icon = ({ name, size = 20, color = '#000', style, className = '' }) => {
  const iconName = iconMap[name] || name;
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <Ionicons name={iconName} size={size} color={color} />
    </span>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children, wide = false }) => {
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
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] flex flex-col`} 
        onClick={(e) => e.stopPropagation()}
      >
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

const UserManagementDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);

  // Create User Modal State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'customer',
    phone: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const mockData = {
      stats: {
        total: 2847,
        active: 1923,
        inactive: 924,
        suspended: 12,
        newThisWeek: 156,
        growthRate: 12.3
      },
      analytics: {
        roleDistribution: { Customer: 68, 'Event Manager': 22, Admin: 10 },
        weeklyGrowth: [98, 112, 134, 156, 142, 168, 156],
        geographic: { 'South Africa': 72, USA: 15, UK: 8, Other: 5 },
        loginTrend: { today: 892, yesterday: 834, avg: 765 }
      },
      userList: [
        { id: 1, name: 'John Smith', email: 'john@example.com', role: 'Customer', status: 'active', joined: '2024-01-15', lastActive: '2 hours ago', avatar: 'JS', country: 'South Africa' },
        { id: 2, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Event Manager', status: 'active', joined: '2024-02-20', lastActive: '5 min ago', avatar: 'SW', country: 'USA' },
        { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Customer', status: 'inactive', joined: '2024-03-10', lastActive: '2 days ago', avatar: 'MJ', country: 'South Africa' },
        { id: 4, name: 'Emma Davis', email: 'emma@example.com', role: 'Admin', status: 'active', joined: '2023-12-01', lastActive: '1 hour ago', avatar: 'ED', country: 'UK' },
        { id: 5, name: 'Alex Brown', email: 'alex@example.com', role: 'Customer', status: 'suspended', joined: '2024-04-05', lastActive: '1 week ago', avatar: 'AB', country: 'South Africa' },
        { id: 6, name: 'Lisa Anderson', email: 'lisa@example.com', role: 'Event Manager', status: 'active', joined: '2024-01-28', lastActive: '10 min ago', avatar: 'LA', country: 'USA' },
        { id: 7, name: 'Tom Wilson', email: 'tom@example.com', role: 'Customer', status: 'active', joined: '2024-05-12', lastActive: '30 min ago', avatar: 'TW', country: 'South Africa' },
        { id: 8, name: 'Kate Miller', email: 'kate@example.com', role: 'Customer', status: 'active', joined: '2024-03-22', lastActive: '3 hours ago', avatar: 'KM', country: 'UK' }
      ],
      recentActivity: [
        { type: 'user_registered', user: 'John Smith', time: '5 min ago', status: 'success' },
        { type: 'user_login', user: 'Sarah Wilson', time: '12 min ago', status: 'success' },
        { type: 'user_suspended', user: 'Alex Brown', time: '1 hour ago', status: 'error' },
        { type: 'role_changed', user: 'Emma Davis', time: '2 hours ago', status: 'info' },
        { type: 'password_reset', user: 'Mike Johnson', time: '3 hours ago', status: 'warning' }
      ]
    };

    setUserData(mockData);
    setLoading(false);
  };

  const resetCreateUserForm = () => {
    setCreateUserData({
      firstName: '', lastName: '', email: '', password: '', role: 'customer', phone: ''
    });
  };

  const handleCreateUser = async () => {
    if (!createUserData.firstName || !createUserData.lastName || !createUserData.email || !createUserData.password) {
      alert('Please fill in all required fields');
      return;
    }
    if (createUserData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setCreateUserLoading(true);
    setTimeout(() => {
      const roleDisplay = createUserData.role === 'customer' ? 'Customer' : 
                         createUserData.role === 'event_manager' ? 'Event Manager' : 
                         createUserData.role === 'support' ? 'Support Team' : 'Administrator';

      const newUser = {
        id: Date.now(),
        name: `${createUserData.firstName} ${createUserData.lastName}`,
        email: createUserData.email,
        role: roleDisplay,
        status: 'active',
        joined: new Date().toISOString().split('T')[0],
        lastActive: 'Just now',
        avatar: createUserData.firstName[0].toUpperCase() + createUserData.lastName[0].toUpperCase(),
        country: 'South Africa'
      };

      setUserData(prev => ({
        ...prev,
        userList: [newUser, ...prev.userList],
        stats: { 
          ...prev.stats, 
          total: prev.stats.total + 1, 
          active: prev.stats.active + 1, 
          newThisWeek: prev.stats.newThisWeek + 1 
        },
        recentActivity: [{
          type: 'user_registered',
          user: newUser.name,
          time: 'Just now',
          status: 'success'
        }, ...prev.recentActivity.slice(0, 4)]
      }));

      setShowCreateUserModal(false);
      resetCreateUserForm();
      setCreateUserLoading(false);
      alert('User created successfully!');
    }, 1000);
  };

  const openModal = (title, content, wide = false) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  // Updated User Modal to match AdminToolsDashboard structure
  const openUserModal = (user) => {
    openModal('User Details', (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
            {user.avatar}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        
        {/* User Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Role</p>
              <p className="text-gray-900">{user.role}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Status</p>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                user.status === 'active' ? 'bg-green-100 text-green-800' :
                user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-700">Country</p>
              <p className="text-gray-900">{user.country}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Joined</p>
              <p className="text-gray-900">{user.joined}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Last Active</p>
              <p className="text-gray-900">{user.lastActive}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon name="Mail" size={16} color="#6366f1" />
                  <span>Send Message</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon name="Lock" size={16} color="#10b981" />
                  <span>Reset Password</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon name="Edit" size={16} color="#f59e0b" />
                  <span>Edit Profile</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon name={user.status === 'suspended' ? 'Unlock' : 'Ban'} size={16} color={user.status === 'suspended' ? '#10b981' : '#ef4444'} />
                  <span>{user.status === 'suspended' ? 'Activate User' : 'Suspend User'}</span>
                </div>
              </button>
            </div>
          </div>

          {/* User Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">User Details</h4>
            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="font-medium text-gray-900">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  user.status === 'active' ? 'text-green-600' :
                  user.status === 'inactive' ? 'text-gray-600' :
                  'text-red-600'
                }`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium text-gray-900">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since:</span>
                <span className="font-medium text-gray-900">{user.joined}</span>
              </div>
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
              // Add specific action here
              setModalOpen(false);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    ));
  };

  // Updated Analytics Cards to match AdminToolsDashboard style
  const AnalyticsCard = ({ title, value, icon, color, trend, onClick }) => (
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
      {trend && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-600 font-medium">{trend}</span>
          <span className="text-gray-500">vs last week</span>
        </div>
      )}
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
      user_login: 'Lock', 
      user_suspended: 'Ban', 
      role_changed: 'Settings', 
      password_reset: 'Mail' 
    };
    const iconName = typeIcons[activity.type] || 'Activity';

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusColors[activity.status || 'info']}`}>
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

  const getRoleColor = (role) => {
    const lower = role.toLowerCase();
    if (lower.includes('admin')) return '#ef4444';
    if (lower.includes('event') || lower.includes('manager')) return '#f59e0b';
    if (lower.includes('support')) return '#6366f1';
    return '#10b981';
  };

  if (loading) {
    return (
      <div className="h-screen-dynamic bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto mb-4">
            <Icon name="RefreshCw" size={32} color="#6366f1" />
          </div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = userData.userList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const analyticsCards = [
    {
      title: 'Role Distribution',
      value: '3 Roles',
      icon: 'PieChart',
      color: '#8b5cf6',
      onClick: () => openModal('Role Distribution', (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(userData.analytics.roleDistribution).map(([role, perc]) => (
              <div key={role} className="text-center">
                <div className="text-4xl font-bold text-gray-900">{perc}%</div>
                <div className="text-sm text-gray-600 mt-1">{role}</div>
                <div className="mt-2 bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full" style={{width: `${perc}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))
    },
    {
      title: 'Weekly Growth',
      value: '+156',
      icon: 'BarChart',
      color: '#3b82f6',
      trend: '+12.3%',
      onClick: () => openModal('Weekly User Growth', (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="flex items-end gap-2 h-40">
            {userData.analytics.weeklyGrowth.map((val, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg" style={{height: `${(val/200)*100}%`}}>
                <span className="text-xs text-white text-center block mt-1">{val}</span>
              </div>
            ))}
          </div>
        </div>
      ))
    },
    {
      title: 'Geographic Reach',
      value: '4 Regions',
      icon: 'Globe',
      color: '#10b981',
      onClick: () => openModal('Users by Country', (
        <div className="space-y-4">
          {Object.entries(userData.analytics.geographic).map(([country, perc]) => (
            <div key={country}>
              <div className="flex justify-between text-sm">
                <span>{country}</span>
                <span className="font-medium">{perc}%</span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-4">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-4 rounded-full transition-all" style={{width: `${perc}%`}}></div>
              </div>
            </div>
          ))}
        </div>
      ))
    },
    {
      title: 'Login Activity',
      value: userData.analytics.loginTrend.today.toString(),
      icon: 'Activity',
      color: '#f59e0b',
      trend: `+${((userData.analytics.loginTrend.today - userData.analytics.loginTrend.yesterday)/userData.analytics.loginTrend.yesterday*100).toFixed(1)}%`,
      onClick: () => openModal('Login Trends', (
        <div className="text-center space-y-4">
          <div className="text-5xl font-bold text-amber-600">{userData.analytics.loginTrend.today}</div>
          <p className="text-gray-600">Logins Today</p>
          <div className="flex justify-center gap-8 text-sm">
            <div><span className="font-medium">Yesterday:</span> {userData.analytics.loginTrend.yesterday}</div>
            <div><span className="font-medium">7-day Avg:</span> {userData.analytics.loginTrend.avg}</div>
          </div>
        </div>
      ))
    }
  ];

  return (
    <>
      <div className="h-screen-dynamic bg-gray-50 overflow-hidden flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">Real-time insights and user control center</p>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Icon name="UserCheck" size={16} color="white" />
              Create User
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 h-full overflow-auto">
            <div className="space-y-6 h-full">
              {/* Primary Stats */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Key Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'Total Users', value: userData.stats.total.toLocaleString(), icon: 'Users', color: '#6366f1', trend: `+${userData.stats.growthRate}%` },
                    { title: 'Active Users', value: userData.stats.active.toLocaleString(), icon: 'UserCheck', color: '#10b981', trend: '+8%' },
                    { title: 'New This Week', value: `+${userData.stats.newThisWeek}`, icon: 'TrendingUp', color: '#f59e0b', trend: '+12%' },
                    { title: 'Suspended', value: userData.stats.suspended.toString(), icon: 'UserX', color: '#ef4444', trend: '+2%' },
                  ].map((stat, i) => (
                    <AnalyticsCard key={i} {...stat} />
                  ))}
                </div>
              </div>

              {/* Interactive Analytics Cards */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analyticsCards.map((card, i) => (
                    <AnalyticsCard key={i} {...card} />
                  ))}
                </div>
              </div>

              {/* Search & Filter */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Icon name="Search" size={20} color="#9ca3af" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* User List & Activity */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">All Users ({filteredUsers.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {filteredUsers.map(user => (
                      <div 
                        key={user.id} 
                        onClick={() => openUserModal(user)}
                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700">{user.role}</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' :
                            user.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {user.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {userData.recentActivity.map((a, i) => <ActivityItem key={i} activity={a} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreateUserModal} onClose={() => { setShowCreateUserModal(false); resetCreateUserForm(); }} title="Create New User" wide={true}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Enter first name" 
                value={createUserData.firstName} 
                onChange={e => setCreateUserData({...createUserData, firstName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Enter last name" 
                value={createUserData.lastName} 
                onChange={e => setCreateUserData({...createUserData, lastName: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
            <input 
              type="email" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Enter email" 
              value={createUserData.email} 
              onChange={e => setCreateUserData({...createUserData, email: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Minimum 6 characters" 
              value={createUserData.password} 
              onChange={e => setCreateUserData({...createUserData, password: e.target.value})} 
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Optional" 
              value={createUserData.phone} 
              onChange={e => setCreateUserData({...createUserData, phone: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">User Role *</label>
            <div className="grid grid-cols-2 gap-3">
              {['customer', 'event_manager', 'support', 'admin'].map(role => (
                <button
                  key={role}
                  onClick={() => setCreateUserData({...createUserData, role})}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                    createUserData.role === role ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: getRoleColor(role) + '20'}}>
                    <Icon name="Shield" size={20} color={getRoleColor(role)} />
                  </div>
                  <span className="font-medium text-gray-900">
                    {role === 'customer' ? 'Customer' : role === 'event_manager' ? 'Event Manager' : role === 'support' ? 'Support Team' : 'Administrator'}
                  </span>
                  {createUserData.role === role && <Icon name="CheckCircle" size={24} color="#6366f1" className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button 
              onClick={() => { setShowCreateUserModal(false); resetCreateUserForm(); }} 
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              disabled={createUserLoading}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {createUserLoading ? (
                <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
              ) : (
                <>
                  <Icon name="UserCheck" size={20} color="white" />
                  Create User
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Other Modals */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
        {modalContent}
      </Modal>
    </>
  );
};

export default UserManagementDashboard;