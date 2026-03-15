// src/screens/UserManagementDashboard.web.js - FIXED WITH ALL STYLE FIXES
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

  // Fix for React Native Web warnings - UPDATED
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
    /* Fix for React Native Web warnings - UPDATED */
    .shadow-fix {
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    }
    .text-shadow-fix {
      text-shadow: none !important;
    }
    .outline-fix {
      outline: none !important;
    }
    /* Remove problematic React Native Web props */
    [style*="shadowOffset"] { 
      box-shadow: none !important;
    }
    [style*="textShadowOffset"] { 
      text-shadow: none !important;
    }
    [style*="outlineWidth"] { 
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Icon mapping
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
  Globe: 'globe',
  Send: 'send',
  Key: 'key',
  Person: 'person',
  Power: 'power',
  Notifications: 'notifications',
  Trash: 'trash',
  AlertCircle: 'alert-circle',
  User: 'person-circle',
  SwapHorizontal: 'swap-horizontal'
};

// FIXED Icon component with proper style handling
const Icon = ({ name, size = 20, color = '#000', style = {}, className = '' }) => {
  const iconName = iconMap[name] || name;
  
  // Create a safe style object without React Native Web warnings
  const safeStyle = { ...style };
  
  // Convert React Native shadow props to CSS boxShadow if present
  if (safeStyle.shadowColor || safeStyle.shadowOffset || safeStyle.shadowOpacity || safeStyle.shadowRadius) {
    const shadowColor = safeStyle.shadowColor || 'rgba(0, 0, 0, 0.25)';
    const offset = safeStyle.shadowOffset || { width: 0, height: 2 };
    const radius = safeStyle.shadowRadius || 3;
    const opacity = safeStyle.shadowOpacity || 0.25;
    
    // Convert RGBA color with opacity
    let rgbaColor;
    if (shadowColor.startsWith('rgba')) {
      rgbaColor = shadowColor;
    } else if (shadowColor.startsWith('rgb')) {
      rgbaColor = shadowColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    } else {
      // Handle hex or named colors
      rgbaColor = `rgba(0, 0, 0, ${opacity})`;
    }
    
    safeStyle.boxShadow = `${offset.width}px ${offset.height}px ${radius}px ${rgbaColor}`;
    
    // Remove the original props
    delete safeStyle.shadowColor;
    delete safeStyle.shadowOffset;
    delete safeStyle.shadowOpacity;
    delete safeStyle.shadowRadius;
  }
  
  // Convert text shadow props if present
  if (safeStyle.textShadowColor || safeStyle.textShadowOffset || safeStyle.textShadowRadius) {
    const color = safeStyle.textShadowColor || 'rgba(0, 0, 0, 0.75)';
    const offset = safeStyle.textShadowOffset || { width: 0, height: 1 };
    const radius = safeStyle.textShadowRadius || 1;
    
    safeStyle.textShadow = `${offset.width}px ${offset.height}px ${radius}px ${color}`;
    
    delete safeStyle.textShadowColor;
    delete safeStyle.textShadowOffset;
    delete safeStyle.textShadowRadius;
  }
  
  // Handle outline
  if (safeStyle.outlineWidth || safeStyle.outlineColor || safeStyle.outlineStyle) {
    const width = safeStyle.outlineWidth || '1px';
    const color = safeStyle.outlineColor || 'currentColor';
    const style = safeStyle.outlineStyle || 'solid';
    
    safeStyle.outline = `${width} ${style} ${color}`;
    
    delete safeStyle.outlineWidth;
    delete safeStyle.outlineColor;
    delete safeStyle.outlineStyle;
  }
  
  // Remove any remaining problematic props
  const excludedProps = ['shadowOffset', 'shadowRadius', 'shadowColor', 'shadowOpacity', 
                         'textShadowOffset', 'textShadowRadius', 'textShadowColor',
                         'outlineWidth', 'outlineColor', 'outlineStyle', 'outline'];
  
  excludedProps.forEach(prop => {
    if (safeStyle[prop]) {
      delete safeStyle[prop];
    }
  });
  
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...safeStyle }}>
      <Ionicons name={iconName} size={size} color={color} />
    </span>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children, wide = false }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className={`relative w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} max-h-[92vh] flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl`} 
        style={{ boxShadow: '0 32px 90px -30px rgba(15, 23, 42, 0.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-7 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">User operations</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100">
            <Icon name="XCircle" size={24} color="#6b7280" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white p-7 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Custom Confirmation Modal
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning"
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: 'AlertTriangle',
      iconColor: '#f59e0b',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
    },
    danger: {
      icon: 'AlertCircle',
      iconColor: '#ef4444',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      buttonColor: 'bg-red-500 hover:bg-red-600'
    },
    info: {
      icon: 'AlertCircle',
      iconColor: '#3b82f6',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      buttonColor: 'bg-blue-500 hover:bg-blue-600'
    },
    success: {
      icon: 'CheckCircle',
      iconColor: '#10b981',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    }
  };

  const config = typeConfig[type] || typeConfig.warning;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl" style={{ boxShadow: '0 28px 70px -28px rgba(15, 23, 42, 0.45)' }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Execution approval</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mb-4`}>
              <Icon name={config.icon} size={32} color={config.iconColor} />
            </div>
            <div className={`text-sm ${config.textColor} mb-6`}>{message}</div>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 ${config.buttonColor} text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2`}
              >
                <Icon name={type === 'success' ? 'CheckCircle' : 'AlertTriangle'} size={20} color="white" />
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Custom Success Modal
const SuccessModal = ({ 
  isOpen, 
  onClose, 
  title = "Success!", 
  message, 
  buttonText = "OK",
  duration = 3000 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl" style={{ boxShadow: '0 28px 70px -28px rgba(15, 23, 42, 0.45)' }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Execution complete</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Icon name="CheckCircle" size={32} color="#10b981" />
            </div>
            <div className="text-sm text-gray-600 mb-6">{message}</div>
            
            <button
              onClick={onClose}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="CheckCircle" size={20} color="white" />
              {buttonText}
            </button>
          </div>
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
  const [error, setError] = useState(null);
  
  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  
  // Confirmation and Success Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'customer',
    phone: ''
  });

  const [editUserData, setEditUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: ''
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [messageData, setMessageData] = useState({
    subject: '',
    message: '',
    method: 'email'
  });

  const [changeRoleData, setChangeRoleData] = useState({
    newRole: '',
    currentRole: ''
  });

  const [actionLoading, setActionLoading] = useState({
    suspend: false,
    edit: false,
    reset: false,
    send: false,
    changeRole: false,
    delete: false
  });

  // ===================================================================
  // SIMPLE AND ROBUST DATE HANDLING FUNCTIONS
  // ===================================================================
  
  // Simple function to handle relative time strings
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'Never';
    
    // If it's already a relative time string, return it
    if (typeof timeString === 'string') {
      const lowerTime = timeString.toLowerCase();
      if (lowerTime.includes('just now') || 
          lowerTime.includes('mins ago') || 
          lowerTime.includes('hours ago') || 
          lowerTime.includes('days ago') || 
          lowerTime.includes('weeks ago') || 
          lowerTime.includes('months ago') || 
          lowerTime.includes('years ago') ||
          lowerTime.includes('never') ||
          lowerTime.includes('recently')) {
        // Capitalize first letter
        return timeString.charAt(0).toUpperCase() + timeString.slice(1);
      }
      
      // Try to parse as date
      try {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          const diffWeeks = Math.floor(diffDays / 7);

          if (diffMins < 1) return 'Just now';
          if (diffMins < 60) return `${diffMins} mins ago`;
          if (diffHours < 24) return `${diffHours} hours ago`;
          if (diffDays < 7) return `${diffDays} days ago`;
          if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
          
          // If more than a month, show date
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: diffDays > 365 ? 'numeric' : undefined
          });
        }
      } catch (err) {
        // If parsing fails, return original string
        return timeString;
      }
    }
    
    // Default fallback
    return 'Never';
  };

  // Simple function for user last active
  const formatUserLastActive = (user) => {
    if (!user) return 'Never';
    
    // Check various possible fields
    const possibleFields = ['lastActive', 'last_login', 'lastActiveTime', 'lastLogin'];
    
    for (const field of possibleFields) {
      if (user[field]) {
        const formatted = formatTimeDisplay(user[field]);
        if (formatted !== 'Never') {
          return formatted;
        }
      }
    }
    
    // If user has a joined date, estimate based on that
    if (user.joined) {
      try {
        const joinDate = new Date(user.joined);
        if (!isNaN(joinDate.getTime())) {
          const now = new Date();
          const diffDays = Math.floor((now - joinDate) / 86400000);
          
          // If joined recently (last 7 days), show "Recently"
          if (diffDays < 7) {
            return 'Recently';
          }
          // If joined more than a week ago, show date
          return joinDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          });
        }
      } catch (err) {
        // Continue to next option
      }
    }
    
    return 'Never';
  };

  // ===================================================================
  // FETCH REAL DASHBOARD DATA FROM BACKEND
  // ===================================================================
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || TOKEN;
      if (!token) {
        setError('No authentication token found. Please log in as admin/manager.');
        setLoading(false);
        return;
      }

      console.log('Fetching dashboard with token:', token ? 'Token exists' : 'No token');

      const response = await fetch(`${API_BASE}/api/admin/users/dashboard`, {
        method: 'GET',
        credentials: 'include',
headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token');
          return;
        }
        throw new Error(data.error || 'Failed to load data');
      }

      if (data.success && data.data) {
        setUserData(data.data);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to connect to server. Is backend running on port 8081?');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to show alerts
  const showAlert = (title, message) => {
    setConfirmAction({
      type: 'alert',
      title,
      message,
      onConfirm: () => setShowConfirmModal(false)
    });
    setShowConfirmModal(true);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // ===================================================================
  // USER ACTION FUNCTIONS
  // ===================================================================
  
  // 1. DELETE USER FUNCTION
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Show confirmation modal
    setConfirmAction({
      type: 'deleteUser',
      title: 'Delete User Account',
      message: `Are you absolutely sure you want to delete ${selectedUser?.name}'s account? This action will:
      
