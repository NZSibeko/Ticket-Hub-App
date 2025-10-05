import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import EventListScreen from './src/screens/EventListScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import MyTicketsScreen from './src/screens/MyTicketsScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EventManagementScreen from './src/screens/EventManagementScreen';
import SearchEventsScreen from './src/screens/SearchEventsScreen';
import TicketPurchaseScreen from './src/screens/TicketPurchaseScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator for regular users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'EventsTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'TicketsTab') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="EventsTab" 
        component={SearchEventsScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen 
        name="TicketsTab" 
        component={MyTicketsScreen}
        options={{ title: 'My Tickets' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Admin Tab Navigator
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'DashboardTab') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'ManageEventsTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'ScannerTab') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'AdminProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={AdminDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="ManageEventsTab" 
        component={EventManagementScreen}
        options={{ title: 'Manage Events' }}
      />
      <Tab.Screen 
        name="ScannerTab" 
        component={ScannerScreen}
        options={{ title: 'Scanner' }}
      />
      <Tab.Screen 
        name="AdminProfileTab" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator 
          initialRouteName="Splash"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6200ee',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {/* Splash Screen */}
          <Stack.Screen 
            name="Splash" 
            component={SplashScreen} 
            options={{ headerShown: false }} 
          />

          {/* Auth Screens */}
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Registration" 
            component={RegistrationScreen}
            options={{ 
              title: 'Create Account',
              headerStyle: { backgroundColor: '#6200ee' },
              headerTintColor: '#fff',
            }}
          />

          {/* Main App with Tabs (Regular Users) */}
          <Stack.Screen 
            name="Home" 
            component={MainTabs}
            options={{ headerShown: false }}
          />

          {/* Admin App with Tabs */}
          <Stack.Screen 
            name="AdminHome" 
            component={AdminTabs}
            options={{ headerShown: false }}
          />

          {/* Event Screens (Accessible from both user and admin) */}
          <Stack.Screen 
            name="EventDetail" 
            component={EventDetailScreen}
            options={{ title: 'Event Details' }}
          />
          <Stack.Screen 
            name="EventList" 
            component={EventListScreen}
            options={{ title: 'All Events' }}
          />

          {/* Ticket Purchase Flow */}
          <Stack.Screen 
            name="PurchaseTicket" 
            component={TicketPurchaseScreen}
            options={{ title: 'Purchase Ticket' }}
          />
          <Stack.Screen 
            name="Payment" 
            component={PaymentScreen}
            options={{ title: 'Payment' }}
          />

          {/* Standalone Screens */}
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
          <Stack.Screen 
            name="MyTickets" 
            component={MyTicketsScreen}
            options={{ title: 'My Tickets' }}
          />

          {/* Admin-only Screens */}
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboard}
            options={{ title: 'Admin Dashboard' }}
          />
          <Stack.Screen 
            name="CreateEvent" 
            component={CreateEventScreen}
            options={{ title: 'Create New Event' }}
          />
          <Stack.Screen 
            name="EventManagement" 
            component={EventManagementScreen}
            options={{ title: 'Manage Events' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}