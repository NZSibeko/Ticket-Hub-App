import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { FC, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext"; // Import IUser type

const { width } = Dimensions.get("window");
const API_URL = "http://localhost:8082"; // Changed from 8081

// Responsive scaling functions
const scaleSize = (size: number): number => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.5));
};

const scaleFont = (size: number): number => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.3));
};

// --- Type Definitions for State ---

interface DashboardStats {
  totalRevenue: number;
  totalTicketsSold: number;
  activeEventsCount: number;
  scanRate: number;
  eventPerformance: any[]; // Simplified type for complex return data
  manualEventsCount: number;
  scrapedEventsCount: number;
  manualTicketsCount: number;
  activeUsersCount: number;
  recentTickets: any[]; // Simplified type
  revenueGrowth: number;
  ticketGrowth: number;
  scanRateGrowth: number;
  eventGrowth: number;
  revenueTrend: number[];
  ticketTrend: number[];
  scanTrend: number[];
  eventTrend: number[];
  revenueInsights: string[];
  ticketInsights: string[];
  scanInsights: string[];
  eventInsights: string[];
}

interface PaymentMethod {
  id: number;
  type: "credit_card" | "paypal";
  last4?: string;
  brand?: string;
  expiry?: string;
  email?: string;
  isDefault: boolean;
  cardholder?: string;
}

interface FavoriteEvent {
  id: number;
  title: string;
  date: string;
  venue: string;
  image: string;
  price: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  eventReminders: boolean;
  promotionalEmails: boolean;
  ticketUpdates: boolean;
  newEvents: boolean;
  smsNotifications: boolean;
}

interface PrivacySettings {
  twoFactorAuth: boolean;
  dataSharing: boolean;
  profileVisibility: "public" | "friends" | "private";
  locationTracking: boolean;
  biometricLogin: boolean;
  activityPrivacy: "public" | "friends" | "private";
}

