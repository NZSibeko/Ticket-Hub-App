import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Import screens directly
import AdminDashboardScreen from './src/screens/AdminDashboardScreen.web';
import AdminToolsDashboard from './src/screens/AdminToolsDashboard.web';
import CreateEventScreen from './src/screens/CreateEventScreen.web';
import DiscoverScreen from './src/screens/DiscoverScreen.web';
import EventDetailScreen from './src/screens/EventDetailScreen';
import EventManagementScreen from './src/screens/EventManagementScreen.web';
import EventPlannerScreen from './src/screens/EventPlannerScreen.web';
import HelpCenterScreen from './src/screens/HelpCenterScreen.web';
import LoginScreen from './src/screens/LoginScreen';
import MyTicketsScreen from './src/screens/MyTicketsScreen.web';
import PaymentScreen from './src/screens/PaymentScreen';
import PaymentSuccess from './src/screens/PaymentSuccessScreen.web';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen.web';
import ProfileScreen from './src/screens/ProfileScreen.web';
import RegistrationScreen from './src/screens/RegistrationScreen';
import ScannerScreen from './src/screens/ScannerScreen.web';
import SearchEventsScreen from './src/screens/SearchEventsScreen.web';
import TermsConditionsScreen from './src/screens/TermsConditionsScreen.web';
import TicketPurchaseScreen from './src/screens/TicketPurchaseScreen';
import UserManagementDashboard from './src/screens/UserManagementDashboard.web';

const Stack = createStackNavigator();
const TopTab = createMaterialTopTabNavigator();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

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

// Customer Tabs Navigator - Browse Events, Discover, My Tickets, Profile
const CustomerTabs = () => {
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
        sceneContainerStyle={{
          pointerEvents: 'auto',
        }}
      >
        <TopTab.Screen 
          name="BrowseEvents" 
          component={SearchEventsScreen}
          options={{ 
            title: 'Browse Events',
            tabBarIcon: ({ color }) => (
              <Ionicons name="search" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Discover" 
          component={DiscoverScreen}
          options={{ 
            title: 'Discover',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="MyTickets" 
          component={MyTicketsScreen}
          options={{ 
            title: 'My Tickets',
            tabBarIcon: ({ color }) => (
              <Ionicons name="ticket" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Profile" 
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
};

// Admin Tabs Navigator - Admin Tools Dashboard, Events, Users, Profile
const AdminTabs = () => {
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
        sceneContainerStyle={{
          pointerEvents: 'auto',
        }}
      >
        <TopTab.Screen 
          name="AdminDashboard" 
          component={AdminToolsDashboard}
          options={{ 
            title: 'Admin Tools',
            tabBarIcon: ({ color }) => (
              <Ionicons name="shield-checkmark" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Events" 
          component={EventManagementScreen}
          options={{ 
            title: 'Events',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Users" 
          component={UserManagementDashboard}
          options={{ 
            title: 'Users',
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Profile" 
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
};

// Event Manager Tabs Navigator - Event Manager Dashboard, Events, Planner, Profile
const EventManagerTabs = () => {
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
        sceneContainerStyle={{
          pointerEvents: 'auto',
        }}
      >
        <TopTab.Screen 
          name="ManagerDashboard" 
          component={AdminDashboardScreen}
          options={{ 
            title: 'Analytics',
            tabBarIcon: ({ color }) => (
              <Ionicons name="analytics" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Events" 
          component={EventManagementScreen}
          options={{ 
            title: 'Events',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Planner" 
          component={EventPlannerScreen}
          options={{ 
            title: 'Planner',
            tabBarIcon: ({ color }) => (
              <Ionicons name="search" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen 
          name="Profile" 
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
};

// Root Navigator Component
const RootNavigator = () => {
  const { user, isLoading, hasAdminPrivileges } = useAuth();

  console.log('Auth State in RootNavigator:', { 
    user: user ? { email: user.email, role: user.role } : null, 
    isLoading 
  });

  // Show loading until auth check is complete
  if (isLoading) {
    return <LoadingFallback />;
  }

  const getUserTabs = () => {
    if (!user) return CustomerTabs;
    
    // Event Managers get their own specialized tabs with Event Analytics Dashboard
    if (user.role === 'event_manager') {
      return EventManagerTabs;
    }
    
    // Regular admins get full admin tabs with Admin Tools Dashboard
    if (hasAdminPrivileges()) {
      return AdminTabs;
    }
    
    // Regular customers
    return CustomerTabs;
  };

  const TabsComponent = getUserTabs();

  return (
    <Stack.Navigator 
      initialRouteName={user ? "MainTabs" : "Login"}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f8f9fa' },
      }}
    >
      {!user ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registration" component={RegistrationScreen} />
        </>
      ) : (
        // Main App Stack - Show appropriate tabs based on user role
        <Stack.Screen name="MainTabs" component={TabsComponent} />
      )}
      
      {/* Common screens accessible from anywhere */}
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="PurchaseTicket" component={TicketPurchaseScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="BrowseEvents" component={SearchEventsScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <View style={styles.container}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </View>
      </AuthProvider>
    </ErrorBoundary>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#64748b',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});