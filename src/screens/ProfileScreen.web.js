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
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (user?.profile_picture) {
      setImage(user.profile_picture);
    }
    if (isAdmin()) {
      fetchDashboardStats();
    }
  }, [user]);

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'SUPER_ADMIN' || user.role === 'EVENT_MANAGER' || user.role === 'SUPPORT' || user.role === 'SUPERHERO');
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
    if (!isAdmin()) return;
    
    setStatsLoading(true);
    try {
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/api/admin/dashboard/stats`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats({
        totalEvents: 12,
        totalTickets: 450,
        totalRevenue: 67500,
        totalCustomers: 320
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isAdmin()) {
      await fetchDashboardStats();
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

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon');
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    setLoading(true);
    try {
      await logout();
      // Navigate to SearchEventsScreen after logout
      navigation.navigate('SearchEventsScreen');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const handleMyTicketsPress = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to view your tickets',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Log In',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } else {
      navigation.navigate('MyTickets');
    }
  };

  const handleBrowseEvents = () => {
    // UPDATED: Navigate directly to SearchEventsScreen
    navigation.navigate('SearchEventsScreen');
  };

  // Modern Minimalist Stat Card for Dashboard Overview
  const StatCard = ({ icon, value, label, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Modern Minimalist Action Card for Quick Actions
  const ActionCard = ({ icon, title, color, onPress }) => (
    <TouchableOpacity 
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  // Support Action Card for Support Section
  const SupportCard = ({ icon, title, subtitle, onPress, color = '#64748b' }) => (
    <TouchableOpacity 
      style={styles.supportCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.supportIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  // Keep original ProfileOption for other sections
  const ProfileOption = ({ icon, title, subtitle, onPress, showArrow = true, color = '#6366f1' }) => (
    <TouchableOpacity 
      style={styles.optionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      )}
    </TouchableOpacity>
  );

  const getAdminRoleDisplay = () => {
    if (!user || !isAdmin()) return 'Administrator';
    
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'EVENT_MANAGER':
        return 'Event Manager';
      case 'SUPPORT':
        return 'Support Team';
      case 'SUPERHERO':
        return 'Superhero';
      case 'admin':
      default:
        return 'Administrator';
    }
  };

  // Not logged in state - Simplified with direct access to events
  if (!user) {
    return (
      <ScreenContainer>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header for Non-Logged In Users */}
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              <View style={styles.welcomeIconContainer}>
                <Ionicons name="person-circle-outline" size={60} color="#6366f1" />
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
            <View style={styles.actionsGrid}>
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
                onPress={handleBrowseEvents}
              />
              <ActionCard
                icon="star-outline"
                title="Featured"
                color="#f59e0b"
                onPress={handleBrowseEvents}
              />
            </View>
          </View>

          {/* My Tickets Section - Show login prompt */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Tickets</Text>
            <View style={styles.loginPromptCard}>
              <View style={styles.loginPromptIcon}>
                <Ionicons name="ticket-outline" size={32} color="#64748b" />
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
              style={styles.loginButtonCard}
              onPress={() => navigation.navigate('Login')}
            >
              <View style={styles.loginButtonIcon}>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
              </View>
              <View style={styles.loginButtonContent}>
                <Text style={styles.loginButtonTitle}>Log In</Text>
                <Text style={styles.loginButtonSubtitle}>Access your existing account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupButtonCard}
              onPress={() => navigation.navigate('Registration')}
            >
              <View style={styles.signupButtonIcon}>
                <Ionicons name="person-add-outline" size={20} color="#fff" />
              </View>
              <View style={styles.signupButtonContent}>
                <Text style={styles.signupButtonTitle}>Create Account</Text>
                <Text style={styles.signupButtonSubtitle}>Join Ticket-Hub today</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <SupportCard
              icon="help-circle-outline"
              title="Help Center"
              subtitle="Get help and support"
              onPress={() => Alert.alert('Help Center', 'Contact support@ticket-hub.com')}
              color="#6366f1"
            />
            
            <SupportCard
              icon="document-text-outline"
              title="Terms & Conditions"
              subtitle="Read terms of service"
              onPress={() => Alert.alert('Terms & Conditions', 'Terms coming soon')}
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
        </ScrollView>
      </ScreenContainer>
    );
  }

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
        {/* Minimalist Profile Header - Removed profile pic and email, kept role badge */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{getUserDisplayName()}</Text>
            
            {/* Restored Role Badge */}
            <View style={styles.roleBadgeContainer}>
              {isAdmin() && (
                <View style={[styles.roleBadge, styles.adminBadge]}>
                  <Ionicons name="shield-checkmark" size={10} color="#fff" />
                  <Text style={styles.roleBadgeText}>{getAdminRoleDisplay()}</Text>
                </View>
              )}
              {isCustomer() && (
                <View style={[styles.roleBadge, styles.customerBadge]}>
                  <Ionicons name="person" size={10} color="#fff" />
                  <Text style={styles.roleBadgeText}>Customer</Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={handleEditProfile}
            >
              <Ionicons name="create-outline" size={14} color="#6366f1" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Dashboard Section */}
        {isAdmin() && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dashboard Overview</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchDashboardStats}
              >
                <Ionicons name="refresh" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modern Minimalist Stats Grid */}
            {statsLoading ? (
              <View style={styles.statsLoadingContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
              </View>
            ) : stats ? (
              <View style={styles.statsGrid}>
                <StatCard
                  icon="calendar"
                  value={stats.totalEvents || 0}
                  label="Events"
                  color="#6366f1"
                />
                <StatCard
                  icon="ticket"
                  value={stats.totalTickets || 0}
                  label="Tickets"
                  color="#10b981"
                />
                <StatCard
                  icon="cash"
                  value={`R${((stats.totalRevenue || 0) / 1000).toFixed(0)}K`}
                  label="Revenue"
                  color="#f59e0b"
                />
                <StatCard
                  icon="people"
                  value={stats.totalCustomers || 0}
                  label="Customers"
                  color="#ef4444"
                />
              </View>
            ) : null}

            {/* Modern Minimalist Quick Actions - 3 per row */}
            <View style={styles.quickActions}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                <ActionCard
                  icon="qr-code"
                  title="Scanner"
                  color="#ef4444"
                  onPress={() => navigation.navigate('Scanner')}
                />
                <ActionCard
                  icon="analytics"
                  title="Analytics"
                  color="#6366f1"
                  onPress={() => navigation.navigate('AdminDashboard')}
                />
                <ActionCard
                  icon="calendar"
                  title="Events"
                  color="#10b981"
                  onPress={() => navigation.navigate('EventManagement')}
                />
                <ActionCard
                  icon="add-circle"
                  title="Create"
                  color="#f59e0b"
                  onPress={() => navigation.navigate('CreateEvent')}
                />
                <ActionCard
                  icon="people"
                  title="Users"
                  color="#8b5cf6"
                  onPress={() => navigation.navigate('UserManagement')}
                />
                <ActionCard
                  icon="settings"
                  title="Settings"
                  color="#64748b"
                  onPress={() => navigation.navigate('AdminSettings')}
                />
              </View>
            </View>
          </View>
        )}

        {/* My Account Section - Keep for customers only */}
        {isCustomer() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Account</Text>
            
            <ProfileOption
              icon="ticket"
              title="My Tickets"
              subtitle="View purchased tickets"
              onPress={handleMyTicketsPress}
              color="#6366f1"
            />
            
            <ProfileOption
              icon="calendar-outline"
              title="Browse Events"
              subtitle="Discover upcoming events"
              onPress={handleBrowseEvents}
              color="#3b82f6"
            />
            
            <ProfileOption
              icon="heart-outline"
              title="Favorites"
              subtitle="Your saved events"
              onPress={() => Alert.alert('Coming Soon', 'Favorites feature coming soon')}
              color="#ef4444"
            />

            <ProfileOption
              icon="card-outline"
              title="Payment Methods"
              subtitle="Manage payment options"
              onPress={() => Alert.alert('Coming Soon', 'Payment methods coming soon')}
              color="#f59e0b"
            />
          </View>
        )}

        {/* Settings Section - Keep original design for customers, removed for admins since it's in Quick Actions */}
        {isCustomer() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <ProfileOption
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update personal information"
              onPress={() => Alert.alert('Coming Soon', 'Profile editing coming soon')}
              color="#64748b"
            />
            
            <ProfileOption
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage preferences"
              onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon')}
              color="#64748b"
            />
            
            <ProfileOption
              icon="shield-outline"
              title="Privacy & Security"
              subtitle="Control privacy settings"
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon')}
              color="#64748b"
            />
          </View>
        )}

        {/* Support Section - Updated to use card display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SupportCard
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => Alert.alert('Help Center', 'Contact support@ticket-hub.com')}
            color="#6366f1"
          />
          
          <SupportCard
            icon="document-text-outline"
            title="Terms & Conditions"
            subtitle="Read terms of service"
            onPress={() => Alert.alert('Terms & Conditions', 'Terms coming soon')}
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
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy details coming soon')}
            color="#8b5cf6"
          />
        </View>

        {/* Logout Button - Keep original design */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Ticket-Hub. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal - Keep original design */}
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={40} color="#ef4444" />
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

// ... (styles remain exactly the same as in the previous version)
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  notLoggedInText: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Welcome styles for non-logged in users
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  // Login prompt styles
  loginPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  loginPromptIcon: {
    marginRight: 16,
  },
  loginPromptContent: {
    flex: 1,
  },
  loginPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  loginPromptSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  // Authentication button styles
  loginButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  loginButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loginButtonContent: {
    flex: 1,
  },
  loginButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  loginButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  signupButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  signupButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  signupButtonContent: {
    flex: 1,
  },
  signupButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  signupButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  // Minimalist Profile Header - Removed profile pic and email, kept role badge
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  // Restored Role Badge Styles
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
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  adminBadge: {
    backgroundColor: '#6366f1',
  },
  customerBadge: {
    backgroundColor: '#3b82f6',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editProfileText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  // Modern Minimalist Stats Grid - Updated
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  statsLoadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  // Modern Minimalist Quick Actions - Updated
  quickActions: {
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 56) / 3,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  // Support Card Styles
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  supportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  // Keep original styles for other sections
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 8,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalButtonCancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;