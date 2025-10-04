import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import ODataService from './src/services/ODataService';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import EventListScreen from './src/screens/EventListScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import TicketPurchaseScreen from './src/screens/TicketPurchaseScreen';
import MyTicketsScreen from './src/screens/MyTicketsScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize OData service to point to local backend
    ODataService.init({
      baseUrl: 'http://localhost:3000',
      servicePath: '',
      timeout: 10000,
      auth: {
        username: '',
        password: ''
      }
    });
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#000000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Registration" 
            component={RegistrationScreen}
            options={{ title: 'Create Account' }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ 
              title: 'Ticket-Hub',
              headerLeft: null 
            }}
          />
          <Stack.Screen 
            name="Events" 
            component={EventListScreen}
            options={{ title: 'Upcoming Events' }}
          />
          <Stack.Screen 
            name="EventDetail" 
            component={EventDetailScreen}
            options={{ title: 'Event Details' }}
          />
          <Stack.Screen 
            name="PurchaseTicket" 
            component={TicketPurchaseScreen}
            options={{ title: 'Purchase Ticket' }}
          />
          <Stack.Screen 
            name="MyTickets" 
            component={MyTicketsScreen}
            options={{ title: 'My Tickets' }}
          />
          <Stack.Screen 
            name="Scanner" 
            component={ScannerScreen}
            options={{ title: 'Scan Ticket' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'My Profile' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}