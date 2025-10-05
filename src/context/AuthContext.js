import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const API_URL = 'http://localhost:3000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Load saved token on app start
  useEffect(() => {
    loadSavedAuth();
  }, []);

  const loadSavedAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('userData');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading saved auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        const { token: authToken, user: userData } = response.data;

        // Save to state
        setToken(authToken);
        setUser(userData);

        // Save to AsyncStorage
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);

      if (response.data.success) {
        const { token: authToken, user: newUser } = response.data;

        // Save to state
        setToken(authToken);
        setUser(newUser);

        // Save to AsyncStorage
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('userData', JSON.stringify(newUser));

        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear state
      setUser(null);
      setToken(null);

      // Clear AsyncStorage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      loading, 
      login, 
      logout, 
      register,
      getAuthHeader,
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