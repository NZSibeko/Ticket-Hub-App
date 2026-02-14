// src/utils/checkAuthStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkAuthStorage = async () => {
  console.log('🔍 Checking auth storage...');
  
  try {
    const userData = await AsyncStorage.getItem('user');
    const token = await AsyncStorage.getItem('token');
    
    console.log('📦 Storage Contents:');
    console.log('User Data:', userData ? JSON.parse(userData) : 'No user data');
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    
    if (userData) {
      const user = JSON.parse(userData);
      console.log('\n🔑 User Details:');
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('User Type:', user.userType);
      console.log('Display Role:', user.displayRole);
      console.log('User ID:', user.userId || user.organizer_id || user.support_id || 'N/A');
    }
    
    return { user: userData ? JSON.parse(userData) : null, token };
  } catch (error) {
    console.error('❌ Error checking storage:', error);
    return { user: null, token: null };
  }
};

export const clearAuthStorage = async () => {
  console.log('🧹 Clearing auth storage...');
  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    console.log('✅ Storage cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    return false;
  }
};

export const simulateRoles = async () => {
  console.log('🎭 Simulating different user roles...');
  
  const testUsers = [
    {
      email: 'support@tickethub.co.za',
      role: 'support',
      userType: 'support',
      displayRole: 'Support Staff',
      userId: 'support-001'
    },
    {
      email: 'organizer@tickethub.co.za',
      role: 'event_organizer',
      userType: 'event_organizer',
      displayRole: 'Event Organizer',
      userId: 'organizer-001'
    },
    {
      email: 'customer@test.com',
      role: 'customer',
      userType: 'customer',
      displayRole: 'Customer',
      userId: 'customer-001'
    }
  ];
  
  for (const user of testUsers) {
    console.log(`\n💾 Saving ${user.role} user...`);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('token', `fake-token-${user.role}`);
    
    const stored = await checkAuthStorage();
    console.log(`✅ ${user.role} user saved successfully`);
  }
  
  // Clear after demo
  await clearAuthStorage();
};