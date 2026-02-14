// src/context/AuthContext.js - FIXED VERSION WITH SUPPORT ID PRIORITY
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();
const API_URL = 'http://localhost:8081';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      console.log('🔍 Checking for existing authentication...');
      const [userData, storedToken] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token')
      ]);

      if (userData && storedToken) {
        const parsedUser = JSON.parse(userData);
        console.log('✅ Restoring user:', parsedUser.email || parsedUser.username, parsedUser.role);

        // Normalize role format
        const normalizeRole = (role) => {
          if (!role) return 'customer';
          const r = role.toString().toLowerCase().trim();
          if (['event-organizer', 'event_organizer', 'eventorganizer', 'organizer'].includes(r)) return 'event_organizer';
          if (['support-staff', 'support_staff', 'supportstaff', 'support'].includes(r)) return 'support';
          if (['event-manager', 'event_manager', 'eventmanager', 'manager'].includes(r)) return 'event_manager';
          if (['admin', 'administrator', 'super_admin', 'superadmin'].includes(r)) return 'admin';
          if (['customer', 'user'].includes(r)) return 'customer';
          return r;
        };

        const normalizedRole = normalizeRole(parsedUser.role || parsedUser.userType);
        parsedUser.role = normalizedRole;
        parsedUser.userType = normalizedRole;

        // Ensure displayRole
        if (!parsedUser.displayRole) {
          const roleMap = {
            'event_organizer': 'Event Organizer',
            'support': 'Support Staff',
            'event_manager': 'Event Manager',
            'admin': 'Administrator',
            'customer': 'Customer'
          };
          parsedUser.displayRole = roleMap[normalizedRole] || 'User';
        }

        // CRITICAL FIX: Extract userId with support_id priority
        const extractedUserId = parsedUser.support_id || 
                                parsedUser.organizer_id || 
                                parsedUser.manager_id || 
                                parsedUser.customer_id || 
                                parsedUser.admin_id || 
                                parsedUser.id || 
                                parsedUser.userId;

        // DEBUG LOGGING
        console.log('🔍 DEBUG - User object keys:', Object.keys(parsedUser));
        console.log('🔍 DEBUG - Available IDs:', {
          support_id: parsedUser.support_id,
          organizer_id: parsedUser.organizer_id,
          manager_id: parsedUser.manager_id,
          customer_id: parsedUser.customer_id,
          admin_id: parsedUser.admin_id,
          id: parsedUser.id,
          userId: parsedUser.userId
        });
        console.log('🔍 DEBUG - Extracted userId:', extractedUserId);
        console.log('🔍 DEBUG - Role:', normalizedRole);
        console.log('🔍 DEBUG - Token exists:', !!storedToken);

        // Store the extracted userId back in the user object
        parsedUser.userId = extractedUserId;

        setUser(parsedUser);
        setToken(storedToken);
        setAuthToken(storedToken);
        console.log('✅ User restored with role:', parsedUser.role);
        console.log('✅ User ID set to:', extractedUserId);
      } else {
        console.log('ℹ️ No existing authentication found');
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Universal login method for all roles
  const login = async (identifier, password) => {
    try {
      console.log('🔐 Attempting login for:', identifier);
      setIsLoading(true);
      
      // Try universal login endpoint first (handles all roles)
      try {
        console.log('🔍 Trying universal login endpoint...');
        const response = await axios.post(`${API_URL}/api/auth/login`, {
          email: identifier,
          password
        });

        if (response.data.success) {
          console.log('✅ Universal login successful');
          const userData = response.data.user;
          const authToken = response.data.token;
          
          // Ensure role is set correctly
          if (!userData.role) {
            userData.role = userData.userType || 'customer';
          }
          
          // Extract userId based on role
          let extractedUserId;
          if (userData.role === 'support' || userData.userType === 'support') {
            extractedUserId = userData.support_id || userData.userId || userData.id;
          } else if (userData.role === 'event_organizer') {
            extractedUserId = userData.organizer_id || userData.userId || userData.id;
          } else if (userData.role === 'event_manager') {
            extractedUserId = userData.manager_id || userData.userId || userData.id;
          } else if (userData.role === 'admin') {
            extractedUserId = userData.admin_id || userData.userId || userData.id;
          } else {
            extractedUserId = userData.customer_id || userData.userId || userData.id;
          }

          userData.userId = extractedUserId;
          
          // Set displayRole
          const roleMap = {
            'event_organizer': 'Event Organizer',
            'support': 'Support Staff',
            'event_manager': 'Event Manager',
            'admin': 'Administrator',
            'customer': 'Customer'
          };
          userData.displayRole = roleMap[userData.role] || userData.role;

          console.log('🔍 LOGIN DEBUG - User data:', {
            role: userData.role,
            userId: extractedUserId,
            email: userData.email,
            support_id: userData.support_id,
            all_ids: {
              support_id: userData.support_id,
              organizer_id: userData.organizer_id,
              manager_id: userData.manager_id,
              customer_id: userData.customer_id,
              admin_id: userData.admin_id,
              id: userData.id
            }
          });

          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authToken)
          ]);

          setUser(userData);
          setToken(authToken);
          setAuthToken(authToken);

          console.log('✅ User set:', userData.role, userData.email);
          console.log('✅ User ID set to:', extractedUserId);
          return { success: true, user: userData, token: authToken };
        }
      } catch (universalError) {
        console.log('ℹ️ Universal login failed:', universalError.response?.status);
      }

      // Fallback to specific endpoints
      const endpoints = [
        { url: '/api/auth/support/login', role: 'support' },
        { url: '/api/auth/organizer/login', role: 'event_organizer' },
        { url: '/api/event-manager/auth/login', role: 'event_manager' },
        { url: '/api/admin/auth/login', role: 'admin' },
        { url: '/api/auth/customerAuth/login', role: 'customer' }
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying ${endpoint.role} login...`);
          const response = await axios.post(`${API_URL}${endpoint.url}`, {
            email: identifier,
            password
          });
          
          if (response.data.success) {
            console.log(`✅ ${endpoint.role} login successful`);
            const userData = response.data.user;
            const authToken = response.data.token;
            
            // Ensure role is set
            userData.role = endpoint.role;
            userData.userType = endpoint.role;
            
            // Extract userId based on role
            let extractedUserId;
            if (endpoint.role === 'support') {
              extractedUserId = userData.support_id || userData.userId || userData.id;
            } else if (endpoint.role === 'event_organizer') {
              extractedUserId = userData.organizer_id || userData.userId || userData.id;
            } else if (endpoint.role === 'event_manager') {
              extractedUserId = userData.manager_id || userData.userId || userData.id;
            } else if (endpoint.role === 'admin') {
              extractedUserId = userData.admin_id || userData.userId || userData.id;
            } else {
              extractedUserId = userData.customer_id || userData.userId || userData.id;
            }

            userData.userId = extractedUserId;
            
            // Set displayRole
            const roleMap = {
              'event_organizer': 'Event Organizer',
              'support': 'Support Staff',
              'event_manager': 'Event Manager',
              'admin': 'Administrator',
              'customer': 'Customer'
            };
            userData.displayRole = roleMap[endpoint.role] || endpoint.role;

            await Promise.all([
              AsyncStorage.setItem('user', JSON.stringify(userData)),
              AsyncStorage.setItem('token', authToken)
            ]);

            setUser(userData);
            setToken(authToken);
            setAuthToken(authToken);

            console.log(`✅ ${endpoint.role} user set:`, userData.email);
            console.log('✅ User ID set to:', extractedUserId);
            return { success: true, user: userData, token: authToken };
          }
        } catch (error) {
          console.log(`ℹ️ ${endpoint.role} login failed:`, error.response?.status);
          continue;
        }
      }

      // Try demo admin login as last resort
      try {
        console.log('🔍 Trying demo admin login...');
        const response = await axios.post(`${API_URL}/api/admin/demo-login`, {
          email: identifier,
          password
        });

        if (response.data.success) {
          console.log('✅ Demo admin login successful');
          const userData = response.data.user;
          const authToken = response.data.token;
          
          userData.role = 'admin';
          userData.userType = 'admin';
          userData.displayRole = 'Administrator';
          userData.userId = userData.admin_id || userData.id;

          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authToken)
          ]);

          setUser(userData);
          setToken(authToken);
          setAuthToken(authToken);

          return { success: true, user: userData, token: authToken };
        }
      } catch (demoError) {
        console.log('ℹ️ Demo login failed:', demoError.response?.status);
      }

      // All attempts failed
      console.log('❌ All login attempts failed');
      return {
        success: false,
        error: 'Invalid credentials. Please check your email and password.'
      };

    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Registration function for all user types
  const register = async (userData) => {
    try {
      console.log('🔐 Attempting registration for:', userData.email);
      setIsLoading(true);
      
      let endpoint = '/api/auth/register';
      if (userData.role === 'support') {
        endpoint = '/api/auth/support/register';
      } else if (userData.role === 'event_organizer') {
        endpoint = '/api/auth/organizer/register';
      } else if (userData.role === 'event_manager') {
        endpoint = '/api/event-manager/auth/register';
      } else if (userData.role === 'admin') {
        endpoint = '/api/admin/auth/register';
      }

      const response = await axios.post(`${API_URL}${endpoint}`, userData);
      
      if (response.data.success) {
        console.log('✅ Registration successful');
        
        // Auto-login after successful registration
        const loginResult = await login(userData.email, userData.password);
        return loginResult;
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      setIsLoading(true);
      await Promise.all([
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('token')
      ]);
      setUser(null);
      setToken(null);
      setAuthToken(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthHeader = () => {
    const currentToken = authToken || token;
    
    if (!currentToken) {
      console.log('⚠️ No auth token available');
      return { 'Content-Type': 'application/json' };
    }

    const cleanToken = currentToken.replace(/^"(.*)"$/, '$1');
    console.log('🔑 Using auth token for request');
    return {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  };

  const updateUser = async (updatedUserData) => {
    try {
      console.log('🔄 Updating user data...');
      const newUserData = { ...user, ...updatedUserData };
      await AsyncStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      console.log('✅ User data updated');
    } catch (error) {
      console.error('❌ Error updating user:', error);
    }
  };

  const refreshAuth = async () => {
    try {
      console.log('🔄 Refreshing authentication...');
      await checkExistingAuth();
    } catch (error) {
      console.error('❌ Error refreshing auth:', error);
    }
  };

  // Role Checks - Complete set
  const hasAdminPrivileges = () => {
    if (!user) return false;
    const role = user?.role?.toLowerCase();
    return ['admin', 'super_admin', 'support', 'event_manager', 'event_organizer'].includes(role);
  };

  const isEventManager = () => {
    return user?.role?.toLowerCase() === 'event_manager';
  };

  const isAdmin = () => {
    return user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin';
  };

  const isCustomer = () => {
    return user?.role?.toLowerCase() === 'customer';
  };

  const isEventOrganizer = () => {
    return user?.role?.toLowerCase() === 'event_organizer';
  };

  const isSupportStaff = () => {
    return user?.role?.toLowerCase() === 'support';
  };

  const getUserRole = () => {
    return user?.displayRole || user?.role || user?.userType || 'Unknown';
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  // Helper functions for navigation
  const getUserRoleForNavigation = () => {
    if (!user) return 'customer';
    const role = user.role?.toLowerCase();
    
    if (role === 'admin' || role === 'super_admin') return 'admin';
    if (role === 'event_manager') return 'event_manager';
    if (role === 'support') return 'support';
    if (role === 'event_organizer') return 'event_organizer';
    return 'customer';
  };

  const getRoleDisplayName = () => {
    if (!user) return 'Guest';
    const roleMap = {
      'admin': 'Administrator',
      'super_admin': 'Super Administrator',
      'event_manager': 'Event Manager',
      'support': 'Support Staff',
      'event_organizer': 'Event Organizer',
      'customer': 'Customer'
    };
    return roleMap[user.role] || user.role || 'User';
  };

  // CRITICAL: Extract userId correctly
  const getUserId = () => {
    if (!user) return null;
    
    // Check based on role first
    if (user.role === 'support') {
      return user.support_id || user.userId || user.id;
    } else if (user.role === 'event_organizer') {
      return user.organizer_id || user.userId || user.id;
    } else if (user.role === 'event_manager') {
      return user.manager_id || user.userId || user.id;
    } else if (user.role === 'admin') {
      return user.admin_id || user.userId || user.id;
    } else {
      return user.customer_id || user.userId || user.id;
    }
  };

  const value = {
    // State
    user,
    token,
    isLoading,
    authToken,

    // Actions
    login,
    register,
    logout,
    getAuthHeader,
    updateUser,
    refreshAuth,

    // Role Checks
    hasAdminPrivileges,
    isEventManager,
    isAdmin,
    isCustomer,
    isEventOrganizer,
    isSupportStaff,
    getUserRole,
    isAuthenticated,
    getUserRoleForNavigation,
    getRoleDisplayName,
    getUserId,

    // Convenience properties - FIXED userId extraction
    userRole: user?.role || user?.userType,
    displayRole: user?.displayRole || getRoleDisplayName(),
    username: user?.username || user?.email,
    userId: getUserId(), // Use the function instead of direct property access

    // Boolean shortcuts for conditional rendering
    isSupport: user?.role === 'support',
    isOrganizer: user?.role === 'event_organizer',
    isCustomerRole: user?.role === 'customer',
    isManager: user?.role === 'event_manager',
    isSuperAdmin: user?.role === 'super_admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;