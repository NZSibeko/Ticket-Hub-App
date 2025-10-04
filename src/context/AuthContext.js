import React, { createContext, useContext, useState } from 'react';
import ODataService from '../services/ODataService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      // Test authentication by making a simple request
      ODataService.setAuth(username, password);
      
      // Try to fetch user data - adjust the entity set and filter as per your OData service
      const userData = await ODataService.get("zi_customer_faces", {
        $filter: `customer_id eq '${username}'`,
        $top: 1
      });
      
      if (userData && userData.length > 0) {
        const userInfo = {
          ...userData[0],
          username,
          // Don't store password in state for security
        };
        setUser(userInfo);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      // For demo purposes, allow any login if backend is not available
      if (error.message.includes('Network error') || error.message.includes('timeout')) {
        const demoUser = {
          customer_id: username,
          first_name: 'Demo',
          last_name: 'User',
          email: `${username}@demo.com`,
          username: username
        };
        setUser(demoUser);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    ODataService.clearAuth();
    setUser(null);
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      // Adjust the entity set and fields according to your OData service
      const result = await ODataService.post("zi_customer_faces", {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        phone_number: userData.phone,
        customer_id: userData.username, // or let backend generate
        account_status: 'ACTIVE'
      });
      
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      
      // For demo purposes, simulate success if backend is not available
      if (error.message.includes('Network error') || error.message.includes('timeout')) {
        return { success: true, message: 'User registered successfully (demo mode)' };
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      register,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}