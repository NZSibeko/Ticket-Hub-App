import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';

// Import screens directly
import AdminDashboard from './src/screens/AdminDashboard';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import EventManagementScreen from './src/screens/EventManagementScreen';
import HomeScreen from './src/screens/HomeScreen.web';
import LoginScreen from './src/screens/LoginScreen';
import MyTicketsScreen from './src/screens/MyTicketsScreen.web';
import PaymentScreen from './src/screens/PaymentScreen';
import ProfileScreen from './src/screens/ProfileScreen.web';
import RegistrationScreen from './src/screens/RegistrationScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SearchEventsScreen from './src/screens/SearchEventsScreen.web';
import SplashScreen from './src/screens/SplashScreen';
import TicketPurchaseScreen from './src/screens/TicketPurchaseScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';

const Stack = createStackNavigator();
const TopTab = createMaterialTopTabNavigator();

const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6366f1" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Fixed Tab Container
const TabContainer = ({ children }) => (
  <View style={styles.tabContainer}>
    {children}
  </View>
);

const MainTabs = React.memo(() => {
  return (
    <TabContainer>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: [styles.tabBar, styles.fixedTabBar],
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#6b7280',
          tabBarLabelStyle: styles.tabLabel,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarShowIcon: true,
          tabBarIconStyle: styles.tabIcon,
        }}
      >
        <TopTab.Screen 
          name="HomeTab" 
          component={SearchEventsScreen}
          options={{ 
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="DiscoverTab" 
          component={HomeScreen}
          options={{ 
            title: 'Discover',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="TicketsTab" 
          component={MyTicketsScreen}
          options={{ 
            title: 'My Tickets',
            tabBarIcon: ({ color }) => (
              <Ionicons name="ticket" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="ProfileTab" 
          component={ProfileScreen}
          options={{ 
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={20} color={color} />
            ),
          }}
        />
      </TopTab.Navigator>
    </TabContainer>
  );
});

const AdminTabs = React.memo(() => {
  return (
    <TabContainer>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: [styles.tabBar, styles.fixedTabBar],
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#6b7280',
          tabBarLabelStyle: styles.tabLabel,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarShowIcon: true,
          tabBarIconStyle: styles.tabIcon,
        }}
      >
        <TopTab.Screen 
          name="DashboardTab" 
          component={AdminDashboard}
          options={{ 
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <Ionicons name="analytics" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="ManageEventsTab" 
          component={EventManagementScreen}
          options={{ 
            title: 'Events',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="ScannerTab" 
          component={ScannerScreen}
          options={{ 
            title: 'Scanner',
            tabBarIcon: ({ color }) => (
              <Ionicons name="qr-code" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="AdminProfileTab" 
          component={ProfileScreen}
          options={{ 
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={20} color={color} />
            ),
          }}
        />
      </TopTab.Navigator>
    </TabContainer>
  );
});

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#f8f9fa' },
            }}
          >
            {/* Auth Screens */}
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Registration" component={RegistrationScreen} />
            
            {/* Main App Tab Screens */}
            <Stack.Screen 
              name="Home" 
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="AdminHome" 
              component={AdminTabs}
              options={{ headerShown: false }}
            />
            
            {/* Modal/Detail Screens - These are at the Stack level and accessible from anywhere */}
            <Stack.Screen 
              name="EventDetail" 
              component={EventDetailScreen}
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="PurchaseTicket" 
              component={TicketPurchaseScreen}
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Payment" 
              component={PaymentScreen}
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="MyTickets" 
              component={MyTicketsScreen}
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            
            {/* Admin Screens */}
            <Stack.Screen 
              name="AdminDashboard" 
              component={AdminDashboard}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="CreateEvent" 
              component={CreateEventScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="EventManagement" 
              component={EventManagementScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Scanner" 
              component={ScannerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagementScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0.999,
    backgroundColor: '#f8f9fa',
    width: '100%',
    height: '100%',
    maxWidth: '100%',
  },
  tabContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    // CRITICAL FIX: Add paddingTop to account for the fixed tab bar
    paddingTop: 70,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 70,
    paddingBottom: 1,
  },
  fixedTabBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabIndicator: {
    backgroundColor: '#6366f1',
    height: 3,
  },
  tabIcon: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});