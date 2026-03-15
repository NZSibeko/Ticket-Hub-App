// App.web.js - MERGED VERSION
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

// Import existing screens
import AdminDashboardScreen from "./src/screens/AdminDashboardScreen.web";
import AdminToolsDashboard from "./src/screens/AdminToolsDashboard.web";
import CreateEventScreen from "./src/screens/CreateEventScreen.web";
import DiscoverScreen from "./src/screens/DiscoverScreen.web";
import EventDetailScreen from "./src/screens/EventDetailScreen";
import EventManagementScreen from "./src/screens/EventManagementScreen.web";
import HelpCenterScreen from "./src/screens/HelpCenterScreen.web";
import LoginScreen from "./src/screens/LoginScreen";
import MyTicketsScreen from "./src/screens/MyTicketsScreen.web";
import PaymentScreen from "./src/screens/PaymentScreen";
import PaymentSuccess from "./src/screens/PaymentSuccessScreen.web";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen.web";
import ProfileScreen from "./src/screens/ProfileScreen.web";
import RegistrationScreen from "./src/screens/RegistrationScreen";
import ScannerScreen from "./src/screens/ScannerScreen.web";
import SearchEventsScreen from "./src/screens/SearchEventsScreen.web";
import TermsConditionsScreen from "./src/screens/TermsConditionsScreen.web";
import TicketPurchaseScreen from "./src/screens/TicketPurchaseScreen";
import UserManagementDashboard from "./src/screens/UserManagementDashboard.web";

// Import NEW screens
import EventOrganizerEventsScreen from "./src/screens/EventOrganizerEventsScreen.web";
import EventOrganizerToolsScreen from "./src/screens/EventOrganizerToolsScreen.web";
import EventSupportDashboardScreen from "./src/screens/EventSupportDashboardScreen.web";
import EventSupportTasksScreen from "./src/screens/EventSupportTasksScreen.web";
import OmniSupportOverviewScreen from "./src/screens/OmniSupportOverviewScreen.web";
import SupportChatScreen from "./src/screens/SupportChatScreen.web";
import SupportScannerScreen from "./src/screens/SupportScannerScreen.web";

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
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || "An unexpected error occurred"}
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

const TabContainer = ({ children }) => (
  <View style={styles.tabContainer}>{children}</View>
);

const CustomerTabs = () => (
  <TabContainer>
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: [styles.tabBar, styles.fixedTabBar],
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.tabIndicator,
        tabBarShowIcon: true,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <TopTab.Screen
        name="BrowseEvents"
        component={SearchEventsScreen}
        options={{
          title: "Marketplace",
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{
          title: "My Tickets",
          tabBarIcon: ({ color }) => (
            <Ionicons name="ticket" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          ),
        }}
      />
    </TopTab.Navigator>
  </TabContainer>
);

const AdminTabs = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log(
      "🔵 AdminTabs mounted for user:",
      user?.email,
      "Role:",
      user?.role,
    );
  }, [user]);

  return (
    <TabContainer>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: [styles.tabBar, styles.fixedTabBar],
          tabBarActiveTintColor: "#6366f1",
          tabBarInactiveTintColor: "#6b7280",
          tabBarLabelStyle: styles.tabLabel,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarShowIcon: true,
          tabBarIconStyle: styles.tabIcon,
        }}
      >
        <TopTab.Screen
          name="AdminDashboard"
          component={AdminToolsDashboard}
          options={{
            title: "Admin Tools",
            tabBarIcon: ({ color }) => (
              <Ionicons name="shield-checkmark" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen
          name="Events"
          component={EventManagementScreen}
          options={{
            title: "Events",
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen
          name="Users"
          component={UserManagementDashboard}
          options={{
            title: "Users",
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={20} color={color} />
            ),
          }}
        />
        <TopTab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={20} color={color} />
            ),
          }}
        />
      </TopTab.Navigator>
    </TabContainer>
  );
};

const ManagerTabs = () => (
  <TabContainer>
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: [styles.tabBar, styles.fixedTabBar],
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.tabIndicator,
        tabBarShowIcon: true,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <TopTab.Screen
        name="ManagerDashboard"
        component={AdminDashboardScreen}
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => (
            <Ionicons name="analytics" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="Events"
        component={EventManagementScreen}
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="TeamManagement"
        component={UserManagementDashboard}
        options={{
          title: "Team",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          ),
        }}
      />
    </TopTab.Navigator>
  </TabContainer>
);

