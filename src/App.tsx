```tsx
import React, { useState } from 'react';
import Login from '../components/Login';
import AuthService from '../services/auth.service';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await AuthService.login(username, password);
      if (response.data.success) {
        setIsLoggedIn(true);
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('An error occurred. Please try