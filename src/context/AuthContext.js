// src/context/AuthContext.js - FINAL COMPLETE & FIXED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();
const API_URL = 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Separate token for header use (prevents stale closure issues)
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      console.log('Checking for existing authentication...');
      const [userData, storedToken] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token')
      ]);

      console.log('Stored user data:', userData);
      console.log('Stored token found:', !!storedToken);

      if (userData && storedToken) {
        const parsedUser = JSON.parse(userData);
        console.log('Restoring user:', parsedUser);

        // === ROLE NORMALIZATION: Force consistent format ===
        const normalizeRole = (role) => {
          if (!role) return null;
          const r = role.toString().toLowerCase().trim();
          if (['event-manager', 'event_manager', 'eventmanager'].includes(r)) return 'event_manager';
          if (['admin', 'administrator', 'super_admin', 'superadmin', 'support'].includes(r)) return 'admin';
          if (['customer', 'user'].includes(r)) return 'customer';
          return r;
        };

        const normalizedRole = normalizeRole(parsedUser.role || parsedUser.userType);
        parsedUser.role = normalizedRole;
        parsedUser.userType = normalizedRole;

        // Ensure displayRole
        if (!parsedUser.displayRole) {
          const roleMap = {
            'event_manager': 'Event Manager',
            'admin': 'Administrator',
            'customer': 'Customer'
          };
          parsedUser.displayRole = roleMap[normalizedRole] || 'User';
        }

        setUser(parsedUser);
        setToken(storedToken);
        setAuthToken(storedToken);
        console.log('User restored with role:', parsedUser.role);
      } else {
        console.log('No existing authentication found');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Attempting login for:', username);

      // === 1. Try Event Manager Login ===
      try {
        console.log('Trying event manager login...');
        const managerResponse = await axios.post(`${API_URL}/api/event-manager/auth/login`, {
          username,
          password
        });

        if (managerResponse.data.success) {
          console.log('Event manager login successful');
          const userData = {
            ...managerResponse.data.user,
            role: 'event_manager',
            userType: 'event_manager',
            displayRole: 'Event Manager'
          };
          const authToken = managerResponse.data.token;

          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authToken)
          ]);

          setUser(userData);
          setToken(authToken);
          setAuthToken(authToken);

          return { success: true, user: userData, token: authToken };
        }
      } catch (managerError) {
        console.log('Event manager login failed:', managerError.response?.status);
      }

      // === 2. Try Customer Login ===
      try {
        console.log('Trying customer login...');
        const customerResponse = await axios.post(`${API_URL}/api/auth/login`, {
          username,
          password
        });

        if (customerResponse.data.success) {
          console.log('Customer login successful');
          const userData = {
            ...customerResponse.data.user,
            role: 'customer',
            userType: 'customer',
            displayRole: 'Customer'
          };
          const authToken = customerResponse.data.token;

          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authToken)
          ]);

          setUser(userData);
          setToken(authToken);
          setAuthToken(authToken);

          return { success: true, user: userData, token: authToken };
        }
      } catch (customerError) {
        console.log('Customer login failed:', customerError.response?.status);
      }

      // === 3. Try Admin Login ===
      try {
        console.log('Trying admin login...');
        const adminResponse = await axios.post(`${API_URL}/api/admin/auth/login`, {
          username,
          password
        });

        if (adminResponse.data.success) {
          console.log('Admin login successful');
          const userData = {
            ...adminResponse.data.admin,
            role: adminResponse.data.admin.role || 'admin',
            userType: 'admin',
            displayRole: 'Administrator'
          };
          const authToken = adminResponse.data.token;

          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authToken)
          ]);

          setUser(userData);
          setToken(authToken);
          setAuthToken(authToken);

          return { success: true, user: userData, token: authToken };
        }
      } catch (adminError) {
        console.log('Admin login failed:', adminError.response?.status);
      }

      // === All Failed ===
      console.log('All login attempts failed');
      return {
        success: false,
        error: 'Invalid credentials. Please check your username and password.'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      await Promise.all([
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('token')
      ]);
      setUser(null);
      setToken(null);
      setAuthToken(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // === SECURE & RELIABLE AUTH HEADER ===
  const getAuthHeader = () => {
    const currentToken = authToken || token;
    console.log('Getting auth header - token exists:', !!currentToken);

    if (!currentToken) {
      return { 'Content-Type': 'application/json' };
    }

    const cleanToken = currentToken.replace(/^"(.*)"$/, '$1');
    return {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  };

  const updateUser = async (updatedUserData) => {
    try {
      const newUserData = { ...user, ...updatedUserData };
      await AsyncStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      console.log('User data updated');
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const refreshAuth = async () => {
    try {
      console.log('Refreshing authentication...');
      await checkExistingAuth();
    } catch (error) {
      console.error('Error refreshing auth:', error);
    }
  };

  // === ROLE CHECKS (CASE-INSENSITIVE) ===
  const hasAdminPrivileges = () => {
    const role = user?.role?.toLowerCase();
    return role === 'admin' || role === 'super_admin' || role === 'support';
  };

  const isEventManager = () => {
    return user?.role?.toLowerCase() === 'event_manager';
  };

  const isAdmin = () => {
    return hasAdminPrivileges();
  };

  const isCustomer = () => {
    return user?.role?.toLowerCase() === 'customer';
  };

  const getUserRole = () => {
    return user?.displayRole || user?.role || user?.userType || 'Unknown';
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const value = {
    // State
    user,
    token,
    isLoading,
    authToken,

    // Actions
    login,
    logout,
    getAuthHeader,
    updateUser,
    refreshAuth,

    // Role Checks
    hasAdminPrivileges,
    isEventManager,
    isAdmin,
    isCustomer,
    getUserRole,
    isAuthenticated,

    // Convenience
    userRole: user?.role || user?.userType,
    displayRole: user?.displayRole || getUserRole(),
    username: user?.username || user?.email,
    userId: user?.manager_id || user?.customer_id || user?.admin_id,
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