// --- Component ---
const AdminDashboardScreen: FC<{ navigation: any }> = ({ navigation }) => {
  const {
    user,
    logout,
    getAuthHeader,
    hasAdminPrivileges,
    isEventOrganizer,
    getRoleDisplay, // Use function from context if available, otherwise re-implement or rely on user.role
  } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(
    user?.profile_picture || null,
  );
  const [logoutModalVisible, setLogoutModalVisible] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [favoriteEvents, setFavoriteEvents] = useState<FavoriteEvent[]>([]);
  const [showPaymentMethods, setShowPaymentMethods] = useState<boolean>(false);
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  const [showEditProfile, setShowEditProfile] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showPrivacySecurity, setShowPrivacySecurity] =
    useState<boolean>(false);
  const [userDebugInfo, setUserDebugInfo] = useState<string>("");

  // Edit Profile State
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || user?.name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dateOfBirth: user?.date_of_birth || "",
  });

  // Notifications State
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailNotifications: true,
      pushNotifications: true,
      eventReminders: true,
      promotionalEmails: false,
      ticketUpdates: true,
      newEvents: true,
      smsNotifications: false,
    });

  // Privacy & Security State
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    twoFactorAuth: false,
    dataSharing: false,
    profileVisibility: "public",
    locationTracking: false,
    biometricLogin: false,
    activityPrivacy: "friends",
  });

  useEffect(() => {
    console.log("🔵 ProfileScreen - User object received:", user);

    if (user) {
      const debugInfo: any = {
        timestamp: new Date().toISOString(),
        hasUser: !!user,
        userKeys: Object.keys(user),
        role: user.role,
        userType: user.userType,
        displayRole: user.displayRole,
        email: user.email,
        fullUserObject: JSON.stringify(user, null, 2),
      };

      console.log("🔍 USER DEBUG INFO:", debugInfo);
      setUserDebugInfo(JSON.stringify(debugInfo, null, 2));

      // Log specific role checks
      console.log("🎯 Role checks:", {
        "user.role": user.role,
        "user.userType": user.userType,
        "user.displayRole": user.displayRole,
        "isEventOrganizer()": isEventOrganizer(),
        "hasAdminPrivileges()": hasAdminPrivileges(),
        "getRoleDisplay()": getRoleDisplay(),
      });
    }

    if (user?.profile_picture) {
      setImage(user.profile_picture);
    }

    // Event organizers should NOT try to fetch admin dashboard stats
    if (user && hasAdminPrivileges() && !isEventOrganizer()) {
      fetchDashboardStats();
    }

    if (user) {
      loadPaymentMethods();
      loadFavoriteEvents();
      loadUserProfileData();
    }
  }, [user]);

  // --- Simplified Role Checks (Mirrored from AuthContext for safety/completeness) ---
  const isAdmin = (): boolean => {
    if (!user) return false;
    return hasAdminPrivileges();
  };

  const isEventManager = (): boolean => {
    if (!user) return false;
    const role = (
      user.role ||
      user.userType ||
      user.displayRole ||
      ""
    ).toLowerCase();
    return role.includes("manager") || role === "event_manager";
  };

  const isCustomer = (): boolean => {
    if (!user) return false;
    const role = (
      user.role ||
      user.userType ||
      user.displayRole ||
      ""
    ).toLowerCase();
    return role.includes("customer");
  };

  const isEventOrganizer = (): boolean => {
    if (!user) return false;

    const checkRole = (role: any): boolean => {
      if (!role) return false;
      const roleLower = role.toLowerCase();
      return (
        roleLower.includes("organizer") ||
        roleLower === "event_organizer" ||
        roleLower === "organizer"
      );
    };

    const result =
      checkRole(user.role) ||
      checkRole(user.userType) ||
      checkRole(user.displayRole);

    console.log("🎯 SIMPLE isEventOrganizer check:", { result });

    return result;
  };

  const isSupport = (): boolean => {
    if (!user) return false;
    const role = (
      user.role ||
      user.userType ||
      user.displayRole ||
      ""
    ).toLowerCase();
    return role.includes("support");
  };

  const getUserDisplayName = (): string => {
    if (!user) return "";
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    if (user.name) {
      return user.name;
    }
    if (user.username) {
      return user.username;
    }
    return user.email || "User";
  };

  const getRoleDisplay = (): string => {
    if (!user) return "Guest";

    const roleMap: { [key: string]: string } = {
      admin: "Administrator",
      super_admin: "Super Administrator",
      event_manager: "Event Manager",
      support: "Support Agent",
      event_organizer: "Event Organizer",
      customer: "Customer",
    };
    return roleMap[user.role] || user.role || "User";
  };

  // Navigation handlers
  const handleEventOrganizerTools = () => {
    Alert.alert("Coming Soon", "Event Organizer Tools will be available soon!");
  };

  const handleSupportChat = () => {
    Alert.alert("Coming Soon", "Support Chat will be available soon!");
  };

  const handleSupportScanner = () => {
    Alert.alert("Coming Soon", "Support Scanner will be available soon!");
  };

  // --- Data Fetching ---
  const fetchDashboardStats = async () => {
    if (!user || isEventOrganizer()) {
      console.log(
        "⚠️ Skipping dashboard stats: Not admin or user is event organizer",
      );
      return;
    }

    setStatsLoading(true);

    setStatsLoading(false);
  };

  const loadPaymentMethods = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_URL}/api/user/payment-methods`, {
        headers,
      });
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      setPaymentMethods([]);
    }
  };

  const loadFavoriteEvents = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_URL}/api/user/favorite-events`, {
        headers,
      });
      setFavoriteEvents(response.data.favoriteEvents || []);
    } catch (error) {
      console.error("Error fetching favorite events:", error);
      setFavoriteEvents([]);
    }
  };

  const loadUserProfileData = () => {
    setProfileData({
      firstName: user?.first_name || user?.name || "Guest",
      lastName: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      dateOfBirth: user?.date_of_birth || "YYYY-MM-DD",
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);

    if (user) {
      if (hasAdminPrivileges() && !isEventOrganizer()) {
        await fetchDashboardStats();
      }
      await loadPaymentMethods();
      await loadFavoriteEvents();
      loadUserProfileData();
    }

    setRefreshing(false);
  };

  const handleImagePick = async () => {
    // Image picker logic remains similar, just need to ensure types are correct
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        Alert.alert("Success", "Profile picture updated");
        // In a real app, you'd upload this image via an API call here
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
      console.error(error);
    }
  };

  // --- Navigation Handlers (Assuming Screens exist) ---
  const handleBrowseEvents = () => {
    navigation.navigate("Discover");
  };
  const handleDiscoverNavigation = () => {
    navigation.navigate("Discover");
  };
  const handleMyTicketsNavigation = () => {
    navigation.navigate("MyTickets");
  };
  const handleEventOrganizerTools = () => {
    Alert.alert("Coming Soon", "Event Organizer Tools will be available soon!");
  };
  const handleSupportChat = () => {
    Alert.alert("Coming Soon", "Support Chat will be available soon!");
  };
  const handleSupportScanner = () => {
    Alert.alert("Coming Soon", "Support Scanner will be available soon!");
  };
  const handleCreateEvent = () => {
    navigation.navigate("CreateEvent");
  };

  const handleAdminDashboard = () => {
    if (isEventOrganizer() || isSupport() || isCustomer()) {
      Alert.alert(
        "Access Denied",
        `Access denied for ${getRoleDisplay()} role.`,
      );
      return;
    }
    navigation.navigate("Dashboard"); // Assuming this route exists
  };

  const handleManageEvents = () => {
    navigation.navigate("Events");
  };
  const handleManageUsers = () => {
    navigation.navigate("Users");
  };
  const handleScannerNavigation = () => {
    navigation.navigate("Scanner");
  };

  // --- Modal/Screen Handlers ---
  const handleFavoritesPress = () => {
    setShowFavorites(true);
    setShowPaymentMethods(false); /* hide others */
  };
  const handlePaymentMethodsPress = () => {
    setShowPaymentMethods(true);
    setShowFavorites(false); /* hide others */
  };
  const handleBackToProfile = () => {
    setShowFavorites(false);
    setShowPaymentMethods(false);
    setShowEditProfile(false);
    setShowNotifications(false);
    setShowPrivacySecurity(false);
  };

  const handleAddPaymentMethod = () => {
    const newId = Math.max(...paymentMethods.map((m) => m.id), 0) + 1;
    const newMethod: PaymentMethod = {
      id: newId,
      type: "credit_card",
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      brand: "visa",
      expiry: "06/26",
      isDefault: paymentMethods.length === 0, // Make first one default
      cardholder: getUserDisplayName(),
    };

    setPaymentMethods((prev) =>
      [...prev, newMethod].map((m) =>
        m.id === newId ? { ...m, isDefault: true } : m,
      ),
    );
    Alert.alert("Success", "New payment method added successfully!");
  };

  const handleRemoveFavorite = (eventId: number) => {
    setFavoriteEvents((prev) => prev.filter((event) => event.id !== eventId));
    Alert.alert("Removed", "Event removed from favorites");
  };

  const handleSetDefaultPayment = (methodId: number) => {
    const updatedMethods = paymentMethods.map((method) => ({
      ...method,
      isDefault: method.id === methodId,
    }));
    setPaymentMethods(updatedMethods);
    Alert.alert("Success", "Default payment method updated");
  };

  const handleRemovePaymentMethod = (methodId: number) => {
    if (paymentMethods.find((method) => method.id === methodId)?.isDefault) {
      Alert.alert(
        "Cannot Remove",
        "Cannot remove default payment method. Please set another method as default first.",
      );
      return;
    }

    setPaymentMethods((prev) =>
      prev.filter((method) => method.id !== methodId),
    );
    Alert.alert("Removed", "Payment method removed");
  };

  const handleSaveProfile = () => {
    Alert.alert("Success", "Profile updated successfully!");
    loadUserProfileData(); // Reload local state from potentially updated user object
    handleBackToProfile();
  };

  const handleSaveNotifications = () => {
    Alert.alert("Success", "Notification settings updated!");
    handleBackToProfile();
  };

  const handleSavePrivacy = () => {
    Alert.alert("Success", "Privacy settings updated!");
    handleBackToProfile();
  };

  const handleToggleNotification = (setting: keyof NotificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleTogglePrivacy = (setting: keyof PrivacySettings) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleProfileVisibilityChange = (
    value: "public" | "friends" | "private",
  ) => {
    setPrivacySettings((prev) => ({ ...prev, profileVisibility: value }));
  };

  const handleActivityPrivacyChange = (
    value: "public" | "friends" | "private",
  ) => {
    setPrivacySettings((prev) => ({ ...prev, activityPrivacy: value }));
  };

  // --- Component Rendering Helpers ---
  const getCardWidth = (): number => {
    if (width >= 1024) return Math.min(width - 120, 600);
    if (width >= 768) return Math.min(width - 80, 500);
    return Math.min(width - 32, 400);
  };

  const getActionCardWidth = (): number => {
    if (width >= 1024) return (Math.min(width - 120, 600) - 48) / 3;
    if (width >= 768) return (Math.min(width - 80, 500) - 32) / 3;
    return (Math.min(width - 32, 400) - 24) / 3;
  };

  const RoleBadge: FC = () => {
    if (!user) return null;

    const roleDisplay = getRoleDisplay();
    let badgeColor = "#64748b";
    let roleIcon = "person";

    // Logic based on the helper function in AuthContext
    if (roleDisplay.includes("Admin")) {
      badgeColor = "#6366f1"; // Indigo
      roleIcon = "shield-checkmark";
    } else if (roleDisplay.includes("Manager")) {
      badgeColor = "#10b981"; // Emerald
      roleIcon = "calendar";
    } else if (roleDisplay.includes("Organizer")) {
      badgeColor = "#f59e0b"; // Amber
      roleIcon = "megaphone";
    } else if (roleDisplay.includes("Support")) {
      badgeColor = "#3b82f6"; // Blue
      roleIcon = "chatbubbles";
    } else if (roleDisplay.includes("Customer")) {
      badgeColor = "#8b5cf6"; // Violet
      roleIcon = "person";
    }

    const isOrg = isEventOrganizer();

    return (
      <View style={styles.roleBadgeContainer}>
        <View style={[styles.roleBadge, { backgroundColor: badgeColor }]}>
          <Ionicons name={roleIcon} size={scaleFont(12)} color="#fff" />
          <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
        </View>

        {isOrg && (
          <View style={[styles.roleBadge, styles.eventOrganizerBadge]}>
            <Ionicons name="megaphone" size={scaleFont(12)} color="#92400e" />
            <Text style={styles.eventOrganizerBadgeText}>
              Event Organizer (TEST)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const DebugInfo: FC = () => {
    if (!user) return null;

    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Information:</Text>
        <Text style={styles.debugText}>
          Role: {user.role || "No role"} | UserType:{" "}
          {user.userType || "No userType"} | DisplayRole:{" "}
          {user.displayRole || "No displayRole"}
        </Text>
        <Text style={styles.debugText}>
          isEventOrganizer: {isEventOrganizer() ? "YES" : "NO"} |
          hasAdminPrivileges: {hasAdminPrivileges() ? "YES" : "NO"}
        </Text>
        <Text style={styles.debugText}>Email: {user.email || "No email"}</Text>
      </View>
    );
  };

  const ActionCard: FC<{
    icon: string;
    title: string;
    color: string;
    onPress: () => void;
  }> = ({ icon, title, color, onPress }) => (
    <TouchableOpacity
      style={[styles.actionCard, { width: getActionCardWidth() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={scaleFont(20)} color="#fff" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const SupportCard: FC<{
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    color?: string;
  }> = ({ icon, title, subtitle, onPress, color = "#64748b" }) => (
    <TouchableOpacity
      style={[styles.supportCard, { width: getCardWidth() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.supportIconContainer, { backgroundColor: color + "15" }]}
      >
        <Ionicons name={icon} size={scaleFont(20)} color={color} />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
    </TouchableOpacity>
  );

  const ProfileOption: FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
    color?: string;
  }> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    color = "#6366f1",
  }) => (
    <TouchableOpacity
      style={[styles.optionCard, { width: getCardWidth() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.optionIconContainer, { backgroundColor: color + "15" }]}
      >
        <Ionicons name={icon} size={scaleFont(18)} color={color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
      )}
    </TouchableOpacity>
  );

  const SettingToggle: FC<{
    icon: string;
    title: string;
    description: string;
    value: boolean;
    onValueChange: () => void;
    color?: string;
  }> = ({
    icon,
    title,
    description,
    value,
    onValueChange,
    color = "#6366f1",
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon} size={scaleFont(18)} color={color} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e2e8f0", true: color }}
        thumbColor={value ? "#fff" : "#f8fafc"}
      />
    </View>
  );

  const RadioOption: FC<{
    label: string;
    description?: string;
    value: string;
    selected: boolean;
    onSelect: (value: string) => void;
    color?: string;
  }> = ({
    label,
    description,
    value,
    selected,
    onSelect,
    color = "#6366f1",
  }) => (
    <TouchableOpacity
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={() => onSelect(value)}
    >
      <View style={styles.radioLeft}>
        <View
          style={[styles.radioCircle, selected && { backgroundColor: color }]}
        >
          {selected && (
            <Ionicons name="checkmark" size={scaleFont(12)} color="#fff" />
          )}
        </View>
        <View style={styles.radioTextContainer}>
          <Text style={styles.radioLabel}>{label}</Text>
          {description && (
            <Text style={styles.radioDescription}>{description}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const PaymentMethodCard: FC<{
    method: PaymentMethod;
    onSetDefault: (id: number) => void;
    onRemove: (id: number) => void;
  }> = ({ method, onSetDefault, onRemove }) => (
    <View style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodHeader}>
        <View style={styles.paymentMethodIcon}>
          {method.type === "credit_card" ? (
            <Ionicons
              name={method.brand === "visa" ? "card" : "card-outline"}
              size={scaleFont(20)}
              color="#64748b"
            />
          ) : (
            <Ionicons name="logo-paypal" size={scaleFont(20)} color="#0070ba" />
          )}
        </View>
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodTitle}>
            {method.type === "credit_card"
              ? `${method.brand?.toUpperCase() || "Credit Card"} •••• ${method.last4}`
              : "PayPal"}
          </Text>
          <Text style={styles.paymentMethodSubtitle}>
            {method.type === "credit_card"
              ? `Expires ${method.expiry}`
              : method.email}
          </Text>
        </View>
        {method.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      <View style={styles.paymentMethodActions}>
        {!method.isDefault && (
          <TouchableOpacity
            style={styles.paymentActionButton}
            onPress={() => onSetDefault(method.id)}
          >
            <Text style={styles.paymentActionText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.paymentActionButton, styles.removeButton]}
          onPress={() => onRemove(method.id)}
        >
          <Text style={[styles.paymentActionText, styles.removeButtonText]}>
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const FavoriteEventCard: FC<{
    event: FavoriteEvent;
    onRemove: (id: number) => void;
  }> = ({ event, onRemove }) => (
    <TouchableOpacity style={styles.favoriteEventCard}>
      <View style={styles.favoriteEventImage}>
        <Ionicons name="image-outline" size={scaleFont(24)} color="#cbd5e1" />
      </View>
      <View style={styles.favoriteEventContent}>
        <Text style={styles.favoriteEventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.favoriteEventDate}>
          {new Date(event.date).toLocaleDateString()}
        </Text>
        <Text style={styles.favoriteEventVenue} numberOfLines={1}>
          {event.venue}
        </Text>
        <Text style={styles.favoriteEventPrice}>
          R {event.price.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeFavoriteButton}
        onPress={() => onRemove(event.id)}
      >
        <Ionicons name="heart" size={scaleFont(20)} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const ResponsiveContainer: FC<{
    children: React.ReactNode;
    isGrid?: boolean;
  }> = ({ children, isGrid = false }) => (
    <View style={isGrid ? styles.responsiveGrid : styles.responsiveContainer}>
      {children}
    </View>
  );

  // --- SCREEN COMPONENTS ---

  const FavoritesScreen: FC<{
    handleBackToProfile: () => void;
    handleBrowseEvents: () => void;
  }> = ({ handleBackToProfile, handleBrowseEvents }) => (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          styles.detailedScreenContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons
                name="arrow-back"
                size={scaleFont(20)}
                color="#6366f1"
              />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Saved Events</Text>
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            {favoriteEvents.length > 0 ? (
              <>
                <Text style={styles.screenSubtitle}>
                  {favoriteEvents.length} saved event
                  {favoriteEvents.length !== 1 ? "s" : ""}
                </Text>
                {favoriteEvents.map((event) => (
                  <FavoriteEventCard
                    key={event.id}
                    event={event}
                    onRemove={handleRemoveFavorite}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="heart-outline"
                  size={scaleFont(64)}
                  color="#cbd5e1"
                />
                <Text style={styles.emptyStateTitle}>No Saved Events</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Save events you're interested in to find them easily later
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleBrowseEvents}
                >
                  <Text style={styles.primaryButtonText}>Browse Events</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  const PaymentMethodsScreen: FC<{ handleBackToProfile: () => void }> = ({
    handleBackToProfile,
  }) => (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          styles.detailedScreenContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons
                name="arrow-back"
                size={scaleFont(20)}
                color="#6366f1"
              />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Payment Methods</Text>
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <View style={styles.screenHeaderRow}>
              <Text style={styles.screenSubtitle}>
                {paymentMethods.length} payment method
                {paymentMethods.length !== 1 ? "s" : ""}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPaymentMethod}
              >
                <Ionicons name="add" size={scaleFont(16)} color="#fff" />
                <Text style={styles.addButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onSetDefault={handleSetDefaultPayment}
                  onRemove={handleRemovePaymentMethod}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="card-outline"
                  size={scaleFont(64)}
                  color="#cbd5e1"
                />
                <Text style={styles.emptyStateTitle}>No Payment Methods</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Add a payment method for faster checkout
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleAddPaymentMethod}
                >
                  <Text style={styles.primaryButtonText}>
                    Add Payment Method
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={[styles.securityNotice, { width: getCardWidth() }]}>
            <Ionicons
              name="shield-checkmark"
              size={scaleFont(16)}
              color="#10b981"
            />
            <Text style={styles.securityNoticeText}>
              Your payment information is secure and encrypted
            </Text>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  const EditProfileScreen: FC<{ handleBackToProfile: () => void }> = ({
    handleBackToProfile,
  }) => (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          styles.detailedScreenContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons
                name="arrow-back"
                size={scaleFont(20)}
                color="#6366f1"
              />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Edit Profile</Text>
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Profile Picture</Text>
            <View style={styles.profilePictureSection}>
              <View style={styles.profilePicture}>
                {image ? (
                  <View style={styles.profileImage}>
                    <Ionicons name="person" size={scaleFont(32)} color="#fff" />
                  </View>
                ) : (
                  <Ionicons
                    name="person-circle"
                    size={scaleFont(80)}
                    color="#cbd5e1"
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={handleImagePick}
              >
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Personal Information</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.firstName}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, firstName: text }))
                }
                placeholder="Enter your first name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.lastName}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, lastName: text }))
                }
                placeholder="Enter your last name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.email}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, email: text }))
                }
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.phone}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, phone: text }))
                }
                placeholder="+27 12 345 6789"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.dateOfBirth}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, dateOfBirth: text }))
                }
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <View style={[styles.saveButtonContainer, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  const NotificationsScreen: FC<{ handleBackToProfile: () => void }> = ({
    handleBackToProfile,
  }) => (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          styles.detailedScreenContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons
                name="arrow-back"
                size={scaleFont(20)}
                color="#6366f1"
              />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Notification Settings</Text>
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Email Notifications</Text>

            <SettingToggle
              icon="mail-outline"
              title="Email Notifications"
              description="Receive important updates via email"
              value={notificationSettings.emailNotifications}
              onValueChange={() =>
                handleToggleNotification("emailNotifications")
              }
              color="#6366f1"
            />

            <SettingToggle
              icon="megaphone-outline"
              title="Promotional Emails"
              description="Get updates about new events and offers"
              value={notificationSettings.promotionalEmails}
              onValueChange={() =>
                handleToggleNotification("promotionalEmails")
              }
              color="#f59e0b"
            />

            <SettingToggle
              icon="ticket-outline"
              title="Ticket Updates"
              description="Notifications about your ticket purchases"
              value={notificationSettings.ticketUpdates}
              onValueChange={() => handleToggleNotification("ticketUpdates")}
              color="#10b981"
            />

            <SettingToggle
              icon="calendar-outline"
              title="New Events"
              description="Get notified about events matching your interests"
              value={notificationSettings.newEvents}
              onValueChange={() => handleToggleNotification("newEvents")}
              color="#ef4444"
            />
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Push Notifications</Text>

            <SettingToggle
              icon="notifications-outline"
              title="Push Notifications"
              description="Receive push notifications on your device"
              value={notificationSettings.pushNotifications}
              onValueChange={() =>
                handleToggleNotification("pushNotifications")
              }
              color="#8b5cf6"
            />

            <SettingToggle
              icon="alarm-outline"
              title="Event Reminders"
              description="Get reminded before your events start"
              value={notificationSettings.eventReminders}
              onValueChange={() => handleToggleNotification("eventReminders")}
              color="#3b82f6"
            />
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>SMS Notifications</Text>

            <SettingToggle
              icon="chatbubble-outline"
              title="SMS Notifications"
              description="Receive text message notifications"
              value={notificationSettings.smsNotifications}
              onValueChange={() => handleToggleNotification("smsNotifications")}
              color="#06b6d4"
            />
          </View>

          <View style={[styles.saveButtonContainer, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveNotifications}
            >
              <Text style={styles.saveButtonText}>
                Save Notification Settings
              </Text>
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  const PrivacySecurityScreen: FC<{ handleBackToProfile: () => void }> = ({
    handleBackToProfile,
  }) => (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          styles.detailedScreenContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons
                name="arrow-back"
                size={scaleFont(20)}
                color="#6366f1"
              />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Privacy & Security</Text>
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Security</Text>

            <SettingToggle
              icon="shield-checkmark-outline"
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              value={privacySettings.twoFactorAuth}
              onValueChange={() => handleTogglePrivacy("twoFactorAuth")}
              color="#10b981"
            />

            <SettingToggle
              icon="finger-print-outline"
              title="Biometric Login"
              description="Use fingerprint or face ID to log in"
              value={privacySettings.biometricLogin}
              onValueChange={() => handleTogglePrivacy("biometricLogin")}
              color="#8b5cf6"
            />
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Privacy</Text>

            <View style={styles.settingGroup}>
              <Text style={styles.settingGroupTitle}>Profile Visibility</Text>
              <Text style={styles.settingGroupDescription}>
                Control who can see your profile information
              </Text>

              <RadioOption
                label="Public"
                description="Anyone can see your profile"
                value="public"
                selected={privacySettings.profileVisibility === "public"}
                onSelect={handleProfileVisibilityChange}
              />

              <RadioOption
                label="Friends Only"
                description="Only your friends can see your profile"
                value="friends"
                selected={privacySettings.profileVisibility === "friends"}
                onSelect={handleProfileVisibilityChange}
              />

              <RadioOption
                label="Private"
                description="Only you can see your profile"
                value="private"
                selected={privacySettings.profileVisibility === "private"}
                onSelect={handleProfileVisibilityChange}
              />
            </View>

            <View style={styles.settingGroup}>
              <Text style={styles.settingGroupTitle}>Activity Privacy</Text>
              <Text style={styles.settingGroupDescription}>
                Control who can see your event activity
              </Text>

              <RadioOption
                label="Public"
                description="Anyone can see your event activity"
                value="public"
                selected={privacySettings.activityPrivacy === "public"}
                onSelect={handleActivityPrivacyChange}
              />

              <RadioOption
                label="Friends Only"
                description="Only your friends can see your activity"
                value="friends"
                selected={privacySettings.activityPrivacy === "friends"}
                onSelect={handleActivityPrivacyChange}
              />

              <RadioOption
                label="Private"
                description="Only you can see your activity"
                value="private"
                selected={privacySettings.activityPrivacy === "private"}
                onSelect={handleActivityPrivacyChange}
              />
            </View>

            <SettingToggle
              icon="location-outline"
              title="Location Tracking"
              description="Allow us to suggest events near you"
              value={privacySettings.locationTracking}
              onValueChange={() => handleTogglePrivacy("locationTracking")}
              color="#3b82f6"
            />

            <SettingToggle
              icon="share-social-outline"
              title="Data Sharing"
              description="Share anonymous data to improve our services"
              value={privacySettings.dataSharing}
              onValueChange={() => handleTogglePrivacy("dataSharing")}
              color="#f59e0b"
            />
          </View>

          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Account Actions</Text>

            <TouchableOpacity style={styles.accountAction}>
              <View style={styles.accountActionLeft}>
                <Ionicons
                  name="download-outline"
                  size={scaleFont(20)}
                  color="#64748b"
                />
                <Text style={styles.accountActionText}>Download Your Data</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={scaleFont(16)}
                color="#cbd5e1"
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.accountAction}>
              <View style={styles.accountActionLeft}>
                <Ionicons
                  name="trash-outline"
                  size={scaleFont(20)}
                  color="#ef4444"
                />
                <Text style={[styles.accountActionText, { color: "#ef4444" }]}>
                  Delete Account
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={scaleFont(16)}
                color="#cbd5e1"
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.saveButtonContainer, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSavePrivacy}
            >
              <Text style={styles.saveButtonText}>Save Privacy Settings</Text>
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  // === MAIN RENDER LOGIC ===
  if (showFavorites) {
    return (
      <FavoritesScreen
        handleBackToProfile={handleBackToProfile}
        handleBrowseEvents={handleBrowseEvents}
      />
    );
  }

  if (showPaymentMethods) {
    return <PaymentMethodsScreen handleBackToProfile={handleBackToProfile} />;
  }

  if (showEditProfile) {
    return <EditProfileScreen handleBackToProfile={handleBackToProfile} />;
  }

  if (showNotifications) {
    return <NotificationsScreen handleBackToProfile={handleBackToProfile} />;
  }

  if (showPrivacySecurity) {
    return <PrivacySecurityScreen handleBackToProfile={handleBackToProfile} />;
  }

  // Not logged in state
  if (!user) {
    return (
      <ScreenContainer>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <ResponsiveContainer>
            <View style={styles.profileHeader}>
              <View style={styles.profileInfo}>
                <View style={styles.welcomeIconContainer}>
                  <Ionicons
                    name="person-circle-outline"
                    size={scaleSize(60)}
                    color="#6366f1"
                  />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to Ticket-Hub</Text>
                <Text style={styles.welcomeSubtitle}>
                  Browse events and discover amazing experiences. Log in to
                  purchase tickets and manage your account.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <ResponsiveContainer isGrid={true}>
                <ActionCard
                  icon="search"
                  title="Browse Events"
                  color="#6366f1"
                  onPress={handleBrowseEvents}
                />
                <ActionCard
                  icon="calendar-outline"
                  title="Upcoming"
                  color="#10b981"
                  onPress={handleDiscoverNavigation}
                />
                <ActionCard
                  icon="star-outline"
                  title="Featured"
                  color="#f59e0b"
                  onPress={handleDiscoverNavigation}
                />
              </ResponsiveContainer>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Tickets</Text>
              <View style={[styles.loginPromptCard, { width: getCardWidth() }]}>
                <View style={styles.loginPromptIcon}>
                  <Ionicons
                    name="ticket-outline"
                    size={scaleSize(32)}
                    color="#64748b"
                  />
                </View>
                <View style={styles.loginPromptContent}>
                  <Text style={styles.loginPromptTitle}>
                    Sign in to view your tickets
                  </Text>
                  <Text style={styles.loginPromptSubtitle}>
                    Your purchased tickets are waiting for you!
                  </Text>
                  <TouchableOpacity
                    style={styles.loginPromptButton}
                    onPress={() => navigation.navigate("Login")}
                  >
                    <Text style={styles.loginPromptButtonText}>
                      Go to Login
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ResponsiveContainer>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Logged In State - ADMIN/EVENT MANAGER VIEW
  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Profile Header */}
          <View style={[styles.profileHeader, { width: getCardWidth() }]}>
            <View style={styles.profileInfo}>
              {/* Profile Picture Placeholder */}
              <TouchableOpacity onPress={handleImagePick}>
                <View style={styles.profilePictureLarge}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.profileImageLarge}
                    />
                  ) : (
                    <Ionicons
                      name="person-circle"
                      size={scaleSize(90)}
                      color="#cbd5e1"
                    />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.profileTextContainer}>
                <Text style={styles.profileName}>{getUserDisplayName()}</Text>
                <RoleBadge />
                <Text style={styles.profileEmail}>{getUserEmail()}</Text>
              </View>
            </View>

            {/* Debug Info */}
            {__DEV__ && <DebugInfo />}

            {/* Edit Profile and Logout Actions */}
            <View style={styles.profileActions}>
              <TouchableOpacity
                style={styles.actionButtonSmall}
                onPress={handleImagePick}
              >
                <Ionicons
                  name="camera-outline"
                  size={scaleFont(18)}
                  color="#6366f1"
                />
                <Text style={styles.actionButtonTextSmall}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonSmall}
                onPress={handleEditProfilePress}
              >
                <Ionicons
                  name="create-outline"
                  size={scaleFont(18)}
                  color="#6366f1"
                />
                <Text style={styles.actionButtonTextSmall}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonSmall}
                onPress={handleLogout}
              >
                <Ionicons
                  name="log-out-outline"
                  size={scaleFont(18)}
                  color="#ef4444"
                />
                <Text
                  style={[styles.actionButtonTextSmall, { color: "#ef4444" }]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ADMIN/ORGANIZER/SUPPORT DASHBOARD VIEW */}
          {(isAdmin() || isEventOrganizer()) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Admin & Organizer Tools</Text>
              <ResponsiveContainer isGrid={true}>
                {isAdmin() && (
                  <>
                    <ActionCard
                      icon="speedometer-outline"
                      title="Dashboard Stats"
                      color="#6366f1"
                      onPress={() => navigation.navigate("Dashboard")}
                    />
                    <ActionCard
                      icon="people-outline"
                      title="Manage Users"
                      color="#ef4444"
                      onPress={handleManageUsers}
                    />
                    <ActionCard
                      icon="calendar-add-outline"
                      title="Create Event"
                      color="#10b981"
                      onPress={handleCreateEvent}
                    />
                  </>
                )}

                {isEventOrganizer() && (
                  <>
                    <ActionCard
                      icon="calendar-outline"
                      title="My Events"
                      color="#f59e0b"
                      onPress={handleManageEvents}
                    />
                    <ActionCard
                      icon="add-circle-outline"
                      title="New Event"
                      color="#06b6d4"
                      onPress={handleCreateEvent}
                    />
                    <ActionCard
                      icon="briefcase-outline"
                      title="Organizer Tools"
                      color="#8b5cf6"
                      onPress={handleEventOrganizerTools}
                    />
                  </>
                )}
              </ResponsiveContainer>
            </View>
          )}

          {/* SUPPORT VIEW */}
          {isSupport() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support Actions</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                <SupportCard
                  icon="chatbubbles-outline"
                  title="Chat Console"
                  subtitle="Manage active support conversations"
                  onPress={handleSupportChat}
                  color="#3b82f6"
                />
                <SupportCard
                  icon="qr-code-outline"
                  title="Ticket Scanner"
                  subtitle="Scan tickets for validation"
                  onPress={handleSupportScanner}
                  color="#ef4444"
                />
              </ScrollView>
            </View>
          )}

          {/* CUSTOMER/GENERAL ACTIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Activities</Text>
            <ResponsiveContainer isGrid={true}>
              <ActionCard
                icon="ticket-outline"
                title="My Tickets"
                color="#8b5cf6"
                onPress={handleMyTicketsNavigation}
              />
              <ActionCard
                icon="star-outline"
                title="Favorites"
                color="#ef4444"
                onPress={handleFavoritesPress}
              />
              <ActionCard
                icon="card-outline"
                title="Payments"
                color="#06b6d4"
                onPress={handlePaymentMethodsPress}
              />
            </ResponsiveContainer>
          </View>

          {/* Detailed Settings Sections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <ProfileOption
              icon="settings-outline"
              title="Edit Profile Information"
              subtitle="Update name, contact details, and photo"
              onPress={handleEditProfilePress}
            />
            <ProfileOption
              icon="notifications-outline"
              title="Notification Preferences"
              subtitle="Manage what alerts you receive"
              onPress={handleNotificationsPress}
            />
            <ProfileOption
              icon="shield-outline"
              title="Privacy & Security"
              subtitle="Control data sharing and security features"
              onPress={handlePrivacySecurityPress}
            />
          </View>

          {/* Admin/Debug Info (Only visible if admin/owner) */}
          {isAdmin() && stats && (
            <View style={[styles.contentCard, { width: getCardWidth() }]}>
              <Text style={styles.screenSubtitle}>
                Admin Dashboard Snapshot
              </Text>
              {statsLoading ? (
                <ActivityIndicator size="large" color="#6366f1" />
              ) : (
                <View>
                  <Text style={styles.statItem}>
                    Revenue: R{stats.totalRevenue.toLocaleString()}
                  </Text>
                  <Text style={styles.statItem}>
                    Tickets Sold: {stats.totalTicketsSold.toLocaleString()}
                  </Text>
                  <Text style={styles.statItem}>
                    Active Events: {stats.activeEventsCount}
                  </Text>
                  <Text style={styles.statItem}>
                    Scan Rate: {stats.scanRate}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Logout Action */}
          <View style={[styles.saveButtonContainer, { width: getCardWidth() }]}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={scaleFont(20)}
                color="#ef4444"
              />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { width: getCardWidth() }]}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalContent}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLogout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
  // General Layout
  scrollView: { flex: 1 },
  scrollViewContent: { paddingBottom: 40 },
  detailedScreenContent: { paddingHorizontal: 10 },
  responsiveContainer: { width: "100%", alignItems: "center" },
  responsiveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    width: "100%",
  },

  // Header & Title Styles
  profileHeader: {
    width: "100%",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 15,
    marginBottom: 10,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 10,
  },
  profilePictureLarge: {
    width: scaleSize(90),
    height: scaleSize(90),
    borderRadius: scaleSize(45),
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: scaleSize(30),
  },
  profileImageLarge: {
    width: "100%",
    height: "100%",
    borderRadius: scaleSize(45),
  },
  profileTextContainer: {
    flex: 1,
    alignSelf: "center",
  },
  profileName: {
    fontSize: scaleFont(22),
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: scaleFont(14),
    color: "#64748b",
  },
  profileActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionButtonTextSmall: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#6366f1",
    marginLeft: 4,
  },

  // Role Badge Styles
  roleBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: scaleFont(10),
    fontWeight: "600",
    marginLeft: 3,
  },
  eventOrganizerBadge: {
    backgroundColor: "#fef3c7", // Light Amber
  },
  eventOrganizerBadgeText: {
    color: "#92400e", // Dark Amber text
    fontSize: scaleFont(9),
    fontWeight: "600",
    marginLeft: 3,
  },

  // Debug Styles
  debugContainer: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: "100%",
  },
  debugTitle: {
    fontSize: scaleFont(14),
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  debugText: {
    fontSize: scaleFont(10),
    color: "#475569",
    lineHeight: 14,
  },

  // General Sections
  section: {
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
  },
  contentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 12,
  },
  screenSubtitle: {
    fontSize: scaleFont(16),
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
  },

  // Action Grid
  actionCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    height: 100,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  actionIcon: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: scaleFont(13),
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },

  // Support/Detailed Options
  horizontalScroll: {
    paddingHorizontal: 10,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  supportIconContainer: {
    padding: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: scaleFont(15),
    fontWeight: "600",
    color: "#1e293b",
  },
  supportSubtitle: {
    fontSize: scaleFont(12),
    color: "#64748b",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  optionIconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: scaleFont(15),
    fontWeight: "500",
    color: "#1e293b",
  },
  optionSubtitle: {
    fontSize: scaleFont(12),
    color: "#64748b",
  },

  // Edit Profile & Settings
  profilePictureSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  profilePicture: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderRadius: scaleSize(40),
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: scaleSize(40),
  },
  changePhotoButton: {
    padding: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: scaleFont(12),
    fontWeight: "500",
    color: "#000",
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: scaleFont(14),
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: scaleFont(15),
    color: "#000",
    backgroundColor: "#f8fafc",
  },
  saveButtonContainer: {
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },

  // Notifications & Privacy
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: scaleFont(15),
    fontWeight: "500",
    color: "#1e293b",
  },
  settingDescription: {
    fontSize: scaleFont(12),
    color: "#64748b",
    marginTop: 2,
  },
  settingGroup: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingGroupTitle: {
    fontSize: scaleFont(15),
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  settingGroupDescription: {
    fontSize: scaleFont(12),
    color: "#64748b",
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  radioOptionSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#f1f5ff",
  },
  radioLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    width: scaleFont(18),
    height: scaleFont(18),
    borderRadius: scaleFont(9),
    borderWidth: 1,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: scaleFont(14),
    color: "#1e293b",
    fontWeight: "500",
  },
  radioDescription: {
    fontSize: scaleFont(11),
    color: "#64748b",
  },

  // Payment Screen Styles
  screenHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: scaleFont(12),
    fontWeight: "600",
    marginLeft: 4,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4", // Green 50
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#dcfce7", // Green 200
  },
  securityNoticeText: {
    fontSize: scaleFont(12),
    color: "#065f46", // Green 700
    marginLeft: 8,
  },
  paymentMethodCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  paymentMethodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: scaleFont(15),
    fontWeight: "600",
    color: "#1e293b",
  },
  paymentMethodSubtitle: {
    fontSize: scaleFont(12),
    color: "#64748b",
  },
  defaultBadge: {
    backgroundColor: "#10b981", // Emerald 500
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: "#fff",
    fontSize: scaleFont(9),
    fontWeight: "700",
  },
  paymentMethodActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  paymentActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  paymentActionText: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#6366f1",
  },
  removeButton: {
    backgroundColor: "#fef2f2", // Red 50
  },
  removeButtonText: {
    color: "#ef4444", // Red 500
  },
  favoriteEventCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  favoriteEventImage: {
    width: scaleSize(50),
    height: scaleSize(50),
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  favoriteEventContent: {
    flex: 1,
  },
  favoriteEventTitle: {
    fontSize: scaleFont(15),
    fontWeight: "600",
    color: "#1e293b",
  },
  favoriteEventDate: {
    fontSize: scaleFont(12),
    color: "#64748b",
  },
  favoriteEventVenue: {
    fontSize: scaleFont(12),
    color: "#64748b",
  },
  favoriteEventPrice: {
    fontSize: scaleFont(14),
    fontWeight: "700",
    color: "#10b981",
    marginTop: 2,
  },
  removeFavoriteButton: {
    padding: 5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyStateTitle: {
    fontSize: scaleFont(18),
    fontWeight: "600",
    color: "#64748b",
    marginTop: 15,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: scaleFont(14),
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: scaleFont(15),
    fontWeight: "600",
  },

  // Edit Profile Styles
  profilePictureSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  profilePicture: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderRadius: scaleSize(40),
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: scaleFont(14),
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "500",
  },
  accountAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  accountActionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountActionText: {
    fontSize: scaleFont(15),
    color: "#000",
    marginLeft: 10,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fef2f2", // Red 50
    borderWidth: 1,
    borderColor: "#fecaca", // Red 300
  },
  logoutButtonText: {
    color: "#ef4444", // Red 500
    fontSize: scaleFont(16),
    fontWeight: "600",
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: "700",
    marginBottom: 8,
    color: "#000",
  },
  modalContent: {
    fontSize: scaleFont(14),
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: scaleFont(14),
    fontWeight: "600",
  },
  modalCancelButton: {
    backgroundColor: "#e2e8f0",
  },
  modalConfirmButton: {
    backgroundColor: "#ef4444", // Red 500
  },
});

export default ProfileScreen;
