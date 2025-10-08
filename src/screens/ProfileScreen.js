import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://localhost:3000';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard stats
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
      Alert.alert('Error', 'Failed to load dashboard stats');
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

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    setLoading(true);
    try {
      await logout();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, value, label, color }) => (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Ionicons name={icon} size={28} color="#fff" style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ProfileOption = ({ icon, title, subtitle, onPress, showArrow = true, color = '#000' }) => (
    <TouchableOpacity 
      style={styles.optionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={24} color="#999" />
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

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={80} color="#ccc" />
          <Text style={styles.notLoggedInText}>Please login to view your profile</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleImagePick}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color="#fff" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {getUserDisplayName()}
          </Text>
          <Text style={styles.userEmail}>{getUserEmail()}</Text>
          
          {isAdmin() && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text style={styles.adminBadgeText}>{getAdminRoleDisplay()}</Text>
            </View>
          )}

          {isCustomer() && (
            <View style={styles.customerBadge}>
              <Ionicons name="person" size={16} color="#fff" />
              <Text style={styles.customerBadgeText}>Customer</Text>
            </View>
          )}
        </View>

        {/* Admin Dashboard Section - Only visible to admins */}
        {isAdmin() && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Admin Dashboard</Text>
              <TouchableOpacity onPress={fetchDashboardStats}>
                <Ionicons name="refresh" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Dashboard Stats */}
            {statsLoading ? (
              <View style={styles.statsLoadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
              </View>
            ) : stats ? (
              <View style={styles.statsGrid}>
                <StatCard
                  icon="calendar"
                  value={stats.totalEvents || 0}
                  label="Total Events"
                  color="#6200ee"
                />
                <StatCard
                  icon="ticket"
                  value={stats.totalTickets || 0}
                  label="Tickets Sold"
                  color="#2196F3"
                />
                <StatCard
                  icon="cash"
                  value={`R${(stats.totalRevenue || 0).toFixed(0)}`}
                  label="Revenue"
                  color="#4CAF50"
                />
                <StatCard
                  icon="people"
                  value={stats.totalCustomers || 0}
                  label="Customers"
                  color="#FF9800"
                />
              </View>
            ) : (
              <View style={styles.statsErrorContainer}>
                <Ionicons name="alert-circle-outline" size={40} color="#ccc" />
                <Text style={styles.statsErrorText}>Unable to load stats</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchDashboardStats}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Admin Quick Actions */}
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              
              <ProfileOption
                icon="qr-code-outline"
                title="QR Code Scanner"
                subtitle="Scan and validate event tickets"
                onPress={() => navigation.navigate('Scanner')}
                color="#FF4444"
              />

              <ProfileOption
                icon="analytics"
                title="Full Dashboard"
                subtitle="View detailed analytics"
                onPress={() => navigation.navigate('AdminDashboard')}
                color="#6200ee"
              />
              
              <ProfileOption
                icon="calendar"
                title="Manage Events"
                subtitle="Edit and manage all events"
                onPress={() => navigation.navigate('EventManagement')}
                color="#2196F3"
              />
              
              <ProfileOption
                icon="add-circle"
                title="Create New Event"
                subtitle="Add a new event"
                onPress={() => navigation.navigate('CreateEvent')}
                color="#4CAF50"
              />

              <ProfileOption
                icon="people"
                title="User Management"
                subtitle="Manage customers and staff roles"
                onPress={() => navigation.navigate('UserManagement')}
                color="#9C27B0"
              />
            </View>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Account</Text>
          
          <ProfileOption
            icon="ticket"
            title="My Tickets"
            subtitle="View your purchased tickets"
            onPress={() => navigation.navigate('MyTickets')}
            color="#000"
          />
          
          <ProfileOption
            icon="calendar-outline"
            title="Browse Events"
            subtitle="Discover upcoming events"
            onPress={() => navigation.navigate('HomeTab')}
            color="#000"
          />
          
          <ProfileOption
            icon="heart-outline"
            title="Favorites"
            subtitle="Your saved events"
            onPress={() => Alert.alert('Coming Soon', 'Favorites feature coming soon')}
            color="#FF4444"
          />

          {isCustomer() && (
            <ProfileOption
              icon="card-outline"
              title="Payment Methods"
              subtitle="Manage your payment options"
              onPress={() => Alert.alert('Coming Soon', 'Payment methods coming soon')}
              color="#000"
            />
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <ProfileOption
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => Alert.alert('Coming Soon', 'Profile editing coming soon')}
            color="#000"
          />
          
          <ProfileOption
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon')}
            color="#000"
          />
          
          <ProfileOption
            icon="shield-outline"
            title="Privacy & Security"
            subtitle="Control your privacy settings"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon')}
            color="#000"
          />

          {isAdmin() && (
            <ProfileOption
              icon="settings-outline"
              title="Admin Settings"
              subtitle="System configuration"
              onPress={() => Alert.alert('Coming Soon', 'Admin settings coming soon')}
              color="#6200ee"
            />
          )}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <ProfileOption
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => Alert.alert('Help Center', 'Contact support@ticket-hub.com')}
            color="#000"
          />
          
          <ProfileOption
            icon="document-text-outline"
            title="Terms & Conditions"
            subtitle="Read our terms of service"
            onPress={() => Alert.alert('Terms & Conditions', 'Terms coming soon')}
            color="#000"
          />
          
          <ProfileOption
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('About', 'Ticket-Hub v1.0.0\nYour gateway to amazing events')}
            color="#000"
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Ticket-Hub. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={48} color="#000" />
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
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#000',
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notLoggedInText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  customerBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    paddingLeft: 4,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  statsLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsErrorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsErrorText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    marginTop: 8,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    paddingLeft: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
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
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;