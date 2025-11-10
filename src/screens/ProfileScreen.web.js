import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

// Responsive scaling functions
const scaleSize = (size) => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.5));
};

const scaleFont = (size) => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.3));
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout, getAuthHeader, hasAdminPrivileges } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);

  // Edit Profile State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });

  // Notifications State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    eventReminders: true,
    promotionalEmails: false,
    ticketUpdates: true,
    newEvents: true,
    smsNotifications: false,
  });

  // Privacy & Security State
  const [privacySettings, setPrivacySettings] = useState({
    twoFactorAuth: false,
    dataSharing: false,
    profileVisibility: 'public',
    locationTracking: false,
    biometricLogin: false,
    activityPrivacy: 'friends',
  });

  useEffect(() => {
    if (user?.profile_picture) {
      setImage(user.profile_picture);
    }
    if (hasAdminPrivileges()) {
      fetchDashboardStats();
    }
    if (user) {
      loadPaymentMethods();
      loadFavoriteEvents();
      loadUserProfileData();
    }
  }, [user]);

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'event_manager');
  };

  const isEventManager = () => {
    return user && user.role === 'event_manager';
  };

  const isCustomer = () => {
    return user && user.role === 'customer';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (isCustomer()) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    } else if (isAdmin()) {
      return user.username || user.email || 'Admin User';
    }
    
    return user.email || 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const fetchDashboardStats = async () => {
    if (!hasAdminPrivileges()) return;
    
    setStatsLoading(true);
    
    // Mock data
    const mockStats = {
      totalEvents: 12,
      totalTickets: 450,
      totalRevenue: 67500,
      totalCustomers: 320
    };
    
    setStats(mockStats);
    setStatsLoading(false);
    
    // Optional API call
    try {
      const headers = getAuthHeader();
      await axios.get(`${API_URL}/api/admin/dashboard/stats`, { headers });
    } catch (error) {
      console.log('API call failed, using mock stats');
    }
  };

  const loadPaymentMethods = async () => {
    // Mock payment methods data
    const mockPaymentMethods = [
      {
        id: 1,
        type: 'credit_card',
        last4: '4242',
        brand: 'visa',
        expiry: '12/25',
        isDefault: true,
        cardholder: getUserDisplayName()
      },
      {
        id: 2,
        type: 'credit_card',
        last4: '8888',
        brand: 'mastercard',
        expiry: '08/24',
        isDefault: false,
        cardholder: getUserDisplayName()
      },
      {
        id: 3,
        type: 'paypal',
        email: 'user@example.com',
        isDefault: false
      }
    ];
    
    setPaymentMethods(mockPaymentMethods);
  };

  const loadFavoriteEvents = async () => {
    // Mock favorite events data
    const mockFavoriteEvents = [
      {
        id: 1,
        title: 'Summer Music Festival 2024',
        date: '2024-07-15',
        venue: 'Central Park',
        image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=150',
        price: 89.99
      },
      {
        id: 2,
        title: 'Tech Conference 2024',
        date: '2024-08-22',
        venue: 'Convention Center',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150',
        price: 199.99
      },
      {
        id: 3,
        title: 'Food & Wine Expo',
        date: '2024-09-05',
        venue: 'Exhibition Hall',
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=150',
        price: 45.00
      },
      {
        id: 4,
        title: 'Jazz Night Live',
        date: '2024-07-30',
        venue: 'Blue Note Club',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150',
        price: 35.00
      }
    ];
    
    setFavoriteEvents(mockFavoriteEvents);
  };

  const loadUserProfileData = () => {
    // Mock user profile data
    setProfileData({
      firstName: user?.first_name || 'John',
      lastName: user?.last_name || 'Doe',
      email: user?.email || 'john.doe@example.com',
      phone: '+27 72 123 4567',
      dateOfBirth: '1990-01-15',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (hasAdminPrivileges()) {
      await fetchDashboardStats();
    }
    if (user) {
      await loadPaymentMethods();
      await loadFavoriteEvents();
      loadUserProfileData();
    }
    setRefreshing(false);
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleEditProfilePress = () => {
    setShowEditProfile(true);
  };

  const handleNotificationsPress = () => {
    setShowNotifications(true);
  };

  const handlePrivacySecurityPress = () => {
    setShowPrivacySecurity(true);
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    setLoading(true);
    try {
      await logout();
      // After logout, navigation will automatically redirect to login due to auth state change
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  // SIMPLIFIED: Navigation functions - all tabs are in the same navigator now
  const handleBrowseEvents = () => {
    console.log('Navigating to Browse Events...');
    navigation.navigate('BrowseEvents');
  };

  const handleDiscoverNavigation = () => {
    console.log('Navigating to Discover...');
    navigation.navigate('Discover');
  };

  const handleMyTicketsNavigation = () => {
    console.log('Navigating to My Tickets...');
    navigation.navigate('MyTickets');
  };

  // Admin navigation functions
  const handleAdminDashboard = () => {
    navigation.navigate('Dashboard');
  };

  const handleManageEvents = () => {
    navigation.navigate('Events');
  };

  const handleManageUsers = () => {
    navigation.navigate('Users');
  };

  const handleScannerNavigation = () => {
    navigation.navigate('Scanner');
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent');
  };

  const handleFavoritesPress = () => {
    setShowFavorites(true);
    setShowPaymentMethods(false);
    setShowEditProfile(false);
    setShowNotifications(false);
    setShowPrivacySecurity(false);
  };

  const handlePaymentMethodsPress = () => {
    setShowPaymentMethods(true);
    setShowFavorites(false);
    setShowEditProfile(false);
    setShowNotifications(false);
    setShowPrivacySecurity(false);
  };

  const handleBackToProfile = () => {
    setShowFavorites(false);
    setShowPaymentMethods(false);
    setShowEditProfile(false);
    setShowNotifications(false);
    setShowPrivacySecurity(false);
  };

  const handleAddPaymentMethod = () => {
    // Mock adding a new payment method
    const newPaymentMethod = {
      id: paymentMethods.length + 1,
      type: 'credit_card',
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      brand: 'visa',
      expiry: '06/26',
      isDefault: false,
      cardholder: getUserDisplayName()
    };
    
    setPaymentMethods([...paymentMethods, newPaymentMethod]);
    Alert.alert('Success', 'New payment method added successfully!');
  };

  const handleRemoveFavorite = (eventId) => {
    const updatedFavorites = favoriteEvents.filter(event => event.id !== eventId);
    setFavoriteEvents(updatedFavorites);
    Alert.alert('Removed', 'Event removed from favorites');
  };

  const handleSetDefaultPayment = (methodId) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId
    }));
    setPaymentMethods(updatedMethods);
    Alert.alert('Success', 'Default payment method updated');
  };

  const handleRemovePaymentMethod = (methodId) => {
    if (paymentMethods.find(method => method.id === methodId)?.isDefault) {
      Alert.alert('Cannot Remove', 'Cannot remove default payment method. Please set another method as default first.');
      return;
    }
    
    const updatedMethods = paymentMethods.filter(method => method.id !== methodId);
    setPaymentMethods(updatedMethods);
    Alert.alert('Removed', 'Payment method removed');
  };

  const handleSaveProfile = () => {
    // Mock save profile
    Alert.alert('Success', 'Profile updated successfully!');
    handleBackToProfile();
  };

  const handleSaveNotifications = () => {
    // Mock save notifications
    Alert.alert('Success', 'Notification settings updated!');
    handleBackToProfile();
  };

  const handleSavePrivacy = () => {
    // Mock save privacy settings
    Alert.alert('Success', 'Privacy settings updated!');
    handleBackToProfile();
  };

  const handleToggleNotification = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleTogglePrivacy = (setting) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleProfileVisibilityChange = (value) => {
    setPrivacySettings(prev => ({
      ...prev,
      profileVisibility: value
    }));
  };

  const handleActivityPrivacyChange = (value) => {
    setPrivacySettings(prev => ({
      ...prev,
      activityPrivacy: value
    }));
  };

  // Calculate responsive widths - FIXED FOR BETTER DISPLAY
  const getCardWidth = () => {
    if (width >= 1024) {
      return Math.min(width - 120, 600);
    } else if (width >= 768) {
      return Math.min(width - 80, 500);
    }
    return Math.min(width - 32, 400);
  };

  const getActionCardWidth = () => {
    if (width >= 1024) {
      return (Math.min(width - 120, 600) - 48) / 3;
    } else if (width >= 768) {
      return (Math.min(width - 80, 500) - 32) / 3;
    }
    return (Math.min(width - 32, 400) - 24) / 3;
  };

  // Modern Minimalist Action Card for Quick Actions
  const ActionCard = ({ icon, title, color, onPress }) => (
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

  // Support Action Card for Support Section
  const SupportCard = ({ icon, title, subtitle, onPress, color = '#64748b' }) => (
    <TouchableOpacity 
      style={[styles.supportCard, { width: getCardWidth() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.supportIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={scaleFont(20)} color={color} />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
    </TouchableOpacity>
  );

  // ProfileOption for other sections
  const ProfileOption = ({ icon, title, subtitle, onPress, showArrow = true, color = '#6366f1' }) => (
    <TouchableOpacity 
      style={[styles.optionCard, { width: getCardWidth() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIconContainer, { backgroundColor: color + '15' }]}>
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

  // Setting Toggle Component
  const SettingToggle = ({ icon, title, description, value, onValueChange, color = '#6366f1' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
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
        trackColor={{ false: '#e2e8f0', true: color }}
        thumbColor={value ? '#fff' : '#f8fafc'}
      />
    </View>
  );

  // Radio Option Component
  const RadioOption = ({ label, description, value, selected, onSelect, color = '#6366f1' }) => (
    <TouchableOpacity 
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={() => onSelect(value)}
    >
      <View style={styles.radioLeft}>
        <View style={[styles.radioCircle, selected && { backgroundColor: color }]}>
          {selected && <Ionicons name="checkmark" size={scaleFont(12)} color="#fff" />}
        </View>
        <View style={styles.radioTextContainer}>
          <Text style={styles.radioLabel}>{label}</Text>
          {description && <Text style={styles.radioDescription}>{description}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Payment Method Card
  const PaymentMethodCard = ({ method, onSetDefault, onRemove }) => (
    <View style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodHeader}>
        <View style={styles.paymentMethodIcon}>
          {method.type === 'credit_card' ? (
            <Ionicons 
              name={method.brand === 'visa' ? 'card' : 'card-outline'} 
              size={scaleFont(20)} 
              color="#64748b" 
            />
          ) : (
            <Ionicons name="logo-paypal" size={scaleFont(20)} color="#0070ba" />
          )}
        </View>
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodTitle}>
            {method.type === 'credit_card' 
              ? `${method.brand?.toUpperCase() || 'Credit Card'} •••• ${method.last4}`
              : 'PayPal'
            }
          </Text>
          <Text style={styles.paymentMethodSubtitle}>
            {method.type === 'credit_card' 
              ? `Expires ${method.expiry}`
              : method.email
            }
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
          <Text style={[styles.paymentActionText, styles.removeButtonText]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Favorite Event Card
  const FavoriteEventCard = ({ event, onRemove }) => (
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

  const getAdminRoleDisplay = () => {
    if (!user || !isAdmin()) return 'Administrator';
    
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'EVENT_MANAGER':
        return 'Event Manager';
      case 'event_manager':
        return 'Event Manager';
      case 'SUPPORT':
        return 'Support Team';
      case 'SUPERHERO':
        return 'Superhero';
      case 'admin':
        return 'Administrator';
      default:
        return 'Administrator';
    }
  };

  // Container component for responsive layout
  const ResponsiveContainer = ({ children, isGrid = false }) => (
    <View style={isGrid ? styles.responsiveGrid : styles.responsiveContainer}>
      {children}
    </View>
  );

  // Favorites Screen Component
  const FavoritesScreen = () => (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, styles.detailedScreenContent]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Header with Back Button */}
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons name="arrow-back" size={scaleFont(20)} color="#6366f1" />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Saved Events</Text>
          </View>

          {/* Favorites Content */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            {favoriteEvents.length > 0 ? (
              <>
                <Text style={styles.screenSubtitle}>
                  {favoriteEvents.length} saved event{favoriteEvents.length !== 1 ? 's' : ''}
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
                <Ionicons name="heart-outline" size={scaleFont(64)} color="#cbd5e1" />
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

  // Payment Methods Screen Component
  const PaymentMethodsScreen = () => (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, styles.detailedScreenContent]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Header with Back Button */}
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons name="arrow-back" size={scaleFont(20)} color="#6366f1" />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Payment Methods</Text>
          </View>

          {/* Payment Methods Content */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <View style={styles.screenHeaderRow}>
              <Text style={styles.screenSubtitle}>
                {paymentMethods.length} payment method{paymentMethods.length !== 1 ? 's' : ''}
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
                <Ionicons name="card-outline" size={scaleFont(64)} color="#cbd5e1" />
                <Text style={styles.emptyStateTitle}>No Payment Methods</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Add a payment method for faster checkout
                </Text>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleAddPaymentMethod}
                >
                  <Text style={styles.primaryButtonText}>Add Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Security Notice */}
          <View style={[styles.securityNotice, { width: getCardWidth() }]}>
            <Ionicons name="shield-checkmark" size={scaleFont(16)} color="#10b981" />
            <Text style={styles.securityNoticeText}>
              Your payment information is secure and encrypted
            </Text>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  // Edit Profile Screen Component
  const EditProfileScreen = () => (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, styles.detailedScreenContent]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Header with Back Button */}
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons name="arrow-back" size={scaleFont(20)} color="#6366f1" />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Edit Profile</Text>
          </View>

          {/* Profile Picture Section */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Profile Picture</Text>
            <View style={styles.profilePictureSection}>
              <View style={styles.profilePicture}>
                {image ? (
                  <View style={styles.profileImage}>
                    <Ionicons name="person" size={scaleFont(32)} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="person-circle" size={scaleFont(80)} color="#cbd5e1" />
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

          {/* Personal Information Section */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Personal Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.firstName}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, firstName: text }))}
                placeholder="Enter your first name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.lastName}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, lastName: text }))}
                placeholder="Enter your last name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.email}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
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
                onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
                placeholder="+27 12 345 6789"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.dateOfBirth}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, dateOfBirth: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {/* Save Button - FIXED POSITION */}
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

  // Notifications Screen Component
  const NotificationsScreen = () => (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, styles.detailedScreenContent]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Header with Back Button */}
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons name="arrow-back" size={scaleFont(20)} color="#6366f1" />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Notification Settings</Text>
          </View>

          {/* Notification Settings */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Email Notifications</Text>
            
            <SettingToggle
              icon="mail-outline"
              title="Email Notifications"
              description="Receive important updates via email"
              value={notificationSettings.emailNotifications}
              onValueChange={() => handleToggleNotification('emailNotifications')}
              color="#6366f1"
            />

            <SettingToggle
              icon="megaphone-outline"
              title="Promotional Emails"
              description="Get updates about new events and offers"
              value={notificationSettings.promotionalEmails}
              onValueChange={() => handleToggleNotification('promotionalEmails')}
              color="#f59e0b"
            />

            <SettingToggle
              icon="ticket-outline"
              title="Ticket Updates"
              description="Notifications about your ticket purchases"
              value={notificationSettings.ticketUpdates}
              onValueChange={() => handleToggleNotification('ticketUpdates')}
              color="#10b981"
            />

            <SettingToggle
              icon="calendar-outline"
              title="New Events"
              description="Get notified about events matching your interests"
              value={notificationSettings.newEvents}
              onValueChange={() => handleToggleNotification('newEvents')}
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
              onValueChange={() => handleToggleNotification('pushNotifications')}
              color="#8b5cf6"
            />

            <SettingToggle
              icon="alarm-outline"
              title="Event Reminders"
              description="Get reminded before your events start"
              value={notificationSettings.eventReminders}
              onValueChange={() => handleToggleNotification('eventReminders')}
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
              onValueChange={() => handleToggleNotification('smsNotifications')}
              color="#06b6d4"
            />
          </View>

          {/* Save Button - FIXED POSITION */}
          <View style={[styles.saveButtonContainer, { width: getCardWidth() }]}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveNotifications}
            >
              <Text style={styles.saveButtonText}>Save Notification Settings</Text>
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );

  // Privacy & Security Screen Component
  const PrivacySecurityScreen = () => (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, styles.detailedScreenContent]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Header with Back Button */}
          <View style={[styles.screenHeader, { width: getCardWidth() }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToProfile}
            >
              <Ionicons name="arrow-back" size={scaleFont(20)} color="#6366f1" />
              <Text style={styles.backButtonText}>Back to Profile</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Privacy & Security</Text>
          </View>

          {/* Security Settings */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Security</Text>
            
            <SettingToggle
              icon="shield-checkmark-outline"
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              value={privacySettings.twoFactorAuth}
              onValueChange={() => handleTogglePrivacy('twoFactorAuth')}
              color="#10b981"
            />

            <SettingToggle
              icon="finger-print-outline"
              title="Biometric Login"
              description="Use fingerprint or face ID to log in"
              value={privacySettings.biometricLogin}
              onValueChange={() => handleTogglePrivacy('biometricLogin')}
              color="#8b5cf6"
            />
          </View>

          {/* Privacy Settings */}
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
                selected={privacySettings.profileVisibility === 'public'}
                onSelect={handleProfileVisibilityChange}
              />
              
              <RadioOption
                label="Friends Only"
                description="Only your friends can see your profile"
                value="friends"
                selected={privacySettings.profileVisibility === 'friends'}
                onSelect={handleProfileVisibilityChange}
              />
              
              <RadioOption
                label="Private"
                description="Only you can see your profile"
                value="private"
                selected={privacySettings.profileVisibility === 'private'}
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
                selected={privacySettings.activityPrivacy === 'public'}
                onSelect={handleActivityPrivacyChange}
              />
              
              <RadioOption
                label="Friends Only"
                description="Only your friends can see your activity"
                value="friends"
                selected={privacySettings.activityPrivacy === 'friends'}
                onSelect={handleActivityPrivacyChange}
              />
              
              <RadioOption
                label="Private"
                description="Only you can see your activity"
                value="private"
                selected={privacySettings.activityPrivacy === 'private'}
                onSelect={handleActivityPrivacyChange}
              />
            </View>

            <SettingToggle
              icon="location-outline"
              title="Location Tracking"
              description="Allow us to suggest events near you"
              value={privacySettings.locationTracking}
              onValueChange={() => handleTogglePrivacy('locationTracking')}
              color="#3b82f6"
            />

            <SettingToggle
              icon="share-social-outline"
              title="Data Sharing"
              description="Share anonymous data to improve our services"
              value={privacySettings.dataSharing}
              onValueChange={() => handleTogglePrivacy('dataSharing')}
              color="#f59e0b"
            />
          </View>

          {/* Account Actions */}
          <View style={[styles.contentCard, { width: getCardWidth() }]}>
            <Text style={styles.screenSubtitle}>Account Actions</Text>
            
            <TouchableOpacity style={styles.accountAction}>
              <View style={styles.accountActionLeft}>
                <Ionicons name="download-outline" size={scaleFont(20)} color="#64748b" />
                <Text style={styles.accountActionText}>Download Your Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.accountAction}>
              <View style={styles.accountActionLeft}>
                <Ionicons name="trash-outline" size={scaleFont(20)} color="#ef4444" />
                <Text style={[styles.accountActionText, { color: '#ef4444' }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Save Button - FIXED POSITION */}
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

  // Return appropriate screen based on state
  if (showFavorites) {
    return <FavoritesScreen />;
  }

  if (showPaymentMethods) {
    return <PaymentMethodsScreen />;
  }

  if (showEditProfile) {
    return <EditProfileScreen />;
  }

  if (showNotifications) {
    return <NotificationsScreen />;
  }

  if (showPrivacySecurity) {
    return <PrivacySecurityScreen />;
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
            {/* Welcome Header for Non-Logged In Users */}
            <View style={styles.profileHeader}>
              <View style={styles.profileInfo}>
                <View style={styles.welcomeIconContainer}>
                  <Ionicons name="person-circle-outline" size={scaleSize(60)} color="#6366f1" />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to Ticket-Hub</Text>
                <Text style={styles.welcomeSubtitle}>
                  Browse events and discover amazing experiences. Log in to purchase tickets and manage your account.
                </Text>
              </View>
            </View>

            {/* Quick Access Section */}
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

            {/* My Tickets Section - Show login prompt */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Tickets</Text>
              <View style={[styles.loginPromptCard, { width: getCardWidth() }]}>
                <View style={styles.loginPromptIcon}>
                  <Ionicons name="ticket-outline" size={scaleSize(32)} color="#64748b" />
                </View>
                <View style={styles.loginPromptContent}>
                  <Text style={styles.loginPromptTitle}>Log in to see your tickets</Text>
                  <Text style={styles.loginPromptSubtitle}>
                    Sign in to view your purchased tickets and event history
                  </Text>
                </View>
              </View>
            </View>

            {/* Authentication Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              
              <TouchableOpacity
                style={[styles.loginButtonCard, { width: getCardWidth() }]}
                onPress={() => navigation.navigate('Login')}
              >
                <View style={styles.loginButtonIcon}>
                  <Ionicons name="log-in-outline" size={scaleFont(20)} color="#fff" />
                </View>
                <View style={styles.loginButtonContent}>
                  <Text style={styles.loginButtonTitle}>Log In</Text>
                  <Text style={styles.loginButtonSubtitle}>Access your existing account</Text>
                </View>
                <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signupButtonCard, { width: getCardWidth() }]}
                onPress={() => navigation.navigate('Registration')}
              >
                <View style={styles.signupButtonIcon}>
                  <Ionicons name="person-add-outline" size={scaleFont(20)} color="#fff" />
                </View>
                <View style={styles.signupButtonContent}>
                  <Text style={styles.signupButtonTitle}>Create Account</Text>
                  <Text style={styles.signupButtonSubtitle}>Join Ticket-Hub today</Text>
                </View>
                <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            {/* Support Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              
              <SupportCard
                icon="help-circle-outline"
                title="Help Center"
                subtitle="FAQs, guides and support"
                onPress={() => navigation.navigate('HelpCenter')}
                color="#6366f1"
              />
              
              <SupportCard
                icon="document-text-outline"
                title="Terms & Conditions"
                subtitle="Read terms of service"
                onPress={() => navigation.navigate('TermsConditions')}
                color="#10b981"
              />
              
              <SupportCard
                icon="information-circle-outline"
                title="About"
                subtitle="App information"
                onPress={() => Alert.alert('About', 'Ticket-Hub v1.0.0\nYour gateway to amazing events')}
                color="#f59e0b"
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2024 Ticket-Hub. All rights reserved.</Text>
            </View>
          </ResponsiveContainer>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Main Profile Screen (logged in)
  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ResponsiveContainer>
          {/* Minimalist Profile Header */}
          <View style={[styles.profileHeader, { width: getCardWidth() }]}>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{getUserDisplayName()}</Text>
              
              {/* Role Badge */}
              <View style={styles.roleBadgeContainer}>
                {isAdmin() && (
                  <View style={[
                    styles.roleBadge, 
                    isEventManager() ? styles.eventManagerBadge : styles.adminBadge
                  ]}>
                    <Ionicons 
                      name={isEventManager() ? "calendar" : "shield-checkmark"} 
                      size={scaleFont(10)} 
                      color="#fff" 
                    />
                    <Text style={styles.roleBadgeText}>{getAdminRoleDisplay()}</Text>
                  </View>
                )}
                {isCustomer() && (
                  <View style={[styles.roleBadge, styles.customerBadge]}>
                    <Ionicons name="person" size={scaleFont(10)} color="#fff" />
                    <Text style={styles.roleBadgeText}>Customer</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={handleEditProfilePress}
              >
                <Ionicons name="create-outline" size={scaleFont(14)} color="#6366f1" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions Section - Only show for Admin/Event Managers */}
          {hasAdminPrivileges() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <ResponsiveContainer isGrid={true}>
                <ActionCard
                  icon="analytics"
                  title="Dashboard"
                  color="#8b5cf6"
                  onPress={handleAdminDashboard}
                />
                <ActionCard
                  icon="list"
                  title="Manage Events"
                  color="#ef4444"
                  onPress={handleManageEvents}
                />
                <ActionCard
                  icon="people"
                  title="Manage Users"
                  color="#10b981"
                  onPress={handleManageUsers}
                />
                <ActionCard
                  icon="qr-code"
                  title="Scanner"
                  color="#64748b"
                  onPress={handleScannerNavigation}
                />
                <ActionCard
                  icon="add-circle"
                  title="Create Event"
                  color="#6366f1"
                  onPress={handleCreateEvent}
                />
              </ResponsiveContainer>
            </View>
          )}

          {/* My Account Section - For customers only */}
          {isCustomer() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Account</Text>
              
              <ProfileOption
                icon="heart-outline"
                title="Favorites"
                subtitle={`${favoriteEvents.length} saved events`}
                onPress={handleFavoritesPress}
                color="#ef4444"
              />

              <ProfileOption
                icon="card-outline"
                title="Payment Methods"
                subtitle={`${paymentMethods.length} payment methods`}
                onPress={handlePaymentMethodsPress}
                color="#f59e0b"
              />
            </View>
          )}

          {/* Admin Tools Section */}
          {hasAdminPrivileges() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isEventManager() ? 'Event Manager Tools' : 'Admin Tools'}
              </Text>
              
              <ProfileOption
                icon="analytics"
                title="Dashboard"
                subtitle="View admin statistics"
                onPress={handleAdminDashboard}
                color="#8b5cf6"
              />
              
              <ProfileOption
                icon="list"
                title="Manage Events"
                subtitle="Create and edit events"
                onPress={handleManageEvents}
                color="#ef4444"
              />
              
              <ProfileOption
                icon="people"
                title="User Management"
                subtitle="Manage user accounts"
                onPress={handleManageUsers}
                color="#10b981"
              />
              
              <ProfileOption
                icon="qr-code"
                title="Ticket Scanner"
                subtitle="Scan event tickets"
                onPress={handleScannerNavigation}
                color="#f59e0b"
              />

              <ProfileOption
                icon="add-circle"
                title="Create Event"
                subtitle="Add new event"
                onPress={handleCreateEvent}
                color="#6366f1"
              />
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <ProfileOption
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update personal information"
              onPress={handleEditProfilePress}
              color="#64748b"
            />
            
            <ProfileOption
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage preferences"
              onPress={handleNotificationsPress}
              color="#64748b"
            />
            
            <ProfileOption
              icon="shield-outline"
              title="Privacy & Security"
              subtitle="Control privacy settings"
              onPress={handlePrivacySecurityPress}
              color="#64748b"
            />
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <SupportCard
              icon="help-circle-outline"
              title="Help Center"
              subtitle="FAQs, guides and support"
              onPress={() => navigation.navigate('HelpCenter')}
              color="#6366f1"
            />
            
            <SupportCard
              icon="document-text-outline"
              title="Terms & Conditions"
              subtitle="Read terms of service"
              onPress={() => navigation.navigate('TermsConditions')}
              color="#10b981"
            />
            
            <SupportCard
              icon="information-circle-outline"
              title="About"
              subtitle="App information"
              onPress={() => Alert.alert('About', 'Ticket-Hub v1.0.0\nYour gateway to amazing events')}
              color="#f59e0b"
            />

            <SupportCard
              icon="chatbubble-outline"
              title="Contact Support"
              subtitle="Get in touch with our team"
              onPress={() => Alert.alert('Contact Support', 'Email: support@ticket-hub.com\nPhone: +27 11 123 4567')}
              color="#ef4444"
            />

            <SupportCard
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => navigation.navigate('PrivacyPolicy')}
              color="#8b5cf6"
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { width: getCardWidth() }]}
            onPress={handleLogout}
            disabled={loading}
          >
            <Ionicons name="log-out-outline" size={scaleFont(16)} color="#ef4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 Ticket-Hub. All rights reserved.</Text>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: scaleSize(300) }]}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={scaleSize(40)} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  // FIX: Added specific content style for detailed screens
  detailedScreenContent: {
    paddingBottom: 40, // Extra padding to ensure save button is visible
  },
  responsiveContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: width >= 768 ? 24 : 16,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  // Screen Header Styles
  screenHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#6366f1',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  screenSubtitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  screenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Content Card Styles
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
  },
  // FIX: Save Button Container
  saveButtonContainer: {
    marginTop: 8,
    marginBottom: 30,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: '100%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  // Form Styles
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(16),
    backgroundColor: '#f9fafb',
    minHeight: 48,
  },
  // Profile Picture Styles
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePicture: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderRadius: scaleSize(40),
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#374151',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  // Setting Toggle Styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: scaleFont(14),
    color: '#64748b',
    lineHeight: 18,
  },
  // Setting Group Styles
  settingGroup: {
    marginBottom: 20,
  },
  settingGroupTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingGroupDescription: {
    fontSize: scaleFont(14),
    color: '#64748b',
    marginBottom: 12,
  },
  // Radio Option Styles
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 70,
  },
  radioOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f8faff',
  },
  radioLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  radioCircle: {
    width: scaleSize(20),
    height: scaleSize(20),
    borderRadius: scaleSize(10),
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: scaleFont(14),
    color: '#64748b',
    lineHeight: 18,
  },
  // Account Action Styles
  accountAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 60,
  },
  accountActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountActionText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#374151',
  },
  // Payment Method Styles
  paymentMethodCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodIcon: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: scaleFont(14),
    color: '#64748b',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  paymentActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    minHeight: 36,
    justifyContent: 'center',
  },
  paymentActionText: {
    fontSize: scaleFont(14),
    color: '#64748b',
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#fef2f2',
  },
  removeButtonText: {
    color: '#ef4444',
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: scaleFont(10),
    fontWeight: '600',
  },
  // Favorite Event Styles
  favoriteEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 80,
  },
  favoriteEventImage: {
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  favoriteEventContent: {
    flex: 1,
  },
  favoriteEventTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  favoriteEventDate: {
    fontSize: scaleFont(14),
    color: '#64748b',
    marginBottom: 2,
  },
  favoriteEventVenue: {
    fontSize: scaleFont(14),
    color: '#64748b',
    marginBottom: 4,
  },
  favoriteEventPrice: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#10b981',
  },
  removeFavoriteButton: {
    padding: 8,
    flexShrink: 0,
  },
  // Button Styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  addButtonText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 8,
    marginBottom: 20,
  },
  securityNoticeText: {
    fontSize: scaleFont(14),
    color: '#166534',
    flex: 1,
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: scaleFont(14),
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  // Existing styles remain the same...
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockIconContainer: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  notLoggedInTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  notLoggedInText: {
    fontSize: scaleFont(14),
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  welcomeIconContainer: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderRadius: scaleSize(40),
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  welcomeTitle: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: scaleFont(14),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  loginPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    minHeight: 100,
  },
  loginPromptIcon: {
    marginRight: 16,
  },
  loginPromptContent: {
    flex: 1,
  },
  loginPromptTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  loginPromptSubtitle: {
    fontSize: scaleFont(12),
    color: '#64748b',
    lineHeight: 16,
  },
  loginButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    minHeight: 80,
  },
  loginButtonIcon: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loginButtonContent: {
    flex: 1,
  },
  loginButtonTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  loginButtonSubtitle: {
    fontSize: scaleFont(12),
    color: 'rgba(255,255,255,0.8)',
  },
  signupButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    minHeight: 80,
  },
  signupButtonIcon: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  signupButtonContent: {
    flex: 1,
  },
  signupButtonTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  signupButtonSubtitle: {
    fontSize: scaleFont(12),
    color: 'rgba(255,255,255,0.8)',
  },
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: scaleFont(22),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    minHeight: 28,
  },
  eventManagerBadge: {
    backgroundColor: '#10b981',
  },
  adminBadge: {
    backgroundColor: '#6366f1',
  },
  customerBadge: {
    backgroundColor: '#3b82f6',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: scaleFont(10),
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    minHeight: 40,
  },
  editProfileText: {
    color: '#6366f1',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    width: '100%',
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  quickActions: {
    marginBottom: 8,
    width: '100%',
  },
  quickActionsTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'left',
    width: '100%',
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    minHeight: 100,
    justifyContent: 'center',
  },
  actionIcon: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 80,
  },
  supportIconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: scaleFont(12),
    color: '#64748b',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 80,
  },
  optionIconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: scaleFont(12),
    color: '#64748b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    minHeight: 56,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
    elevation: 10,
    width: '100%',
    maxWidth: 400,
  },
  modalIcon: {
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: scaleSize(30),
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: scaleFont(14),
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    color: '#64748b',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    fontSize: scaleFont(12),
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default ProfileScreen;