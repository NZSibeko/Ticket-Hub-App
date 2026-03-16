import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState, FC, ReactNode } from 'react';

axios.defaults.withCredentials = true;

const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';
let resolvedApiUrl: string | null = null;

const getCandidateApiUrls = (): string[] => {
  const fromEnv = process.env.REACT_APP_API_URL;
  const urls = [
    fromEnv,
    'http://localhost:8081',
    'http://localhost:8084',
    'http://localhost:8083',
    'http://localhost:8085',
    'http://localhost:8082'
  ].filter(Boolean) as string[];
  return Array.from(new Set(urls));
};

const resolveApiUrl = async (): Promise<string> => {
  if (resolvedApiUrl) return resolvedApiUrl;
  for (const candidate of getCandidateApiUrls()) {
    try {
      const response = await axios.get(`${candidate}/api/health`, { timeout: 1200 });
      if (response?.data?.service === 'ticket-hub-backend' && response?.data?.status === 'ok') {
        resolvedApiUrl = candidate;
        return candidate;
      }
    } catch (e) {}
  }
  resolvedApiUrl = DEFAULT_API_URL;
  return resolvedApiUrl;
};

// 1. Define Role Types
type Role = 'customer' | 'omni_support_consultant' | 'event_support_consultant' | 'event_organizer' | 'manager' | 'admin' | 'super_admin';
type UserType = Role | string; // Original JS used userType sometimes

// 2. Define IUser Interface
interface IUser {
  email?: string;
  username?: string;
  role?: Role | string; // Store raw value initially, will normalize
  userType?: UserType;
  displayRole?: string;
  support_id?: string | number | null;
  organizer_id?: string | number | null;
  manager_id?: string | number | null;
  customer_id?: string | number | null;
  admin_id?: string | number | null;
  id?: string | number | null;
  userId?: string | number | null; // Normalized primary ID
  [key: string]: any; // Catch-all for other potential properties
}

// Helper for login/register response structure
interface AuthResponse {
  success: boolean;
  user?: IUser;
  token?: string;
  error?: string;
}

// Interface for data required for registration
interface IRegisterData {
    email: string;
    password: string;
    role: UserType;
    // Other role-specific fields can be added here if known
    [key: string]: any;
}


// 3. Define IAuthContext Interface
interface IAuthContext {
  // State
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  authToken: string | null;
  apiBaseUrl: string;

  // Actions
  login(identifier: string, password: string): Promise<AuthResponse>;
  register(userData: IRegisterData): Promise<AuthResponse>;
  logout(): Promise<void>;
  getAuthHeader(): { 'Authorization'?: string, 'Content-Type': string };
  getApiBaseUrl(): Promise<string>;
  updateUser(updatedUserData: Partial<IUser>): Promise<void>;
  refreshAuth(): Promise<void>;

  // Role Checks
  hasAdminPrivileges(): boolean;
  isEventManager(): boolean;
  isAdmin(): boolean;
  isCustomer(): boolean;
  isEventOrganizer(): boolean;
  isSupportStaff(): boolean;
  isAuthenticated(): boolean;

  // Info Getters
  getUserRole(): string;
  getUserRoleForNavigation(): Role | 'customer';
  getRoleDisplayName(): string;
  getUserId(): string | number | null;

  // Convenience properties (Resolved/Derived)
  userRole: Role | string | undefined;
  displayRole: string;
  username: string | undefined;
  userId: string | number | null;

