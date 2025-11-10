// src/context/AuthContext.js - COMPLETE FIXED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();
const API_URL = 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store auth token separately for easy access
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      console.log('🔐 Checking for existing authentication...');
      const [userData, storedToken] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token')
      ]);

      console.log('📱 Stored user data:', userData);
      console.log('🔑 Stored token found:', !!storedToken);

      if (userData && storedToken) {
        const parsedUser = JSON.parse(userData);
        console.log('👤 Restoring user:', parsedUser);
        
        // Normalize role and userType to consistent format
        if (parsedUser.role === 'event-manager' || parsedUser.userType === 'event-manager') {
          parsedUser.role = 'event_manager';
          parsedUser.userType = 'event_manager';
        }
        
        // Ensure both role and userType are set consistently
        if (!parsedUser.userType && parsedUser.role) {
          parsedUser.userType = parsedUser.role;
        }
        if (!parsedUser.role && parsedUser.userType) {
          parsedUser.role = parsedUser.userType;
        }
        
        // Add display role if missing
        if (!parsedUser.displayRole) {
          parsedUser.displayRole = getDisplayRole(parsedUser.role || parsedUser.userType);
        }
        
        setUser(parsedUser);
        setToken(storedToken);
        setAuthToken(storedToken); // Set the separate authToken variable
        console.log('✅ User restored with role:', parsedUser.role, 'userType:', parsedUser.userType);
      } else {
        console.log('ℹ️ No existing authentication found');
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayRole = (role) => {
    const roleMap = {
      'event_manager': 'Event Manager',
      'admin': 'Administrator',
      'customer': 'Customer',
      'SUPER_ADMIN': 'Super Admin',
      'EVENT_MANAGER': 'Event Manager',
      'SUPPORT': 'Support'
    };
    return roleMap[role] || 'User';
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login for:', username);
      
      // Try event manager login FIRST (since that's what you're testing)
      try {
        console.log('💼 Trying event manager login...');
        const managerResponse = await axios.post(`${API_URL}/api/event-manager/auth/login`, {
          username,
          password
        });

        if (managerResponse.data.success) {
          console.log('✅ Event manager login successful');
          console.log('📦 Response data:', managerResponse.data);
          
          const userData = {
            ...managerResponse.data.user,
            role: 'event_manager',
            userType: 'event_manager',
            displayRole: 'Event Manager'
          };
          
          const authToken = managerResponse.data.token;
          
          // Store in AsyncStorage
          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authToken)
          ]);
          
          // Update state
          setUser(userData);
          setToken(authToken);
          setAuthToken(authToken); // Set the separate authToken variable
          
          console.log('✅ User data stored successfully');
          console.log('✅ Token stored successfully');
          
          return { success: true, user: userData, token: authToken };
        }
      } catch (managerError) {
        console.log('❌ Event manager login failed:', managerError.response?.status);
        if (managerError.response?.data) {
          console.log('📄 Error details:', managerError.response.data);
        }
      }

      // Try customer login
      try {
        console.log('👤 Trying customer login...');
        const customerResponse = await axios.post(`${API_URL}/api/auth/login`, {
          username,
          password
        });

        if (customerResponse.data.success) {
          console.log('✅ Customer login successful');
          
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
          setAuthToken(authToken); // Set the separate authToken variable
          
          return { success: true, user: userData, token: authToken };
        }
      } catch (customerError) {
        console.log('❌ Customer login failed:', customerError.response?.status);
      }

      // Try admin login
      try {
        console.log('👑 Trying admin login...');
        const adminResponse = await axios.post(`${API_URL}/api/admin/auth/login`, {
          username,
          password
        });

        if (adminResponse.data.success) {
          console.log('✅ Admin login successful');
          
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
          setAuthToken(authToken); // Set the separate authToken variable
          
          return { success: true, user: userData, token: authToken };
        }
      } catch (adminError) {
        console.log('❌ Admin login failed:', adminError.response?.status);
      }

      // If all attempts fail
      console.log('❌ All login attempts failed');
      return { 
        success: false, 
        error: 'Invalid credentials. Please check your username and password.' 
      };

    } catch (error) {
      console.error('💥 Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please try again.' 
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      await Promise.all([
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('token')
      ]);
      setUser(null);
      setToken(null);
      setAuthToken(null); // Clear the separate authToken variable
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };

  // FIXED: Proper getAuthHeader function
  const getAuthHeader = () => {
    try {
      // Use the token from the separate authToken variable or from state
      const currentToken = authToken || token;
      
      console.log('🔐 Getting auth header with token:', currentToken ? 'Token exists' : 'No token');
      
      if (!currentToken) {
        console.log('❌ No token available for auth header');
        return {
          'Content-Type': 'application/json'
        };
      }

      // Ensure the token is properly formatted
      const cleanToken = currentToken.replace(/^"(.*)"$/, '$1'); // Remove quotes if present
      console.log('✅ Auth header created with token length:', cleanToken.length);
      
      return {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('❌ Error in getAuthHeader:', error);
      return {
        'Content-Type': 'application/json'
      };
    }
  };

  const updateUser = async (updatedUserData) => {
    try {
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

  // Simplified and consistent role checking
  const hasAdminPrivileges = () => {
    return user?.userType === 'admin' || user?.role === 'admin';
  };

  const isEventManager = () => {
    return user?.userType === 'event_manager' || user?.role === 'event_manager';
  };

  const isAdmin = () => {
    return user?.userType === 'admin' || user?.role === 'admin';
  };

  const isCustomer = () => {
    return user?.userType === 'customer' || user?.role === 'customer';
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
    authToken, // Export authToken for direct access
    
    // Actions
    login,
    logout,
    getAuthHeader,
    updateUser,
    refreshAuth,
    
    // Role checks
    hasAdminPrivileges,
    isEventManager,
    isAdmin,
    isCustomer,
    getUserRole,
    isAuthenticated,
    
    // Convenience getters
    userRole: user?.role || user?.userType,
    displayRole: user?.displayRole || getDisplayRole(user?.role || user?.userType),
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