const EventOrganizerTabs = () => (
  <TabContainer>
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: [styles.tabBar, styles.fixedTabBar],
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.tabIndicator,
        tabBarShowIcon: true,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <TopTab.Screen
        name="OrganizerTools"
        component={EventOrganizerToolsScreen}
        options={{
          title: "Tools",
          tabBarIcon: ({ color }) => (
            <Ionicons name="analytics" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="EventOrganizerEventsScreen"
        component={EventOrganizerEventsScreen}
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="OrganizerTickets"
        component={MyTicketsScreen}
        options={{
          title: "Tickets",
          tabBarIcon: ({ color }) => (
            <Ionicons name="ticket" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="OrganizerProfile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          ),
        }}
      />
    </TopTab.Navigator>
  </TabContainer>
);

const OmniSupportConsultantTabs = () => (
  <TabContainer>
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: [styles.tabBar, styles.fixedTabBar],
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.tabIndicator,
        tabBarShowIcon: true,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <TopTab.Screen
        name="OmniSupportOverview"
        component={OmniSupportOverviewScreen}
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="SupportChat"
        component={SupportChatScreen}
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="SupportEvents"
        component={DiscoverScreen}
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="SupportProfile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          ),
        }}
      />
    </TopTab.Navigator>
  </TabContainer>
);

const EventSupportConsultantTabs = () => (
  <TabContainer>
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: [styles.tabBar, styles.fixedTabBar],
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.tabIndicator,
        tabBarShowIcon: true,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <TopTab.Screen
        name="EventSupportDashboard"
        component={EventSupportDashboardScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="speedometer" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="EventSupportTasks"
        component={EventSupportTasksScreen}
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <Ionicons name="clipboard" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="EventSupportScanner"
        component={ScannerScreen}
        options={{
          title: "Ticket Scan",
          tabBarIcon: ({ color }) => (
            <Ionicons name="scan" size={20} color={color} />
          ),
        }}
      />
      <TopTab.Screen
        name="EventSupportProfile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          ),
        }}
      />
    </TopTab.Navigator>
  </TabContainer>
);

const RootNavigator = () => {
  const { user, isLoading, hasAdminPrivileges } = useAuth();

  useEffect(() => {
    if (user) {
      console.log("🔵 RootNavigator - User logged in:", {
        email: user.email,
        role: user.role,
        displayRole: user.displayRole,
        userType: user.userType,
        hasAdminPrivileges: hasAdminPrivileges && hasAdminPrivileges(),
      });
    } else {
      console.log("⚪ RootNavigator - No user logged in");
    }
  }, [user]);

  if (isLoading) {
    console.log("⏳ RootNavigator - Loading...");
    return <LoadingFallback />;
  }

  const getUserTabs = () => {
    if (!user) {
      console.log("🔴 getUserTabs - No user, returning CustomerTabs");
      return CustomerTabs;
    }

    // Check multiple possible role properties with enhanced debugging
    const role = user.role || user.userType || user.displayRole || "";
    const roleLower = role.toLowerCase();

    console.log("🔍 DEBUG - getUserTabs user object:", {
      email: user.email,
      role: user.role,
      userType: user.userType,
      displayRole: user.displayRole,
      normalizedRole: roleLower,
    });

    // Enhanced logging for debugging
    console.log("🟡 Checking role:", roleLower, "against known roles");

    // DIRECT ROLE MAPPING
    if (
      roleLower === "omni_support_consultant" ||
      roleLower === "support" ||
      roleLower === "support_staff" ||
      roleLower.includes("omni_support")
    ) {
      console.log(
        "✅ Direct match: omni support consultant role, returning OmniSupportConsultantTabs",
      );
      return OmniSupportConsultantTabs;
    }

    if (
      roleLower === "event_support_consultant" ||
      roleLower.includes("event_support")
    ) {
      console.log(
        "✅ Direct match: event support consultant role, returning EventSupportConsultantTabs",
      );
      return EventSupportConsultantTabs;
    }

    if (roleLower === "event_organizer" || roleLower.includes("organizer")) {
      console.log(
        "✅ Direct match: event_organizer role, returning EventOrganizerTabs",
      );
      return EventOrganizerTabs;
    }

    if (
      roleLower === "manager" ||
      roleLower === "event_manager" ||
      roleLower.includes("manager")
    ) {
      console.log("✅ Direct match: manager role, returning ManagerTabs");
      return ManagerTabs;
    }

    if (roleLower === "admin" || roleLower === "super_admin") {
      console.log("✅ Direct match: admin role, returning AdminTabs");
      return AdminTabs;
    }

    // Check for admin privileges
    if (hasAdminPrivileges && hasAdminPrivileges()) {
      console.log("✅ User has admin privileges, returning AdminTabs");
      return AdminTabs;
    }

    // Default to customer
    console.log("⚪ Defaulting to CustomerTabs for role:", roleLower);
    return CustomerTabs;
  };

  const TabsComponent = getUserTabs();

  return (
    <Stack.Navigator
      initialRouteName={user ? "MainTabs" : "Login"}
      screenOptions={{ headerShown: false }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Registration" component={RegistrationScreen} />
        </>
      ) : (
        <Stack.Screen name="MainTabs" component={TabsComponent} />
      )}

      {/* Common Screens */}
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="PurchaseTicket" component={TicketPurchaseScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="BrowseEvents" component={SearchEventsScreen} />
      <Stack.Screen
        name="EventOrganizerTools"
        component={EventOrganizerToolsScreen}
      />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      <Stack.Screen name="SupportScanner" component={SupportScannerScreen} />
      <Stack.Screen
        name="OmniSupportOverview"
        component={OmniSupportOverviewScreen}
      />
      <Stack.Screen
        name="EventSupportDashboard"
        component={EventSupportDashboardScreen}
      />
      <Stack.Screen
        name="EventSupportTasks"
        component={EventSupportTasksScreen}
      />
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
    backgroundColor: "#f8f9fa",
    width: "100%",
    height: "100%",
    maxWidth: "100%",
  },
  tabContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    paddingTop: 70,
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    height: 70,
    paddingBottom: 1,
  },
  fixedTabBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "none",
  },
  tabIndicator: {
    backgroundColor: "#6366f1",
    height: 3,
  },
  tabIcon: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#ef4444",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#64748b",
  },
  retryButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