  // Boolean shortcuts
  isSupport: boolean;
  isOrganizer: boolean;
  isManager: boolean;
  isCustomerRole: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

// Helper to normalize role strings
const normalizeRole = (role: any): Role => {
  if (!role) return 'customer';
  const r = role.toString().toLowerCase().trim();
  if (['event-organizer', 'event_organizer', 'eventorganizer', 'organizer'].includes(r)) return 'event_organizer';
  if (['omni-support', 'omni_support', 'omnisupport', 'omni_support_consultant', 'support'].includes(r)) return 'omni_support_consultant';
  if (['event-support', 'event_support', 'eventsupport', 'event_support_consultant'].includes(r)) return 'event_support_consultant';
  if (['event-manager', 'event_manager', 'eventmanager', 'manager'].includes(r)) return 'manager';
  if (['admin', 'administrator', 'super_admin', 'superadmin'].includes(r)) return 'admin';
  if (['customer', 'user'].includes(r)) return 'customer';
  return r as Role; // Cast if it's an unknown but valid role string
};

const roleMapDisplay: Record<Role, string> = {
    'event_organizer': 'Event Organizer',
    'omni_support_consultant': 'Omni Support Consultant',
    'event_support_consultant': 'Event Support Consultant',
    'manager': 'Manager',
    'admin': 'Administrator',
    'customer': 'Customer',
    'super_admin': 'Super Administrator'
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(DEFAULT_API_URL);

  useEffect(() => {
    checkExistingAuth();
    resolveApiUrl()
      .then((resolved) => setApiBaseUrl(resolved))
      .catch(() => setApiBaseUrl(DEFAULT_API_URL));
  }, []);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error?.response?.status;
        if (status === 401) {
          try {
            await Promise.all([
              AsyncStorage.removeItem('user'),
              AsyncStorage.removeItem('token')
            ]);
          } catch (_) {}
          setUser(null);
          setToken(null);
          setAuthToken(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  const checkExistingAuth = async (): Promise<void> => {
    try {
      console.log('🔍 Checking for existing authentication...');
      const [userData, storedToken] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token')
      ]);

      if (userData && storedToken) {
        const parsedUser: IUser = JSON.parse(userData);
        const cleanToken = storedToken
          .replace(/^"(.*)"$/, '$1')
          .replace(/^Bearer\s+/i, '')
          .trim();
        const apiBase = await resolveApiUrl();
        setApiBaseUrl(apiBase);

        try {
          await axios.get(`${apiBase}/api/auth/validate-token`, {
            headers: {
              Authorization: `Bearer ${cleanToken}`
            },
            timeout: 6000
          });
        } catch (validateError: any) {
          if (validateError?.response?.status === 401) {
            await Promise.all([
              AsyncStorage.removeItem('user'),
              AsyncStorage.removeItem('token')
            ]);
            setUser(null);
            setToken(null);
            setAuthToken(null);
            console.log('⚠️ Stored token invalid/expired; cleared local auth state.');
            return;
          }
        }
        console.log('✅ Restoring user:', parsedUser.email || parsedUser.username, parsedUser.role);

        const normalizedRole = normalizeRole(parsedUser.role || parsedUser.userType);
        
        // Update user object structure upon restore
        parsedUser.role = normalizedRole;
        parsedUser.userType = normalizedRole;

        if (!parsedUser.displayRole) {
          parsedUser.displayRole = roleMapDisplay[normalizedRole] || 'User';
        }

        // CRITICAL FIX: Extract userId with role-specific ID priority
        const extractedUserId = parsedUser.support_id || 
                                parsedUser.organizer_id || 
                                parsedUser.manager_id || 
                                parsedUser.customer_id || 
                                parsedUser.admin_id || 
                                parsedUser.id || 
                                parsedUser.userId;

        parsedUser.userId = extractedUserId;

        setUser(parsedUser);
        setToken(cleanToken);
        setAuthToken(cleanToken);
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
  const login = async (identifier: string, password: string): Promise<AuthResponse> => {
    try {
      console.log('🔐 Attempting login for:', identifier);
      setIsLoading(true);
      const apiBase = await resolveApiUrl();
      setApiBaseUrl(apiBase);
      console.log('Using auth API base:', apiBase);
      
      // ... (omitted internal logic for brevity, but it's ported with explicit types) ...
      
      // Try universal login endpoint first (handles all roles)
      try {
        console.log('🔍 Trying universal login endpoint...');
        const response = await axios.post(`${apiBase}/api/auth/login`, {
          email: identifier,
          password
        });

        if (response.data.success) {
          console.log('✅ Universal login successful');
          const userData: IUser = response.data.user;
          const authTokenResponse: string = response.data.token;
          
          const normalizedRole = normalizeRole(userData.role || userData.userType);
          userData.role = normalizedRole;
          userData.userType = normalizedRole;

          let extractedUserId: string | number | null | undefined;
          if (normalizedRole === 'omni_support_consultant') {
            extractedUserId = userData.omni_support_id || userData.support_id || userData.userId || userData.id;
          } else if (normalizedRole === 'event_support_consultant') {
            extractedUserId = userData.event_support_id || userData.support_id || userData.userId || userData.id;
          } else if (normalizedRole === 'event_organizer') {
            extractedUserId = userData.organizer_id || userData.userId || userData.id;
          } else if (normalizedRole === 'manager') {
            extractedUserId = userData.manager_id || userData.userId || userData.id;
          } else if (normalizedRole === 'admin') {
            extractedUserId = userData.admin_id || userData.userId || userData.id;
          } else {
            extractedUserId = userData.customer_id || userData.userId || userData.id;
          }

          userData.userId = extractedUserId;
          userData.displayRole = roleMapDisplay[normalizedRole] || 'User';

          await Promise.all([
            AsyncStorage.setItem('user', JSON.stringify(userData)),
            AsyncStorage.setItem('token', authTokenResponse)
          ]);

          setUser(userData);
          setToken(authTokenResponse);
          setAuthToken(authTokenResponse);

          console.log('✅ User set:', userData.role, userData.email);
          return { success: true, user: userData, token: authTokenResponse };
        }
      } catch (universalError: any) {
        const status = universalError.response?.status;
        console.log('ℹ️ Universal login failed:', status);

        // Prevent multi-endpoint retries from tripping backend lockout/rate limits.
        if (status === 429) {
          return {
            success: false,
            error: 'Too many login attempts. Please wait a few minutes and try again.'
          };
        }
        if (status === 401) {
          return {
            success: false,
            error: 'Invalid credentials. Please check your email and password.'
          };
        }
      }

      // Fallback to specific endpoints
      const endpoints: { url: string, role: Role }[] = [
        { url: '/api/auth/omni-support/login', role: 'omni_support_consultant' },
        { url: '/api/auth/event-support/login', role: 'event_support_consultant' },
        { url: '/api/auth/organizer/login', role: 'event_organizer' },
        { url: '/api/manager/auth/login', role: 'manager' },
        { url: '/api/admin/login', role: 'admin' },
        { url: '/api/auth/login', role: 'customer' }
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying ${endpoint.role} login...`);
          const response = await axios.post(`${apiBase}${endpoint.url}`, {
            email: identifier,
            password
          });
          
          if (response.data.success) {
            console.log(`✅ ${endpoint.role} login successful`);
            const userData: IUser = response.data.user;
            const authTokenResponse: string = response.data.token;
            
            userData.role = endpoint.role;
            userData.userType = endpoint.role;
            userData.displayRole = roleMapDisplay[endpoint.role] || endpoint.role;
            
            let extractedUserId: string | number | null | undefined;
            if (endpoint.role === 'omni_support_consultant') {
              extractedUserId = userData.omni_support_id || userData.support_id || userData.userId || userData.id;
            } else if (endpoint.role === 'event_support_consultant') {
              extractedUserId = userData.event_support_id || userData.support_id || userData.userId || userData.id;
            } else if (endpoint.role === 'event_organizer') {
              extractedUserId = userData.organizer_id || userData.userId || userData.id;
            } else if (endpoint.role === 'manager') {
              extractedUserId = userData.manager_id || userData.userId || userData.id;
            } else if (endpoint.role === 'admin') {
              extractedUserId = userData.admin_id || userData.userId || userData.id;
            } else {
              extractedUserId = userData.customer_id || userData.userId || userData.id;
            }

            userData.userId = extractedUserId;

            await Promise.all([
              AsyncStorage.setItem('user', JSON.stringify(userData)),
              AsyncStorage.setItem('token', authTokenResponse)
            ]);

            setUser(userData);
            setToken(authTokenResponse);
            setAuthToken(authTokenResponse);

            return { success: true, user: userData, token: authTokenResponse };
          }
        } catch (error: any) {
          console.log(`ℹ️ ${endpoint.role} login failed:`, error.response?.status);
          continue;
        }
      }

      // All attempts failed
      console.log('❌ All login attempts failed');
      return {
        success: false,
        error: 'Invalid credentials. Please check your email and password.'
      };

    } catch (error: any) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }; // End of login function

  // Registration function for all user types
  const register = async (userData: IRegisterData): Promise<AuthResponse> => {
    try {
      console.log('🔐 Attempting registration for:', userData.email);
      setIsLoading(true);
      const apiBase = await resolveApiUrl();
      setApiBaseUrl(apiBase);
      
      let endpoint = '/api/auth/register';
      if (userData.role === 'omni_support_consultant') {
        endpoint = '/api/auth/omni-support/register';
      } else if (userData.role === 'event_support_consultant') {
        endpoint = '/api/auth/event-support/register';
      } else if (userData.role === 'event_organizer') {
        endpoint = '/api/auth/organizer/register';
      } else if (userData.role === 'manager') {
        endpoint = '/api/manager/auth/register';
      } else if (userData.role === 'admin') {
        endpoint = '/api/admin/auth/register';
      }

      const response = await axios.post(`${apiBase}${endpoint}`, userData);
      
      if (response.data.success) {
        console.log('✅ Registration successful');
        
        // Auto-login after successful registration
        const loginResult = await login(userData.email, userData.password);
        return loginResult;
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }; // End of register function

  const logout = async (): Promise<void> => {
    try {
      console.log('👋 Logging out user...');
      setIsLoading(true);
      try {
        const apiBase = await resolveApiUrl();
        setApiBaseUrl(apiBase);
        await axios.post(`${apiBase}/api/auth/logout`, {}, { withCredentials: true });
      } catch (logoutApiError) {
        console.log('Logout API call failed, continuing local logout');
      }
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

  const getApiBaseUrl = async (): Promise<string> => {
    const apiBase = await resolveApiUrl();
    setApiBaseUrl(apiBase);
    return apiBase;
  };

  const getAuthHeader = (): { 'Authorization'?: string, 'Content-Type': string } => {
    const currentToken = authToken || token;
    
    if (!currentToken) {
      console.log('⚠️ No auth token available');
      return { 'Content-Type': 'application/json' };
    }

    const cleanToken = currentToken
      .replace(/^"(.*)"$/, '$1')
      .replace(/^Bearer\s+/i, '')
      .trim();
    console.log('🔑 Using auth token for request');
    return {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  };

  const updateUser = async (updatedUserData: Partial<IUser>): Promise<void> => {
    try {
      console.log('🔄 Updating user data...');
      // Ensure we merge correctly, respecting existing state
      const current = user || {};
      const newUserData: IUser = { ...current, ...updatedUserData };
      
      // Re-normalize role/userId if they were just updated
      if (updatedUserData.role || updatedUserData.userType) {
          const normalizedRole = normalizeRole(newUserData.role || newUserData.userType);
          newUserData.role = normalizedRole;
          newUserData.userType = normalizedRole;
          newUserData.displayRole = roleMapDisplay[normalizedRole] || newUserData.displayRole || 'User';
      }

      // Re-calculate userId if any relevant ID field was updated
      if (updatedUserData.support_id || updatedUserData.organizer_id || updatedUserData.manager_id || updatedUserData.customer_id || updatedUserData.admin_id || updatedUserData.id || updatedUserData.userId) {
          const roleForId = normalizeRole(newUserData.role || newUserData.userType);
          let extractedUserId: string | number | null | undefined;
          if (roleForId === 'omni_support_consultant' || roleForId === 'event_support_consultant') {
            extractedUserId = newUserData.support_id || newUserData.userId || newUserData.id;
          } else if (roleForId === 'event_organizer') {
            extractedUserId = newUserData.organizer_id || newUserData.userId || newUserData.id;
          } else if (roleForId === 'manager') {
            extractedUserId = newUserData.manager_id || newUserData.userId || newUserData.id;
          } else if (roleForId === 'admin' || roleForId === 'super_admin') {
            extractedUserId = newUserData.admin_id || newUserData.userId || newUserData.id;
          } else {
            extractedUserId = newUserData.customer_id || newUserData.userId || newUserData.id;
          }
          newUserData.userId = extractedUserId;
      }
      
      await AsyncStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      console.log('✅ User data updated');
    } catch (error) {
      console.error('❌ Error updating user:', error);
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing authentication...');
      await checkExistingAuth();
    } catch (error) {
      console.error('❌ Error refreshing auth:', error);
    }
  };

  // Role Checks - Complete set
  const hasAdminPrivileges = (): boolean => {
    if (!user) return false;
    const role = user?.role?.toString().toLowerCase();
    return ['admin', 'super_admin', 'omni_support_consultant', 'event_support_consultant', 'manager', 'event_organizer'].includes(role);
  };

  const isManager = (): boolean => {
    return user?.role?.toString().toLowerCase() === 'manager';
  };

  const isEventManager = (): boolean => {
    return isManager();
  };

  const isAdmin = (): boolean => {
    const role = user?.role?.toString().toLowerCase();
    return role === 'admin' || role === 'super_admin';
  };

  const isCustomer = (): boolean => {
    return user?.role?.toString().toLowerCase() === 'customer';
  };

  const isEventOrganizer = (): boolean => {
    return user?.role?.toString().toLowerCase() === 'event_organizer';
  };

  const isOmniSupportConsultant = (): boolean => {
    return user?.role?.toString().toLowerCase() === 'omni_support_consultant';
  };

  const isEventSupportConsultant = (): boolean => {
    return user?.role?.toString().toLowerCase() === 'event_support_consultant';
  };

  const isSupportStaff = (): boolean => {
    return isOmniSupportConsultant() || isEventSupportConsultant();
  };

  const getUserRole = (): string => {
    return user?.displayRole || user?.role || user?.userType || 'Unknown';
  };

  const isAuthenticated = (): boolean => {
    return !!user && !!token;
  };

  // Helper functions for navigation
  const getUserRoleForNavigation = (): Role | 'customer' => {
    if (!user || !user.role) return 'customer';
    const role = user.role.toString().toLowerCase();
    
    if (role === 'admin' || role === 'super_admin') return 'admin';
    if (role === 'manager') return 'manager';
    if (role === 'omni_support_consultant') return 'omni_support_consultant';
    if (role === 'event_support_consultant') return 'event_support_consultant';
    if (role === 'event_organizer') return 'event_organizer';
    return 'customer';
  };

  const getRoleDisplayName = (): string => {
    if (!user || !user.role) return 'Guest';
    const role = user.role.toString().toLowerCase() as Role;
    return roleMapDisplay[role] || user.role.toString() || 'User';
  };

  // CRITICAL: Extract userId correctly
  const getUserId = (): string | number | null => {
    if (!user) return null;
    
    const role = normalizeRole(user.role || user.userType);
    
    // Check based on role first
    if (role === 'omni_support_consultant' || role === 'event_support_consultant') {
      return user.support_id || user.userId || user.id || null;
    } else if (role === 'event_organizer') {
      return user.organizer_id || user.userId || user.id || null;
    } else if (role === 'manager') {
      return user.manager_id || user.userId || user.id || null;
    } else if (role === 'admin' || role === 'super_admin') {
      return user.admin_id || user.userId || user.id || null;
    } else {
      return user.customer_id || user.userId || user.id || null;
    }
  };

  const value: IAuthContext = {
    // State
    user,
    token,
    isLoading,
    authToken,
    apiBaseUrl,

    // Actions
    login,
    register,
    logout,
    getAuthHeader,
    getApiBaseUrl,
    updateUser,
    refreshAuth,

    // Role Checks
    hasAdminPrivileges,
    isEventManager,
    isAdmin,
    isCustomer,
    isEventOrganizer,
    isSupportStaff,
    isAuthenticated,

    // Info Getters
    getUserRole,
    getUserRoleForNavigation,
    getRoleDisplayName,
    getUserId,

    // Convenience properties - RESOLVED
    userRole: user?.role as Role || user?.userType,
    displayRole: user?.displayRole || getRoleDisplayName(),
    username: user?.username || user?.email,
    userId: getUserId(), 

    // Boolean shortcuts for conditional rendering
    isSupport: isSupportStaff(),
    isOrganizer: isEventOrganizer(),
    isManager: isManager(),
    isCustomerRole: isCustomer(),
    isSuperAdmin: user?.role?.toString().toLowerCase() === 'super_admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