- Permanently remove the user from the database
- Delete all associated records and data
- Cannot be undone
- User will lose all access immediately

Type "DELETE" to confirm:`,
      confirmText: 'Delete User',
      confirmColor: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setShowDeleteUserModal(true);
      }
    });
    
    setShowConfirmModal(true);
  };

  // State for delete confirmation text
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // 2. Confirm Delete with Typing
  const handleConfirmDelete = async (confirmationText) => {
    if (confirmationText !== 'DELETE') {
      showAlert('Confirmation Error', 'Please type "DELETE" exactly as shown to confirm deletion.');
      return;
    }

    setActionLoading(prev => ({ ...prev, delete: true }));

    try {
      console.log(`Deleting user ${selectedUser.id} from database`);
      
      const token = localStorage.getItem('token') || TOKEN;
      const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/delete`, {
        method: 'DELETE',
        credentials: 'include',
headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is OK
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`User not found or API endpoint not available (404).`);
        }
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      // Try to parse JSON
      let json;
      try {
        const text = await res.text();
        json = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned invalid JSON response');
      }

      if (json.success) {
        // Update local state - remove user from list
        setUserData(prev => ({
          ...prev,
          userList: prev.userList.filter(user => user.id !== selectedUser.id),
          stats: {
            ...prev.stats,
            total: prev.stats.total - 1,
            active: selectedUser.status === 'active' ? prev.stats.active - 1 : prev.stats.active,
            suspended: selectedUser.status === 'suspended' ? (prev.stats.suspended || 0) - 1 : (prev.stats.suspended || 0)
          },
          recentActivity: [{
            type: 'user_deleted',
            user: selectedUser.name,
            time: 'Just now',
            status: 'warning',
            details: `User account permanently deleted from system`
          }, ...prev.recentActivity.slice(0, 9)]
        }));

        // Show success modal
        setSuccessMessage(`User "${selectedUser.name}" has been permanently deleted from the system. All associated data has been removed.`);
        setShowSuccessModal(true);
        setShowDeleteUserModal(false);
        setShowUserDetailsModal(false);
      } else {
        showAlert('Error', json.error || 'Failed to delete user account');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      showAlert('Network Error', err.message || 'Failed to delete user. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, delete: false }));
      // Reset delete confirmation
      setDeleteConfirmationText('');
    }
  };

  // 3. Change User Role
  const handleChangeRole = async () => {
    if (!changeRoleData.newRole) {
      showAlert('Validation Error', 'Please select a new role');
      return;
    }

    if (changeRoleData.newRole === changeRoleData.currentRole) {
      showAlert('Validation Error', 'User already has this role');
      return;
    }

    // Show confirmation modal
    setConfirmAction({
      type: 'changeRole',
      title: 'Change User Role',
      message: `Are you sure you want to change ${selectedUser?.name}'s role from ${changeRoleData.currentRole} to ${changeRoleData.newRole}? This will affect their permissions and access.`,
      confirmText: 'Change Role',
      confirmColor: 'info',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setActionLoading(prev => ({ ...prev, changeRole: true }));

        try {
          console.log(`Changing role for user ${selectedUser.id} to ${changeRoleData.newRole}`);
          
          const token = localStorage.getItem('token') || TOKEN;
          const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/change-role`, {
            method: 'PUT',
        credentials: 'include',
headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              newRole: changeRoleData.newRole 
            })
          });

          // Check if response is OK
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error(`API endpoint not found (404). Please ensure the server is running and the endpoint exists.`);
            }
            throw new Error(`Server returned ${res.status}: ${res.statusText}`);
          }

          // Try to parse JSON
          let json;
          try {
            const text = await res.text();
            json = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            throw new Error('Server returned invalid JSON response');
          }

          if (json.success) {
            // Update local state
            const updatedUser = json.user;
            const roleDisplay = changeRoleData.newRole === 'customer' ? 'Customer' : 
                               (changeRoleData.newRole === 'manager' || changeRoleData.newRole === 'event_manager') ? 'Manager' :
                               (changeRoleData.newRole === 'omni_support_consultant' || changeRoleData.newRole === 'support') ? 'Omni Support Consultant' :
                               changeRoleData.newRole === 'event_support_consultant' ? 'Event Support Consultant' :
                               changeRoleData.newRole === 'event_organizer' ? 'Event Organizer' : 'Admin';
            
            const newAvatar = (updatedUser.first_name?.[0] || selectedUser.name?.[0] || 'A') + 
                            (updatedUser.last_name?.[0] || selectedUser.name?.split(' ')[1]?.[0] || 'A');
            
            setUserData(prev => ({
              ...prev,
              userList: prev.userList.map(user => 
                user.id === selectedUser.id 
                  ? { 
                      ...user, 
                      role: roleDisplay,
                      name: updatedUser.name || user.name,
                      avatar: newAvatar.toUpperCase(),
                      first_name: updatedUser.first_name || user.first_name,
                      last_name: updatedUser.last_name || user.last_name,
                      displayLastActive: 'Just now' // Update last active
                    }
                  : user
              ),
              recentActivity: [{
                type: 'role_changed',
                user: selectedUser.name,
                time: 'Just now',
                status: 'success',
                details: `Role changed from ${changeRoleData.currentRole} to ${roleDisplay}`
              }, ...prev.recentActivity.slice(0, 9)]
            }));

            // Show success modal
            setSuccessMessage(`User role has been changed successfully from ${changeRoleData.currentRole} to ${roleDisplay}.`);
            setShowSuccessModal(true);
            setShowChangeRoleModal(false);
          } else {
            showAlert('Error', json.error || 'Failed to change user role');
          }
        } catch (err) {
          console.error('Change role error:', err);
          showAlert('Network Error', err.message || 'Failed to change user role. Please try again.');
        } finally {
          setActionLoading(prev => ({ ...prev, changeRole: false }));
        }
      }
    });
    
    setShowConfirmModal(true);
  };

  // 4. Suspend/Activate User
  const handleSuspendActivate = async (userId, currentStatus) => {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    
    // Show confirmation modal
    setConfirmAction({
      type: 'suspendActivate',
      userId,
      action,
      title: action === 'suspend' ? 'Suspend User' : 'Activate User',
      message: action === 'suspend' 
        ? 'Are you sure you want to suspend this user? They will not be able to log in until activated.'
        : 'Are you sure you want to activate this user? They will regain access to their account.',
      confirmText: action === 'suspend' ? 'Suspend User' : 'Activate User',
      confirmColor: action === 'suspend' ? 'danger' : 'success',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setActionLoading(prev => ({ ...prev, suspend: true }));

        try {
          const token = localStorage.getItem('token') || TOKEN;
          const res = await fetch(`${API_BASE}/api/admin/users/${userId}/suspend`, {
            method: 'PUT',
        credentials: 'include',
headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
          });

          const json = await res.json();

          if (json.success) {
            // Update local state
            setUserData(prev => ({
              ...prev,
              userList: prev.userList.map(user => 
                user.id === userId 
                  ? { 
                      ...user, 
                      status: action === 'suspend' ? 'suspended' : 'active',
                      displayLastActive: 'Just now'
                    }
                  : user
              ),
              stats: {
                ...prev.stats,
                active: action === 'suspend' ? prev.stats.active - 1 : prev.stats.active + 1,
                suspended: action === 'suspend' ? (prev.stats.suspended || 0) + 1 : Math.max(0, (prev.stats.suspended || 0) - 1)
              },
              recentActivity: [{
                type: action === 'suspend' ? 'user_suspended' : 'user_activated',
                user: json.user?.name || 'User',
                time: 'Just now',
                status: 'success'
              }, ...prev.recentActivity.slice(0, 9)]
            }));

            // Show success modal
            setSuccessMessage(
              action === 'suspend' 
                ? 'User has been suspended successfully. They will not be able to log in until activated.'
                : 'User has been activated successfully. They can now log in to their account.'
            );
            setShowSuccessModal(true);
            
            // Close details modal if open
            setShowUserDetailsModal(false);
          } else {
            showAlert('Error', json.error || `Failed to ${action} user`);
          }
        } catch (err) {
          console.error(`${action} user error:`, err);
          showAlert('Network Error', 'Failed to update user status. Please try again.');
        } finally {
          setActionLoading(prev => ({ ...prev, suspend: false }));
        }
      }
    });
    
    setShowConfirmModal(true);
  };

  // 5. Edit User Profile
  const handleEditProfile = async () => {
    if (!selectedUser || !editUserData.firstName || !editUserData.lastName || !editUserData.email) {
      showAlert('Validation Error', 'Please fill in all required fields');
      return;
    }

    // Show confirmation modal
    setConfirmAction({
      type: 'editProfile',
      title: 'Update User Profile',
      message: 'Are you sure you want to update this user\'s profile information?',
      confirmText: 'Update Profile',
      confirmColor: 'info',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setActionLoading(prev => ({ ...prev, edit: true }));

        try {
          const token = localStorage.getItem('token') || TOKEN;
          const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/update`, {
            method: 'PUT',
        credentials: 'include',
headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(editUserData)
          });

          const json = await res.json();

          if (json.success) {
            // Update local state
            const updatedName = `${editUserData.firstName} ${editUserData.lastName}`;
            const avatar = (editUserData.firstName[0] + editUserData.lastName[0]).toUpperCase();
            
            setUserData(prev => ({
              ...prev,
              userList: prev.userList.map(user => 
                user.id === selectedUser.id 
                  ? { 
                      ...user, 
                      name: updatedName,
                      email: editUserData.email,
                      phone: editUserData.phone || 'Not provided',
                      avatar,
                      first_name: editUserData.firstName,
                      last_name: editUserData.lastName,
                      displayLastActive: 'Just now'
                    }
                  : user
              ),
              recentActivity: [{
                type: 'profile_updated',
                user: updatedName,
                time: 'Just now',
                status: 'success'
              }, ...prev.recentActivity.slice(0, 9)]
            }));

            // Show success modal
            setSuccessMessage('User profile has been updated successfully.');
            setShowSuccessModal(true);
            setShowEditUserModal(false);
          } else {
            showAlert('Error', json.error || 'Failed to update user profile');
          }
        } catch (err) {
          console.error('Edit profile error:', err);
          showAlert('Network Error', 'Failed to update user profile. Please try again.');
        } finally {
          setActionLoading(prev => ({ ...prev, edit: false }));
        }
      }
    });
    
    setShowConfirmModal(true);
  };

  // 6. Reset Password
  const handleResetPassword = async () => {
    if (!resetPasswordData.newPassword || resetPasswordData.newPassword.length < 6) {
      showAlert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      showAlert('Validation Error', 'Passwords do not match');
      return;
    }

    // Show confirmation modal
    setConfirmAction({
      type: 'resetPassword',
      title: 'Reset Password',
      message: 'Are you sure you want to reset this user\'s password? They will need to use the new password to log in.',
      confirmText: 'Reset Password',
      confirmColor: 'warning',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setActionLoading(prev => ({ ...prev, reset: true }));

        try {
          const token = localStorage.getItem('token') || TOKEN;
          const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/reset-password`, {
            method: 'PUT',
        credentials: 'include',
headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword: resetPasswordData.newPassword })
          });

          const json = await res.json();

          if (json.success) {
            // Show success modal
            setSuccessMessage('Password has been reset successfully. The user will need to use the new password for their next login.');
            setShowSuccessModal(true);
            setShowResetPasswordModal(false);
            setResetPasswordData({ newPassword: '', confirmPassword: '' });
          } else {
            showAlert('Error', json.error || 'Failed to reset password');
          }
        } catch (err) {
          console.error('Reset password error:', err);
          showAlert('Network Error', 'Failed to reset password. Please try again.');
        } finally {
          setActionLoading(prev => ({ ...prev, reset: false }));
        }
      }
    });
    
    setShowConfirmModal(true);
  };

  // 7. Send Message
  const handleSendMessage = async () => {
    if (!messageData.subject || !messageData.message) {
      showAlert('Validation Error', 'Please fill in subject and message');
      return;
    }

    // Show confirmation modal
    setConfirmAction({
      type: 'sendMessage',
      title: 'Send Message',
      message: `Are you sure you want to send this ${messageData.method} to ${selectedUser?.name}?`,
      confirmText: `Send ${messageData.method === 'email' ? 'Email' : 'Notification'}`,
      confirmColor: 'info',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setActionLoading(prev => ({ ...prev, send: true }));

        try {
          const token = localStorage.getItem('token') || TOKEN;
          const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/send-message`, {
            method: 'POST',
        credentials: 'include',
headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
          });

          const json = await res.json();

          if (json.success) {
            // Update recent activity
            setUserData(prev => ({
              ...prev,
              recentActivity: [{
                type: 'message_sent',
                user: selectedUser.name,
                time: 'Just now',
                status: 'success',
                details: `${messageData.method === 'email' ? 'Email' : 'Notification'} sent: ${messageData.subject}`
              }, ...prev.recentActivity.slice(0, 9)]
            }));

            // Show success modal
            setSuccessMessage(json.message || `${messageData.method === 'email' ? 'Email' : 'Notification'} has been sent successfully.`);
            setShowSuccessModal(true);
            setShowSendMessageModal(false);
            setMessageData({ subject: '', message: '', method: 'email' });
          } else {
            showAlert('Error', json.error || 'Failed to send message');
          }
        } catch (err) {
          console.error('Send message error:', err);
          showAlert('Network Error', 'Failed to send message. Please try again.');
        } finally {
          setActionLoading(prev => ({ ...prev, send: false }));
        }
      }
    });
    
    setShowConfirmModal(true);
  };

  // 8. Create User
  const handleCreateUser = async () => {
    if (!createUserData.firstName || !createUserData.lastName || !createUserData.email || !createUserData.password) {
      showAlert('Validation Error', 'Please fill in all required fields');
      return;
    }
    if (createUserData.password.length < 6) {
      showAlert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    // Show confirmation modal
    setConfirmAction({
      type: 'createUser',
      title: 'Create New User',
      message: `Are you sure you want to create a new ${createUserData.role} account for ${createUserData.firstName} ${createUserData.lastName}?`,
      confirmText: 'Create User',
      confirmColor: 'success',
      onConfirm: async () => {
        setShowConfirmModal(false);
        setCreateUserLoading(true);
        
        try {
          const token = localStorage.getItem('token') || TOKEN;
          const res = await fetch(`${API_BASE}/api/admin/users/create`, {
            method: 'POST',
        credentials: 'include',
headers: {
              'Authorization': `Bearer ${token}`,
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
              userList: [{
                ...newUser,
                displayLastActive: 'Just now',
                displayJoined: new Date().toISOString().split('T')[0]
              }, ...prev.userList],
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

            // Show success modal
            setSuccessMessage(`New ${createUserData.role} account created successfully for ${createUserData.firstName} ${createUserData.lastName}.`);
            setShowSuccessModal(true);
            setShowCreateUserModal(false);
            resetCreateUserForm();
          } else {
            showAlert('Error', json.error || 'Failed to create user');
          }
        } catch (err) {
          console.error('Create user error:', err);
          showAlert('Network Error', 'Failed to create user. Please try again.');
        } finally {
          setCreateUserLoading(false);
        }
      }
    });
    
    setShowConfirmModal(true);
  };

  // ===================================================================
  // HELPER FUNCTIONS
  // ===================================================================
  const resetCreateUserForm = () => {
    setCreateUserData({
      firstName: '', lastName: '', email: '', password: '', role: 'customer', phone: ''
    });
  };

  const openUserDetailsModal = (user) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const openEditUserModal = (user) => {
    setSelectedUser(user);
    const nameParts = user.name.split(' ');
    setEditUserData({
      firstName: user.first_name || nameParts[0] || '',
      lastName: user.last_name || nameParts.slice(1).join(' ') || '',
      email: user.email,
      phone: user.phone === 'Not provided' ? '' : user.phone,
      role: user.role.toLowerCase().includes('organizer') ? 'event_organizer' : 
            user.role.toLowerCase().includes('event support') ? 'event_support_consultant' :
            user.role.toLowerCase().includes('omni support') || user.role.toLowerCase().includes('support') ? 'omni_support_consultant' :
            user.role.toLowerCase().includes('manager') ? 'manager' : 
            user.role.toLowerCase().includes('admin') ? 'admin' : 'customer'
    });
    setShowEditUserModal(true);
  };

  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setShowResetPasswordModal(true);
  };

  const openSendMessageModal = (user) => {
    setSelectedUser(user);
    setMessageData({ subject: '', message: '', method: 'email' });
    setShowSendMessageModal(true);
  };

  const openChangeRoleModal = (user) => {
    setSelectedUser(user);
    const currentRole = user.role.toLowerCase().includes('customer') ? 'customer' :
                       user.role.toLowerCase().includes('organizer') ? 'event_organizer' :
                       user.role.toLowerCase().includes('event support') ? 'event_support_consultant' :
                       user.role.toLowerCase().includes('omni support') || user.role.toLowerCase().includes('support') ? 'omni_support_consultant' :
                       user.role.toLowerCase().includes('manager') ? 'manager' : 'admin';
    setChangeRoleData({
      newRole: currentRole,
      currentRole: currentRole
    });
    setShowChangeRoleModal(true);
  };

  const getRoleColor = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'admin': return '#8b5cf6';
      case 'manager':
      case 'event_manager':
      case 'event manager': return '#3b82f6';
      case 'omni_support_consultant':
      case 'omni support consultant':
      case 'support': return '#10b981';
      case 'event_support_consultant':
      case 'event support consultant': return '#f59e0b';
      case 'event_organizer':
      case 'event organizer': return '#06b6d4';
      case 'customer': return '#10b981';
      default: return '#6366f1';
    }
  };

  const getRoleDisplayName = (roleKey) => {
    switch(roleKey) {
      case 'customer': return 'Customer';
      case 'manager':
      case 'event_manager': return 'Manager';
      case 'omni_support_consultant':
      case 'support': return 'Omni Support Consultant';
      case 'event_support_consultant': return 'Event Support Consultant';
      case 'event_organizer': return 'Event Organizer';
      case 'admin': return 'Administrator';
      default: return roleKey;
    }
  };

  const getStatusConfig = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return { label: 'Active', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', accent: '#10b981' };
      case 'inactive':
        return { label: 'Inactive', tone: 'bg-slate-100 text-slate-700 border-slate-200', accent: '#64748b' };
      case 'suspended':
        return { label: 'Suspended', tone: 'bg-rose-100 text-rose-700 border-rose-200', accent: '#ef4444' };
      default:
        return { label: status || 'Unknown', tone: 'bg-slate-100 text-slate-700 border-slate-200', accent: '#64748b' };
    }
  };

  const formatCompact = (value) => (Number(value) || 0).toLocaleString('en-US');

  const getUserInitials = (user) => {
    if (user?.avatar) return user.avatar;
    return `${user?.name?.split(' ')?.[0]?.[0] || 'U'}${user?.name?.split(' ')?.[1]?.[0] || ''}`.toUpperCase();
  };

  const getProfileCompleteness = (user) => {
    const checks = [
      Boolean(user?.name),
      Boolean(user?.email),
      Boolean(user?.phone && user.phone !== 'Not provided'),
      Boolean(user?.country),
      Boolean(user?.joined || user?.displayJoined)
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const getPrivilegeScore = (role) => {
    const roleKey = (role || '').toLowerCase();
    if (roleKey.includes('admin')) return 100;
    if (roleKey.includes('manager')) return 82;
    if (roleKey.includes('organizer')) return 72;
    if (roleKey.includes('event support')) return 64;
    if (roleKey.includes('omni support') || roleKey.includes('support')) return 58;
    return 34;
  };

  const getActivityScore = (user) => {
    const activity = String(user?.displayLastActive || formatUserLastActive(user) || '').toLowerCase();
    if (activity.includes('just now') || activity.includes('mins ago')) return 92;
    if (activity.includes('hours ago') || activity.includes('recently')) return 78;
    if (activity.includes('days ago')) return 58;
    if (activity.includes('weeks ago')) return 36;
    if (activity.includes('never')) return 12;
    return 45;
  };

  const getGovernanceRisk = (user) => {
    let score = 12;
    if ((user?.status || '').toLowerCase() === 'suspended') score += 45;
    if ((user?.status || '').toLowerCase() === 'inactive') score += 22;
    if (!user?.phone || user.phone === 'Not provided') score += 8;
    if ((user?.role || '').toLowerCase().includes('admin')) score += 18;
    return Math.min(score, 100);
  };

  const filteredUsers = userData?.userList?.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const allUsers = userData?.userList || [];
  const stats = userData?.stats || {};
  const totalUsers = Number(stats.total || allUsers.length || 0);
  const activeUsers = Number(stats.active || allUsers.filter(user => user.status === 'active').length || 0);
  const newThisWeek = Number(stats.newThisWeek || 0);
  const suspendedUsers = Number(stats.suspended || allUsers.filter(user => user.status === 'suspended').length || 0);
  const inactiveUsers = Math.max(0, totalUsers - activeUsers - suspendedUsers);
  const adminUsers = allUsers.filter(user => (user.role || '').toLowerCase().includes('admin')).length;
  const managerUsers = allUsers.filter(user => (user.role || '').toLowerCase().includes('manager')).length;
  const omniSupportUsers = allUsers.filter(user => (user.role || '').toLowerCase().includes('omni support')).length;
  const eventSupportUsers = allUsers.filter(user => (user.role || '').toLowerCase().includes('event support')).length;
  const customerUsers = Math.max(0, totalUsers - adminUsers - managerUsers);
  const activeCoverage = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const suspendedExposure = totalUsers ? Math.round((suspendedUsers / totalUsers) * 100) : 0;
  const registryScope = filteredUsers.length;
  const privilegedUsers = adminUsers + managerUsers;
  const recentUsers = allUsers.filter((user) => {
    const label = String(user.displayLastActive || formatUserLastActive(user)).toLowerCase();
    return (
      label.includes('just now') ||
      label.includes('mins ago') ||
      label.includes('hours ago') ||
      label.includes('recently') ||
      label.includes('days ago')
    );
  }).length;

  const roleMix = [
    { key: 'admin', label: 'Administrators', value: adminUsers, color: '#8b5cf6' },
    { key: 'manager', label: 'Managers', value: managerUsers, color: '#3b82f6' },
    { key: 'omni_support_consultant', label: 'Omni Support Consultants', value: omniSupportUsers, color: '#10b981' },
    { key: 'event_support_consultant', label: 'Event Support Consultants', value: eventSupportUsers, color: '#f59e0b' },
    { key: 'customer', label: 'Customers', value: customerUsers, color: '#10b981' }
  ];

  const executiveCards = [
    {
      id: 'total',
      title: 'Directory Footprint',
      value: formatCompact(totalUsers),
      subtitle: `${formatCompact(privilegedUsers)} privileged accounts`,
      trend: `${formatCompact(registryScope)} in current working set`,
      action: () => {
        setSearchQuery('');
        setFilterStatus('all');
      }
    },
    {
      id: 'active',
      title: 'Operational Access',
      value: `${activeCoverage}%`,
      subtitle: `${formatCompact(activeUsers)} active accounts`,
      trend: `${formatCompact(recentUsers)} recently engaged`,
      action: () => setFilterStatus('active')
    },
    {
      id: 'onboarding',
      title: 'New This Week',
      value: formatCompact(newThisWeek),
      subtitle: 'Fresh accounts entering the platform',
      trend: `${formatCompact(customerUsers)} customer identities`,
      action: () => setShowCreateUserModal(true)
    },
    {
      id: 'risk',
      title: 'Governance Exposure',
      value: `${suspendedExposure}%`,
      subtitle: `${formatCompact(suspendedUsers)} suspended accounts`,
      trend: inactiveUsers > 0 ? `${formatCompact(inactiveUsers)} inactive accounts pending review` : 'No inactive backlog',
      action: () => setFilterStatus('suspended')
    },
    {
      id: 'oversight',
      title: 'Oversight Capacity',
      value: formatCompact(adminUsers || 0),
      subtitle: `${formatCompact(managerUsers)} managers`,
      trend: adminUsers > 0 ? `1 admin per ${Math.max(1, Math.round(totalUsers / adminUsers))} users` : 'Admin coverage unavailable',
      action: fetchUserData
    }
  ];

  const selectedUserTimeline = selectedUser
    ? (userData?.recentActivity || []).filter((activity) => activity.user === selectedUser.name).slice(0, 5)
    : [];
  const selectedUserStatus = selectedUser ? getStatusConfig(selectedUser.status) : null;
  const selectedUserRoleColor = selectedUser ? getRoleColor(selectedUser.role || 'customer') : '#6366f1';

  // ActivityItem component with simple date handling
  const ActivityItem = ({ activity }) => {
    const icons = { 
      user_registered: 'UserCheck', 
      user_login: 'Lock', 
      user_suspended: 'Ban', 
      user_activated: 'Power',
      role_changed: 'Shield', 
      password_reset: 'RefreshCw',
      profile_updated: 'Person',
      message_sent: 'Send',
      user_deleted: 'Trash'
    };
    const colors = { 
      success: 'text-green-600 bg-green-100', 
      error: 'text-red-600 bg-red-100', 
      warning: 'text-yellow-600 bg-yellow-100', 
      info: 'text-blue-600 bg-blue-100' 
    };

    // Use displayTime if available, otherwise format the time
    const activityTime = activity.displayTime || formatTimeDisplay(activity.time);

    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 transition-colors hover:bg-slate-100">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colors[activity.status] || 'bg-gray-100 text-gray-600'}`}>
          <Icon name={icons[activity.type] || 'Activity'} size={20} color="currentColor" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-900">
            {activity.user} 
            <span className="text-slate-500 font-normal ml-1">
              {activity.type?.replace(/_/g, ' ') || 'Activity'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {activityTime}
            {activity.type === 'user_login' && (
              <span className="ml-2 text-blue-600 font-medium">
                Last login: {activityTime}
              </span>
            )}
          </div>
          {activity.details && (
            <div className="text-xs text-slate-500 mt-1">
              {activity.details}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen-full flex items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto inline-flex h-14 w-14 animate-spin items-center justify-center rounded-2xl bg-slate-100">
            <Icon name="RefreshCw" size={28} color="#0f172a" />
          </div>
          <div className="mt-4 text-xl font-semibold text-slate-900">Loading user operations</div>
          <div className="mt-2 text-sm text-slate-500">Preparing directory telemetry, governance signals, and account controls.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen-full flex items-center justify-center bg-slate-100 px-6">
        <div className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Icon name="AlertTriangle" size={64} color="#ef4444" />
          <div className="mt-4 text-xl font-bold text-slate-900">Unable to load the user directory</div>
          <div className="mt-2 text-sm text-slate-500">{error}</div>
          <button 
            onClick={fetchUserData}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Icon name="RefreshCw" size={16} color="#fff" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="h-screen-full flex items-center justify-center bg-slate-100 px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Icon name="AlertTriangle" size={64} color="#ef4444" />
          <div className="mt-4 text-xl font-bold text-slate-900">No directory data available</div>
          <div className="mt-2 text-sm text-slate-500">The user management service returned an empty payload.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* FULL SCREEN CONTAINER */}
      <div className="h-screen-full bg-slate-100 flex flex-col overflow-hidden">
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur z-10 flex-shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Identity administration</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">User Management Command Center</h1>
              <p className="mt-1 text-sm text-slate-500">Enterprise oversight for account lifecycle, access governance, and customer platform operations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchUserData}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Icon name="RefreshCw" size={16} color="#475569" />
                Refresh Directory
              </button>
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Icon name="UserCheck" size={16} color="#fff" />
                Provision Account
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Executive Summary</p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Enterprise identity oversight for the ticketing platform</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Manage administrators, managers, consultants, organizers, and customers from a unified operating console with lifecycle control,
                      risk visibility, and platform-wide access intelligence.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:min-w-[250px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Directory health</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-bold text-slate-900">{activeCoverage}%</span>
                      <span className="pb-1 text-sm text-slate-500">active coverage</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{formatCompact(activeUsers)} of {formatCompact(totalUsers)} accounts are currently operational.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      label: 'Administrative Control',
                      value: formatCompact(adminUsers),
                      note: adminUsers > 0 ? `1 admin per ${Math.max(1, Math.round(totalUsers / adminUsers))} users` : 'No administrators mapped',
                      color: '#8b5cf6'
                    },
                    {
                      label: 'Event Operations Capacity',
                      value: formatCompact(managerUsers),
                      note: `${formatCompact(customerUsers)} customer accounts supported`,
                      color: '#3b82f6'
                    },
                    {
                      label: 'Watchlist Exposure',
                      value: formatCompact(suspendedUsers + inactiveUsers),
                      note: suspendedUsers > 0 ? 'Suspended accounts require governance review' : 'No suspension backlog',
                      color: '#ef4444'
                    }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}16` }}>
                          <Icon name="BarChart" size={20} color={item.color} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                          <p className="text-sm text-slate-500">{item.note}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Icon name="UserCheck" size={16} color="#fff" />
                    Create account
                  </button>
                  <button
                    onClick={() => setFilterStatus('suspended')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="AlertTriangle" size={16} color="#475569" />
                    Review suspended users
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="Users" size={16} color="#475569" />
                    Reset registry view
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Operational Domain Snapshot</p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Governance watchlist</h2>
                    <p className="mt-1 text-sm text-slate-500">Live workload indicators for access, onboarding, and risk.</p>
                  </div>
                  <button
                    onClick={fetchUserData}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="RefreshCw" size={14} color="#475569" />
                    Sync
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      label: 'Suspended accounts',
                      value: suspendedUsers,
                      note: suspendedUsers > 0 ? 'Immediate review recommended' : 'No active suspensions',
                      accent: '#ef4444'
                    },
                    {
                      label: 'Recently active users',
                      value: recentUsers,
                      note: 'Recent engagement across web and mobile surfaces',
                      accent: '#10b981'
                    },
                    {
                      label: 'Registry scope',
                      value: registryScope,
                      note: searchQuery ? `Filtered by "${searchQuery}"` : 'Current working directory output',
                      accent: '#3b82f6'
                    }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <span className="text-2xl font-bold text-slate-900">{formatCompact(item.value)}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, totalUsers ? (item.value / totalUsers) * 100 : 0)}%`, backgroundColor: item.accent }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{item.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Role distribution</p>
                    <p className="text-xs text-slate-400">All registered accounts</p>
                  </div>
                  <div className="mt-4 space-y-4">
                    {roleMix.map((role) => (
                      <div key={role.key}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{role.label}</span>
                          <span className="text-slate-500">{formatCompact(role.value)}</span>
                        </div>
                        <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                          <div
                            className="h-2.5 rounded-full"
                            style={{ width: `${totalUsers ? (role.value / totalUsers) * 100 : 0}%`, backgroundColor: role.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {executiveCards.map((card) => (
                <button
                  key={card.id}
                  onClick={card.action}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{card.title}</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-600">{card.subtitle}</p>
                  <p className="mt-3 text-xs font-medium text-slate-400">{card.trend}</p>
                </button>
              ))}
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Registry Controls</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Search, segment, and route operational actions</h2>
                  <p className="mt-1 text-sm text-slate-500">Use the control layer to isolate active users, investigate exceptions, or target high-value accounts.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_200px_auto]">
                  <div className="relative min-w-0">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Icon name="Search" size={18} color="#94a3b8" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by user, email, or account footprint"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Icon name="XCircle" size={16} color="#475569" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Accounts', value: totalUsers },
                  { key: 'active', label: 'Active', value: activeUsers },
                  { key: 'inactive', label: 'Inactive', value: inactiveUsers },
                  { key: 'suspended', label: 'Suspended', value: suspendedUsers }
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setFilterStatus(chip.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filterStatus === chip.key
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label}
                    <span className={`rounded-full px-2 py-0.5 ${filterStatus === chip.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {formatCompact(chip.value)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.7fr,0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Directory Registry</p>
                    <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">User portfolio</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatCompact(filteredUsers.length)} accounts in the current operational view.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterStatus('active')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Icon name="CheckCircle" size={14} color="#10b981" />
                      Focus active
                    </button>
                    <button
                      onClick={() => setFilterStatus('suspended')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Icon name="Ban" size={14} color="#ef4444" />
                      Focus risk
                    </button>
                  </div>
                </div>

                <div className="hidden border-b border-slate-200 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 lg:grid lg:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] lg:gap-4">
                  <span>Account</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Lifecycle</span>
                  <span className="text-right">Actions</span>
                </div>

                <div className="max-h-[760px] overflow-y-auto scrollbar-thin">
                  {filteredUsers.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <Icon name="Users" size={26} color="#64748b" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-900">No users match the current filters</h3>
                      <p className="mt-2 text-sm text-slate-500">Reset the registry controls or broaden your search criteria to restore the full directory view.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {filteredUsers.map((user) => {
                        const status = getStatusConfig(user.status);
                        const roleColor = getRoleColor(user.role || 'customer');

                        return (
                          <div
                            key={user.id}
                            onClick={() => openUserDetailsModal(user)}
                            className="cursor-pointer px-6 py-5 transition-colors hover:bg-slate-50"
                          >
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] lg:items-center">
                              <div className="flex items-start gap-4 min-w-0">
                                <div
                                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                                  style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}
                                >
                                  {getUserInitials(user)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-base font-semibold text-slate-900">{user.name}</p>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                      {user.country || 'South Africa'}
                                    </span>
                                  </div>
                                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>Phone: {user.phone || 'Not provided'}</span>
                                    <span>Joined: {user.joined || user.displayJoined || 'Unknown'}</span>
                                    <span>Last active: {user.displayLastActive || formatUserLastActive(user)}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: `${roleColor}16`, color: roleColor }}>
                                  {user.role}
                                </span>
                                <p className="mt-2 text-xs text-slate-500">Privilege score {getPrivilegeScore(user.role)}%</p>
                              </div>

                              <div>
                                <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${status.tone}`}>
                                  {status.label}
                                </span>
                                <div className="mt-2 h-2 rounded-full bg-slate-200">
                                  <div className="h-2 rounded-full" style={{ width: `${getGovernanceRisk(user)}%`, backgroundColor: status.accent }} />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">Governance risk {getGovernanceRisk(user)}%</p>
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-900">{getProfileCompleteness(user)}% complete</p>
                                <p className="mt-1 text-xs text-slate-500">Profile readiness across email, contact, geography, and lifecycle fields.</p>
                              </div>

                              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openUserDetailsModal(user);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Icon name="Search" size={14} color="#475569" />
                                  Open
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleSuspendActivate(user.id, user.status);
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                                    user.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
                                  }`}
                                >
                                  <Icon name={user.status === 'suspended' ? 'Power' : 'Ban'} size={14} color="#fff" />
                                  {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Access Governance</p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Control posture</h3>
                  <div className="mt-5 space-y-4">
                    {[
                      {
                        label: 'Privilege-bearing accounts',
                        value: privilegedUsers,
                        percent: totalUsers ? (privilegedUsers / totalUsers) * 100 : 0,
                        color: '#8b5cf6'
                      },
                      {
                        label: 'Recently engaged users',
                        value: recentUsers,
                        percent: totalUsers ? (recentUsers / totalUsers) * 100 : 0,
                        color: '#10b981'
                      },
                      {
                        label: 'Suspended exposure',
                        value: suspendedUsers,
                        percent: totalUsers ? (suspendedUsers / totalUsers) * 100 : 0,
                        color: '#ef4444'
                      }
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{item.label}</span>
                          <span className="text-slate-500">{formatCompact(item.value)}</span>
                        </div>
                        <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                          <div className="h-2.5 rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Priority Queue</p>
                      <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Accounts requiring attention</h3>
                    </div>
                    <button
                      onClick={() => setFilterStatus('suspended')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Icon name="Ban" size={14} color="#475569" />
                      Open queue
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {allUsers
                      .filter((user) => user.status === 'suspended' || user.status === 'inactive')
                      .slice(0, 5)
                      .map((user) => {
                        const status = getStatusConfig(user.status);
                        return (
                          <button
                            key={user.id}
                            onClick={() => openUserDetailsModal(user)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                                <p className="mt-2 text-xs text-slate-500">Last active: {user.displayLastActive || formatUserLastActive(user)}</p>
                              </div>
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
                                {status.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    {allUsers.filter((user) => user.status === 'suspended' || user.status === 'inactive').length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        No inactive or suspended accounts are waiting for review.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Activity Stream</p>
                      <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Recent activity</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      {formatCompact(userData.recentActivity?.length || 0)} events
                    </span>
                  </div>
                  <div className="mt-5 space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin">
                    {userData.recentActivity?.map((a, i) => <ActivityItem key={i} activity={a} />)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ===================================================================
          MODALS
      =================================================================== */}

      {/* 1. CREATE USER MODAL */}
      <Modal isOpen={showCreateUserModal} onClose={() => { setShowCreateUserModal(false); resetCreateUserForm(); }} title="Create New User" wide={true}>
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
            <div className="text-xs text-gray-500 mt-1">Minimum 6 characters</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional" value={createUserData.phone} onChange={e => setCreateUserData({...createUserData, phone: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">User Role *</label>
            <div className="grid grid-cols-2 gap-3">
              {['customer', 'manager', 'event_organizer', 'omni_support_consultant', 'event_support_consultant', 'admin'].map(role => (
                <button
                  key={role}
                  onClick={() => setCreateUserData({...createUserData, role})}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${createUserData.role === role ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: getRoleColor(role) + '20'}}>
                    <Icon name="Shield" size={20} color={getRoleColor(role)} />
                  </div>
                  <span className="font-medium text-gray-900">
                    {role === 'customer' ? 'Customer' : role === 'manager' ? 'Manager' : role === 'event_organizer' ? 'Event Organizer' : role === 'omni_support_consultant' ? 'Omni Support Consultant' : role === 'event_support_consultant' ? 'Event Support Consultant' : 'Administrator'}
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

      {/* 2. USER DETAILS MODAL */}
      <Modal isOpen={showUserDetailsModal} onClose={() => setShowUserDetailsModal(false)} title="User Intelligence Profile" wide={true}>
        {selectedUser && (
          <div className="space-y-8">
            <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-[22px] text-3xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${selectedUserRoleColor}, ${selectedUserRoleColor}cc)` }}
                  >
                    {getUserInitials(selectedUser)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900">{selectedUser.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedUser.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: `${selectedUserRoleColor}16`, color: selectedUserRoleColor }}>
                        {selectedUser.role}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedUserStatus?.tone}`}>
                        {selectedUserStatus?.label}
                      </span>
                      <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200">
                        {selectedUser.country || 'South Africa'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Icon name="Clock" size={14} color="#64748b" />
                        Last active: {selectedUser.displayLastActive || formatUserLastActive(selectedUser)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Icon name="Mail" size={14} color="#64748b" />
                        {selectedUser.phone || 'Phone not provided'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Profile', value: `${getProfileCompleteness(selectedUser)}%`, tone: 'bg-emerald-50 text-emerald-700' },
                    { label: 'Activity', value: `${getActivityScore(selectedUser)}%`, tone: 'bg-blue-50 text-blue-700' },
                    { label: 'Privilege', value: `${getPrivilegeScore(selectedUser.role)}%`, tone: 'bg-violet-50 text-violet-700' },
                    { label: 'Risk', value: `${getGovernanceRisk(selectedUser)}%`, tone: 'bg-rose-50 text-rose-700' }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <p className={`mt-2 text-2xl font-bold ${item.tone.split(' ')[1]}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Account Intelligence</p>
                    <h4 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Identity overview</h4>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Joined {selectedUser.joined || selectedUser.displayJoined || 'Unknown'}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ['Phone', selectedUser.phone || 'Not provided'],
                    ['Country', selectedUser.country || 'South Africa'],
                    ['Last active', selectedUser.displayLastActive || formatUserLastActive(selectedUser)],
                    ['Role', selectedUser.role]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'Profile completeness', value: getProfileCompleteness(selectedUser), color: '#10b981' },
                    { label: 'Engagement score', value: getActivityScore(selectedUser), color: '#3b82f6' },
                    { label: 'Privilege level', value: getPrivilegeScore(selectedUser.role), color: '#8b5cf6' },
                    { label: 'Governance risk', value: getGovernanceRisk(selectedUser), color: '#ef4444' }
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">{metric.label}</p>
                        <span className="text-sm font-bold text-slate-900">{metric.value}%</span>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-slate-200">
                        <div className="h-2.5 rounded-full" style={{ width: `${metric.value}%`, backgroundColor: metric.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Activity Timeline</p>
                    <h4 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Recent executions</h4>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {formatCompact(selectedUserTimeline.length)} related events
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedUserTimeline.length > 0 ? (
                    selectedUserTimeline.map((activity, index) => (
                      <div key={`${activity.type}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{activity.type?.replace(/_/g, ' ') || 'Activity'}</p>
                            <p className="mt-1 text-xs text-slate-500">{activity.details || 'Operational activity recorded in the directory.'}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-400">{formatTimeDisplay(activity.time)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      No user-specific activity is currently available in the dashboard feed. Recent lifecycle updates will appear here when recorded.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Execution Actions</p>
                  <h4 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Administrative controls</h4>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Role and access actions</span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <button
                  onClick={() => handleSuspendActivate(selectedUser.id, selectedUser.status)}
                  disabled={actionLoading.suspend}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition-colors ${selectedUser.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                >
                  {actionLoading.suspend ? (
                    <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
                  ) : (
                    <>
                      <Icon name={selectedUser.status === 'suspended' ? 'Power' : 'Ban'} size={20} color="white" />
                      {selectedUser.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                    </>
                  )}
                </button>

                <button
                  onClick={() => { setShowUserDetailsModal(false); openEditUserModal(selectedUser); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-white font-semibold transition-colors hover:bg-blue-700"
                >
                  <Icon name="Edit" size={20} color="white" />
                  Edit Profile
                </button>

                <button
                  onClick={() => { setShowUserDetailsModal(false); openChangeRoleModal(selectedUser); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-white font-semibold transition-colors hover:bg-violet-700"
                >
                  <Icon name="SwapHorizontal" size={20} color="white" />
                  Change Role
                </button>

                <button
                  onClick={() => { setShowUserDetailsModal(false); openResetPasswordModal(selectedUser); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-white font-semibold transition-colors hover:bg-amber-600"
                >
                  <Icon name="Key" size={20} color="white" />
                  Reset Password
                </button>

                <button
                  onClick={() => { setShowUserDetailsModal(false); openSendMessageModal(selectedUser); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 py-3.5 text-white font-semibold transition-colors hover:bg-fuchsia-700"
                >
                  <Icon name="Send" size={20} color="white" />
                  Send Message
                </button>

                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading.delete}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-white font-semibold transition-colors hover:bg-slate-800"
                >
                  <Icon name="Trash" size={20} color="white" />
                  Delete User
                </button>
              </div>
            </section>
          </div>
        )}
      </Modal>

      {/* 3. EDIT USER MODAL */}
      <Modal isOpen={showEditUserModal} onClose={() => setShowEditUserModal(false)} title="Edit User Profile" wide={true}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editUserData.firstName} onChange={e => setEditUserData({...editUserData, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editUserData.lastName} onChange={e => setEditUserData({...editUserData, lastName: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
            <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editUserData.email} onChange={e => setEditUserData({...editUserData, email: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional" value={editUserData.phone} onChange={e => setEditUserData({...editUserData, phone: e.target.value})} />
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button onClick={() => setShowEditUserModal(false)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleEditProfile}
              disabled={actionLoading.edit}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {actionLoading.edit ? (
                <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
              ) : (
                <>
                  <Icon name="CheckCircle" size={20} color="white" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. CHANGE ROLE MODAL */}
      <Modal isOpen={showChangeRoleModal} onClose={() => setShowChangeRoleModal(false)} title="Change User Role">
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="text-sm text-indigo-700">
              <Icon name="AlertTriangle" size={16} color="#4f46e5" className="inline mr-2" />
              Changing role for: <span className="font-bold">{selectedUser?.name}</span>
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              Current role: <span className="font-semibold">{getRoleDisplayName(changeRoleData.currentRole)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select New Role *</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'customer', name: 'Customer', description: 'Regular user with basic access', icon: 'User' },
                { key: 'manager', name: 'Manager', description: 'Operational oversight and event approvals', icon: 'Calendar' },
                { key: 'event_organizer', name: 'Event Organizer', description: 'Creates and owns event proposals', icon: 'Calendar' },
                { key: 'omni_support_consultant', name: 'Omni Support Consultant', description: 'Handles platform-wide support operations', icon: 'Shield' },
                { key: 'event_support_consultant', name: 'Event Support Consultant', description: 'Handles event-day support and ticket scanning', icon: 'Shield' },
                { key: 'admin', name: 'Administrator', description: 'Full system access and user management', icon: 'Shield' }
              ].map(role => (
                <button
                  key={role.key}
                  onClick={() => setChangeRoleData({...changeRoleData, newRole: role.key})}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition text-left ${changeRoleData.newRole === role.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: getRoleColor(role.key) + '20'}}>
                    <Icon name={role.icon} size={20} color={getRoleColor(role.key)} />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{role.name}</span>
                    <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                  </div>
                  {changeRoleData.newRole === role.key && (
                    <Icon name="CheckCircle" size={24} color="#6366f1" className="ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {changeRoleData.newRole && changeRoleData.newRole !== changeRoleData.currentRole && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-700 flex items-start gap-2">
                <Icon name="AlertTriangle" size={16} color="#d97706" />
                <div>
                  <strong>Important:</strong> Changing from {getRoleDisplayName(changeRoleData.currentRole)} to {getRoleDisplayName(changeRoleData.newRole)} will:
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    <li>Move the user to a different database table</li>
                    <li>Change their permissions and access levels</li>
                    <li>Require them to log out and log back in</li>
                    <li>Update their role in all system records</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t">
            <button onClick={() => setShowChangeRoleModal(false)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleChangeRole}
              disabled={actionLoading.changeRole || !changeRoleData.newRole || changeRoleData.newRole === changeRoleData.currentRole}
              className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {actionLoading.changeRole ? (
                <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
              ) : (
                <>
                  <Icon name="SwapHorizontal" size={20} color="white" />
                  Change Role
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. RESET PASSWORD MODAL */}
      <Modal isOpen={showResetPasswordModal} onClose={() => setShowResetPasswordModal(false)} title="Reset Password">
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700">
              <Icon name="AlertTriangle" size={16} color="#1d4ed8" className="inline mr-2" />
              Resetting password for: <span className="font-bold">{selectedUser?.name}</span> ({selectedUser?.email})
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password *</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Minimum 6 characters"
              value={resetPasswordData.newPassword}
              onChange={e => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})}
            />
            <div className="text-xs text-gray-500 mt-1">Minimum 6 characters</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Re-enter the password"
              value={resetPasswordData.confirmPassword}
              onChange={e => setResetPasswordData({...resetPasswordData, confirmPassword: e.target.value})}
            />
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button onClick={() => setShowResetPasswordModal(false)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              disabled={actionLoading.reset}
              className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {actionLoading.reset ? (
                <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
              ) : (
                <>
                  <Icon name="Key" size={20} color="white" />
                  Reset Password
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 6. SEND MESSAGE MODAL */}
      <Modal isOpen={showSendMessageModal} onClose={() => setShowSendMessageModal(false)} title="Send Message" wide={true}>
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-700">
              <Icon name="Mail" size={16} color="#7c3aed" className="inline mr-2" />
              Sending message to: <span className="font-bold">{selectedUser?.name}</span> ({selectedUser?.email})
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMessageData({...messageData, method: 'email'})}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition ${messageData.method === 'email' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Icon name="Mail" size={20} color={messageData.method === 'email' ? '#8b5cf6' : '#6b7280'} />
                <span className="font-medium">Email</span>
                {messageData.method === 'email' && <Icon name="CheckCircle" size={20} color="#8b5cf6" />}
              </button>
              <button
                onClick={() => setMessageData({...messageData, method: 'notification'})}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition ${messageData.method === 'notification' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Icon name="Notifications" size={20} color={messageData.method === 'notification' ? '#8b5cf6' : '#6b7280'} />
                <span className="font-medium">Notification</span>
                {messageData.method === 'notification' && <Icon name="CheckCircle" size={20} color="#8b5cf6" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Message subject"
              value={messageData.subject}
              onChange={e => setMessageData({...messageData, subject: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
            <textarea 
              className="w-full h-40 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Type your message here..."
              value={messageData.message}
              onChange={e => setMessageData({...messageData, message: e.target.value})}
            />
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button onClick={() => setShowSendMessageModal(false)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={actionLoading.send}
              className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {actionLoading.send ? (
                <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
              ) : (
                <>
                  <Icon name="Send" size={20} color="white" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. DELETE USER MODAL */}
      <Modal isOpen={showDeleteUserModal} onClose={() => { setShowDeleteUserModal(false); setDeleteConfirmationText(''); }} title="Delete User Account">
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 flex items-start gap-2">
              <Icon name="AlertCircle" size={20} color="#dc2626" />
              <div>
                <strong className="block mb-1">Permanent Deletion Warning</strong>
                <div className="text-xs">
                  You are about to permanently delete <span className="font-bold">{selectedUser?.name}</span>'s account.
                  This action cannot be undone and all user data will be removed from:
                </div>
                <ul className="mt-2 ml-4 list-disc text-xs">
                  <li>Customers/Admins/Managers/Consultants table</li>
                  <li>Dashboard user list</li>
                  <li>All associated records and logs</li>
                  <li>Any active sessions or tokens</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type "DELETE" to confirm
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type DELETE exactly as shown"
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            <div className="text-xs text-gray-500 mt-1">
              This is case-sensitive. You must type "DELETE" exactly as shown to proceed.
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button 
              onClick={() => { setShowDeleteUserModal(false); setDeleteConfirmationText(''); }}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel Deletion
            </button>
            <button
              onClick={() => handleConfirmDelete(deleteConfirmationText)}
              disabled={actionLoading.delete || deleteConfirmationText !== 'DELETE'}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {actionLoading.delete ? (
                <div className="animate-spin"><Icon name="RefreshCw" size={20} color="white" /></div>
              ) : (
                <>
                  <Icon name="Trash" size={20} color="white" />
                  Permanently Delete
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmAction?.onConfirm || (() => setShowConfirmModal(false))}
        title={confirmAction?.title || 'Confirmation Required'}
        message={confirmAction?.message || 'Are you sure you want to perform this action?'}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        cancelText={confirmAction?.cancelText || 'Cancel'}
        type={confirmAction?.confirmColor || 'warning'}
      />

      {/* SUCCESS MODAL */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
        title="Success!"
        buttonText="OK"
        duration={5000}
      />
    </>
  );
};

export default UserManagementDashboard;

