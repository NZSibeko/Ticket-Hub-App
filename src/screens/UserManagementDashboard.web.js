// src/screens/UserManagementDashboard.web.js
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

// Tailwind + Animations
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
    .h-screen-dynamic { height: 100vh; height: 100dvh; }
  `;
  document.head.appendChild(style);
}

const Icon = memo(({ name, size = 20, color = '#000' }) => (
  <Ionicons name={name} size={size} color={color} />
));

const Modal = memo(({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleBackdrop = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn" onClick={handleBackdrop}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <Icon name="close" size={28} color="#6b7280" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
});

const UserManagementDashboard = () => {
  const { getAuthHeader } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'customer', phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const headers = getAuthHeader();
      const res = await axios.get(`${API_URL}/api/admin/users`, { headers });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Fetch failed, using mock data', err);
      setUsers([
        { id: 1, name: 'John Smith', email: 'john.smith@example.com', role: 'customer', status: 'active', joinDate: '2024-01-15', eventsAttended: 5 },
        { id: 2, name: 'Sarah Johnson', email: 'sarah.j@example.com', role: 'event_manager', status: 'active', joinDate: '2024-02-20', eventsAttended: 12 },
        { id: 3, name: 'Mike Wilson', email: 'mike.wilson@example.com', role: 'customer', status: 'inactive', joinDate: '2024-03-10', eventsAttended: 0 },
        { id: 4, name: 'Admin User', email: 'admin@tickethub.com', role: 'admin', status: 'active', joinDate: '2024-01-01', eventsAttended: 0 },
        { id: 5, name: 'Emily Davis', email: 'emily.davis@example.com', role: 'support', status: 'active', joinDate: '2024-02-05', eventsAttended: 3 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName?.trim() || !newUser.email?.trim() || !newUser.password?.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (newUser.password.length < 6) {
      Alert.alert('Error', 'Password must be 6+ characters');
      return;
    }

    const user = {
      id: Date.now(),
      name: `${newUser.firstName} ${newUser.lastName}`.trim(),
      email: newUser.email,
      role: newUser.role,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      eventsAttended: 0
    };

    setUsers(prev => [user, ...prev]);
    setShowCreateModal(false);
    setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'customer', phone: '' });
    Alert.alert('Success', 'User created successfully!');
  };

  const handleRoleChange = (userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setShowRoleModal(false);
    Alert.alert('Success', 'Role updated');
  };

  const toggleStatus = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  };

  // SAFE FILTERING - This is the fix!
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter(user => {
      if (!user) return false;
      const query = (searchQuery || '').toLowerCase();
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role || '').toLowerCase();

      const matchesSearch = name.includes(query) || email.includes(query);
      const matchesFilter = roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    if (!users.length) return { total: 0, active: 0, inactive: 0, byRole: {} };
    const total = users.length;
    const active = users.filter(u => u?.status === 'active').length;
    const byRole = users.reduce((acc, u) => {
      const role = u?.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    return { total, active, inactive: total - active, byRole };
  }, [users]);

  const pieData = Object.entries(stats.byRole).map(([role, count]) => ({
    name: role === 'event_manager' ? 'Event Manager' : role.charAt(0).toUpperCase() + role.slice(1),
    value: count,
    color: {
      admin: '#ef4444',
      event_manager: '#f59e0b',
      support: '#6366f1',
      customer: '#10b981'
    }[role] || '#94a3b8'
  }));

  const getRoleColor = (role) => ({
    admin: '#ef4444', event_manager: '#f59e0b', support: '#6366f1', customer: '#10b981'
  }[role] || '#94a3b8');

  if (loading) {
    return (
      <ScreenContainer>
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="mt-4 text-lg text-gray-600">Loading users...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="h-screen-dynamic bg-gray-50 flex flex-col">
        <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-5 py-3 rounded-xl flex-row items-center gap-2 hover:bg-indigo-700 transition"
          >
            <Icon name="person-add" size={20} color="white" />
            <Text className="text-white font-semibold">Create User</Text>
          </TouchableOpacity>
        </div>

        <ScrollView className="flex-1">
          <div className="p-6 space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: stats.total, icon: 'people', color: '#3b82f6' },
                { label: 'Active', value: stats.active, icon: 'checkmark-circle', color: '#10b981' },
                { label: 'Inactive', value: stats.inactive, icon: 'close-circle', color: '#ef4444' },
                { label: 'Growth', value: '+23%', icon: 'trending-up', color: '#8b5cf6' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold mt-2" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                    <div className="bg-opacity-10 p-4 rounded-xl" style={{ backgroundColor: stat.color + '20' }}>
                      <Icon name={stat.icon} size={28} color={stat.color} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Placeholder (Safe) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">User Growth</h3>
                <div className="space-y-3">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => (
                    <div key={m} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{m}</span>
                      <div className="w-32 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                        <div className="absolute h-full bg-indigo-600 rounded-full" style={{ width: `${[60,75,65,90,85,100][i]}%` }} />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{[12,19,15,25,22,30][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
                <div className="space-y-4">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-sm text-gray-700">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                          <div className="absolute h-full rounded-full" style={{ width: `${(d.value / users.length) * 100}%`, backgroundColor: d.color }} />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{d.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Search & List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Icon name="search" size={20} color="#64748b" style={{ position: 'absolute', left: 12, top: 14, zIndex: 10 }} />
                  <TextInput
                    placeholder="Search users..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="pl-12 pr-4 py-3 border rounded-xl w-full"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-3 border rounded-xl bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customer</option>
                  <option value="event_manager">Event Manager</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="bg-gray-50 p-4 rounded-xl flex items-center justify-between hover:bg-gray-100 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{user.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">{user.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: getRoleColor(user.role) + '20', color: getRoleColor(user.role) }}>
                          {user.role?.replace('_', ' ') || 'user'}
                        </span>
                        <span className={`text-sm font-medium ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                          {user.status || 'unknown'}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => { setSelectedUser(user); setShowRoleModal(true); }} className="p-2 hover:bg-gray-200 rounded-lg">
                            <Icon name="shield" size={20} color="#6366f1" />
                          </button>
                          <button onClick={() => toggleStatus(user.id)} className="p-2 hover:bg-gray-200 rounded-lg">
                            <Icon name={user.status === 'active' ? 'pause-circle' : 'play-circle'} size={20} color={user.status === 'active' ? '#ef4444' : '#10b981'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollView>

        {/* Modals */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New User">
          <div className="space-y-4">
            <input placeholder="First Name *" className="w-full px-4 py-3 border rounded-xl" value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} />
            <input placeholder="Last Name" className="w-full px-4 py-3 border rounded-xl" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} />
            <input placeholder="Email *" className="w-full px-4 py-3 border rounded-xl" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            <input placeholder="Password *" type="password" className="w-full px-4 py-3 border rounded-xl" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            <select className="w-full px-4 py-3 border rounded-xl" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
              <option value="customer">Customer</option>
              <option value="event_manager">Event Manager</option>
              <option value="support">Support</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button>
              <button onClick={handleCreateUser} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl">Create</button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Change Role">
          {selectedUser && (
            <div className="space-y-4">
              <p className="text-lg font-semibold">{selectedUser.name}</p>
              <div className="grid grid-cols-2 gap-3">
                {['customer', 'event_manager', 'support', 'admin'].map(role => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(selectedUser.id, role)}
                    className={`p-4 rounded-xl border ${selectedUser.role === role ? 'bg-indigo-600 text-white' : 'bg-gray-50'}`}
                  >
                    {role.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ScreenContainer>
  );
};

export default UserManagementDashboard; 