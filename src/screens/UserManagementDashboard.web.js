// src/screens/UserManagementDashboard.web.js
// FINAL VERSION — Full Screen Fit + Smooth Scrolling (No Visual Changes)
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ===================================================================
// CONFIGURATION
// ===================================================================
const API_BASE = 'http://localhost:8081';
const TOKEN = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

// Tailwind CDN + Full-Screen & Scroll Fix
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);

  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { 
      height: 100%; 
      margin: 0; 
      padding: 0; 
      overflow: hidden; 
    }
    .h-screen-full { 
      height: 100vh; 
      height: 100dvh; 
    }
    .scrollbar-thin::-webkit-scrollbar { 
      width: 6px; 
    }
    .scrollbar-thin::-webkit-scrollbar-track { 
      background: transparent; 
    }
    .scrollbar-thin::-webkit-scrollbar-thumb { 
      background: #cbd5e1; 
      border-radius: 3px; 
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover { 
      background: #94a3b8; 
    }
  `;
  document.head.appendChild(style);
}

// Icon mapping (unchanged)
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

// Modal Component (unchanged)
const Modal = ({ isOpen, onClose, title, children, wide = false }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon name="XCircle" size={24} color="#6b7280" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
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

  // Create User Modal
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

  // ===================================================================
  // FETCH REAL DASHBOARD DATA FROM BACKEND
  // ===================================================================
  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/dashboard`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const json = await res.json();
      if (json.success && json.data) {
        setUserData(json.data);
      } else {
        alert(json.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      alert('Failed to connect to backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (TOKEN) {
      fetchUserData();
    } else {
      alert('No authentication token found. Please log in as admin/manager.');
      setLoading(false);
    }
  }, []);

  // ===================================================================
  // CREATE USER - REAL API CALL
  // ===================================================================
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
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: createUserData.firstName.trim(),
          lastName: createUserData.lastName.trim(),
          email: createUserData.email.trim().toLowerCase(),
          password: createUserData.password,
          role: createUserData.role,
          phone: createUserData.phone || null
        })
      });

      const json = await res.json();

      if (json.success) {
        const newUser = json.user;
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
          }, ...prev.recentActivity.slice(0, 9)]
        }));

        setShowCreateUserModal(false);
        resetCreateUserForm();
        alert('User created successfully!');
      } else {
        alert(json.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Create user error:', err);
      alert('Network error. Please try again.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const resetCreateUserForm = () => {
    setCreateUserData({
      firstName: '', lastName: '', email: '', password: '', role: 'customer', phone: ''
    });
  };

  // ===================================================================
  // FILTERING
  // ===================================================================
  const filteredUsers = userData?.userList?.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#8b5cf6';
      case 'event_manager': return '#3b82f6';
      case 'support': return '#10b981';
      default: return '#6366f1';
    }
  };

  const openUserModal = (user) => {
    setModalTitle('User Details');
    setModalContent(
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user.avatar}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-sm text-gray-500">Role</p><p className="font-semibold">{user.role}</p></div>
          <div><p className="text-sm text-gray-500">Status</p><span className={`px-3 py-1 rounded-full text-sm font-bold ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span></div>
          <div><p className="text-sm text-gray-500">Joined</p><p className="font-semibold">{user.joined}</p></div>
          <div><p className="text-sm text-gray-500">Last Active</p><p className="font-semibold">{user.lastActive}</p></div>
          <div><p className="text-sm text-gray-500">Country</p><p className="font-semibold">{user.country}</p></div>
        </div>
      </div>
    );
    setModalOpen(true);
  };

  const ActivityItem = ({ activity }) => {
    const icons = { user_registered: 'UserCheck', user_login: 'Lock', user_suspended: 'Ban', role_changed: 'Shield', password_reset: 'RefreshCw' };
    const colors = { success: 'text-green-600 bg-green-100', error: 'text-red-600 bg-red-100', warning: 'text-yellow-600 bg-yellow-100', info: 'text-blue-600 bg-blue-100' };
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors[activity.status] || 'bg-gray-100 text-gray-600'}`}>
          <Icon name={icons[activity.type] || 'Activity'} size={20} color="currentColor" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{activity.user} <span className="text-gray-500 font-normal">{activity.type.replace('_', ' ')}</span></p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin"><Icon name="RefreshCw" size={48} color="#6366f1" /></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="h-screen-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Icon name="AlertTriangle" size={64} color="#ef4444" />
          <p className="mt-4 text-xl font-bold text-gray-800">Failed to load data</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* FULL SCREEN CONTAINER WITH PROPER SCROLLING */}
      <div className="h-screen-full bg-gray-50 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
            >
              <Icon name="UserCheck" size={20} />
              Create New User
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: userData.stats.total, icon: 'Users', color: 'indigo' },
                { label: 'Active Users', value: userData.stats.active, icon: 'CheckCircle', color: 'green' },
                { label: 'New This Week', value: userData.stats.newThisWeek, icon: 'TrendingUp', color: 'blue' },
                { label: 'Suspended', value: userData.stats.suspended || 0, icon: 'Ban', color: 'red' }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-100`}>
                      <Icon name={stat.icon} size={28} color={`#${stat.color === 'indigo' ? '6366f1' : stat.color === 'green' ? '10b981' : stat.color === 'blue' ? '3b82f6' : 'ef4444'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Users + Activity */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">All Users ({filteredUsers.length})</h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto scrollbar-thin">
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
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
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
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {userData.recentActivity?.map((a, i) => <ActivityItem key={i} activity={a} />)}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <Modal isOpen={showCreateUserModal} onClose={() => { setShowCreateUserModal(false); resetCreateUserForm(); }} title="Create New User" wide={true}>
        {/* Your original modal content — unchanged */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter first name" value={createUserData.firstName} onChange={e => setCreateUserData({...createUserData, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter last name" value={createUserData.lastName} onChange={e => setCreateUserData({...createUserData, lastName: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
            <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter email" value={createUserData.email} onChange={e => setCreateUserData({...createUserData, email: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
            <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Minimum 6 characters" value={createUserData.password} onChange={e => setCreateUserData({...createUserData, password: e.target.value})} />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional" value={createUserData.phone} onChange={e => setCreateUserData({...createUserData, phone: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">User Role *</label>
            <div className="grid grid-cols-2 gap-3">
              {['customer', 'event_manager', 'support', 'admin'].map(role => (
                <button
                  key={role}
                  onClick={() => setCreateUserData({...createUserData, role})}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${createUserData.role === role ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
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
            <button onClick={() => { setShowCreateUserModal(false); resetCreateUserForm(); }} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
        {modalContent}
      </Modal>
    </>
  );
};

export default UserManagementDashboard;