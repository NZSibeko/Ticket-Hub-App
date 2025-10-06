import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const API_URL = 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingLogin();
  }, []);

  const checkExistingLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setUserToken(token);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking existing login:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      // First try customer login
      let response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      // If customer login succeeds, add role and set user
      let { token, user } = response.data;
      user = { ...user, role: 'customer' };

      // Store token and user in async storage and context
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      setUser(user);
      setUserToken(token);

      setLoading(false);
      return { success: true };
    } catch (customerError) {
      // If customer login fails, try admin login
      try {
        const adminResponse = await axios.post(`${API_URL}/api/admin/auth/login`, {
          username,
          password,
        });

        // If admin login succeeds, we get token and admin
        const { token, admin } = adminResponse.data;
        // We use the admin object and set it as the user, and add role
        const user = { ...admin, role: 'admin' };

        // Store token and user in async storage and context
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        setUser(user);
        setUserToken(token);

        setLoading(false);
        return { success: true };
      } catch (adminError) {
        setLoading(false);
        console.error('Admin login error:', adminError);
        return { 
          success: false, 
          error: adminError.response?.data?.error || 'Login failed' 
        };
      }
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setUserToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeader = () => {
    return userToken ? { Authorization: `Bearer ${userToken}` } : {};
  };

  const value = {
    user,
    userToken,
    loading,
    login,
    logout,
    getAuthHeader,
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