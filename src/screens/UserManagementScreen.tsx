import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  FlatList
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrlSync } from '../utils/apiBase';

const API_URL = getApiBaseUrlSync();

const ROLES = [
  { value: 'customer', label: 'Customer', icon: 'person', color: '#2196F3' },
  { value: 'admin', label: 'Admin', icon: 'shield', color: '#6200ee' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: 'shield-checkmark', color: '#9C27B0' },
  { value: 'EVENT_MANAGER', label: 'Event Manager', icon: 'calendar', color: '#FF9800' },
  { value: 'SUPPORT', label: 'Support', icon: 'help-circle', color: '#4CAF50' },
  { value: 'SUPERHERO', label: 'Superhero', icon: 'flash', color: '#FF4444' }
];

const UserManagementScreen = ({ navigation }) => {
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  
  // Modals
  const [createUserModalVisible, setCreateUserModalVisible] = useState(false);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [deleteUserModalVisible, setDeleteUserModalVisible] = useState(false);
  const [rolePickerModalVisible, setRolePickerModalVisible] = useState(false);
  const [rolePickerContext, setRolePickerContext] = useState('create'); // 'create' or 'edit'
  
  // Form states
  const [userType, setUserType] = useState('customer');
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    username: '',
    role: 'customer'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeader();
      
      const [customersResponse, adminsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users/customers`, { headers }),
        axios.get(`${API_URL}/api/admin/users/admins`, { headers })
      ]);

      setCustomers(customersResponse.data.customers || []);
      setAdmins(adminsResponse.data.admins || []);
      
      const allUsers = [
        ...customersResponse.data.customers.map(c => ({ ...c, userType: 'customer' })),
        ...adminsResponse.data.admins.map(a => ({ ...a, userType: 'admin' }))
      ];
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleCreateUser = async () => {
    try {
      if (userType === 'customer') {
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          Alert.alert('Error', 'Please fill all required fields');
          return;
        }
      } else {
        if (!formData.username || !formData.email || !formData.password || !formData.role) {
          Alert.alert('Error', 'Please fill all required fields');
          return;
        }
      }

      setLoading(true);
      const headers = getAuthHeader();

      if (userType === 'customer') {
        await axios.post(
          `${API_URL}/api/admin/users/customers`,
          {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password
          },
          { headers }
        );
      } else {
        await axios.post(
          `${API_URL}/api/admin/users/admins`,
          {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: formData.role
          },
          { headers }
        );
      }

      Alert.alert('Success', 'User created successfully');
      setCreateUserModalVisible(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async () => {
    try {
      if (!selectedUser || !formData.role) {
        Alert.alert('Error', 'Please select a role');
        return;
      }

      setLoading(true);
      const headers = getAuthHeader();

      await axios.put(
        `${API_URL}/api/admin/users/${selectedUser.id}/role`,
        { role: formData.role },
        { headers }
      );

      Alert.alert('Success', 'User role updated successfully');
      setEditUserModalVisible(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;

      setLoading(true);
      const headers = getAuthHeader();

      await axios.delete(
        `${API_URL}/api/admin/users/${selectedUser.id}`,
        { headers }
      );

      Alert.alert('Success', 'User deleted successfully');
      setDeleteUserModalVisible(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      username: '',
      role: 'customer'
    });
    setUserType('customer');
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      role: user.role || 'customer'
    });
    setEditUserModalVisible(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setDeleteUserModalVisible(true);
  };

  const openRolePicker = (context) => {
    setRolePickerContext(context);
    setRolePickerModalVisible(true);
  };

  const selectRole = (role) => {
    setFormData({...formData, role});
    setRolePickerModalVisible(false);
  };

  const getRoleInfo = (role) => {
    return ROLES.find(r => r.value === role) || ROLES[0];
  };

  const getFilteredUsers = () => {
    if (selectedTab === 'customers') return customers.map(c => ({ ...c, userType: 'customer' }));
    if (selectedTab === 'admins') return admins.map(a => ({ ...a, userType: 'admin' }));
    return users;
  };

  const getAvailableRoles = () => {
    return userType === 'admin' 
      ? ROLES.filter(role => role.value !== 'customer')
      : ROLES;
  };

  // Modern Role Picker Component
  const RolePicker = () => (
    <Modal
      visible={rolePickerModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setRolePickerModalVisible(false)}
    >
      <View style={styles.rolePickerOverlay}>
        <View style={styles.rolePickerContainer}>
          <View style={styles.rolePickerHeader}>
            <Text style={styles.rolePickerTitle}>
              {rolePickerContext === 'create' ? 'Select User Role' : 'Change User Role'}
            </Text>
            <TouchableOpacity 
              onPress={() => setRolePickerModalVisible(false)}
              style={styles.rolePickerCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={getAvailableRoles()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.roleOptionCard,
                  formData.role === item.value && styles.roleOptionCardSelected,
                  { borderLeftColor: item.color }
                ]}
                onPress={() => selectRole(item.value)}
              >
                <View style={styles.roleOptionContent}>
                  <View style={[styles.roleIconContainer, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleOptionTitle}>{item.label}</Text>
                    <Text style={styles.roleOptionDescription}>
                      {getRoleDescription(item.value)}
                    </Text>
                  </View>
                </View>
                {formData.role === item.value && (
                  <View style={[styles.roleSelectedIndicator, { backgroundColor: item.color }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.roleListContent}
          />
        </View>
      </View>
    </Modal>
  );

  const getRoleDescription = (role) => {
    const descriptions = {
      customer: 'Regular event attendee and ticket purchaser',
      admin: 'Administrative access to manage events and users',
      SUPER_ADMIN: 'Full system access and superuser privileges',
      EVENT_MANAGER: 'Manage events, tickets, and event operations',
      SUPPORT: 'Customer support and user assistance',
      SUPERHERO: 'Special privileges for platform heroes'
    };
    return descriptions[role] || 'User role';
  };

  const UserCard = ({ user }) => {
    const roleInfo = getRoleInfo(user.role);
    const isCustomer = user.userType === 'customer';
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userCardHeader}>
          <View style={[styles.userAvatar, { backgroundColor: roleInfo.color + '20' }]}>
            <Ionicons name={roleInfo.icon} size={24} color={roleInfo.color} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {isCustomer 
                ? `${user.first_name} ${user.last_name}`
                : user.username
              }
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
              <Text style={styles.roleBadgeText}>{roleInfo.label}</Text>
            </View>
          </View>
        </View>
        
        {isCustomer && user.phone_number && (
          <View style={styles.userDetail}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.userDetailText}>{user.phone_number}</Text>
          </View>
        )}
        
        <View style={styles.userDetail}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.userDetailText}>
            Joined {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(user)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit Role</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => openDeleteModal(user)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity 
          onPress={() => setCreateUserModalVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
            All ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'customers' && styles.activeTab]}
          onPress={() => setSelectedTab('customers')}
        >
          <Text style={[styles.tabText, selectedTab === 'customers' && styles.activeTabText]}>
            Customers ({customers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'admins' && styles.activeTab]}
          onPress={() => setSelectedTab('admins')}
        >
          <Text style={[styles.tabText, selectedTab === 'admins' && styles.activeTabText]}>
            Staff ({admins.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* User List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : getFilteredUsers().length > 0 ? (
          getFilteredUsers().map((user, index) => (
            <UserCard key={index} user={user} />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      {/* Create User Modal */}
      <Modal
        visible={createUserModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New User</Text>
            
            {/* User Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, userType === 'customer' && styles.activeTypeButton]}
                onPress={() => setUserType('customer')}
              >
                <Ionicons name="person" size={24} color={userType === 'customer' ? '#fff' : '#000'} />
                <Text style={[styles.typeButtonText, userType === 'customer' && styles.activeTypeButtonText]}>
                  Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, userType === 'admin' && styles.activeTypeButton]}
                onPress={() => setUserType('admin')}
              >
                <Ionicons name="shield" size={24} color={userType === 'admin' ? '#fff' : '#000'} />
                <Text style={[styles.typeButtonText, userType === 'admin' && styles.activeTypeButtonText]}>
                  Staff
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {userType === 'customer' ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name *"
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({...formData, firstName: text})}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name *"
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({...formData, lastName: text})}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email *"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password *"
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    secureTextEntry
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Username *"
                    value={formData.username}
                    onChangeText={(text) => setFormData({...formData, username: text})}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email *"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password *"
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    secureTextEntry
                  />
                  
                  <Text style={styles.label}>Role *</Text>
                  <TouchableOpacity 
                    style={styles.roleSelectorButton}
                    onPress={() => openRolePicker('create')}
                  >
                    <View style={styles.roleSelectorButtonContent}>
                      <View style={styles.roleSelectorLeft}>
                        <View style={[styles.roleIconSmall, { backgroundColor: getRoleInfo(formData.role).color + '20' }]}>
                          <Ionicons name={getRoleInfo(formData.role).icon} size={16} color={getRoleInfo(formData.role).color} />
                        </View>
                        <Text style={styles.roleSelectorText}>{getRoleInfo(formData.role).label}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setCreateUserModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleCreateUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Role Modal */}
      <Modal
        visible={editUserModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User Role</Text>
            
            {selectedUser && (
              <>
                <Text style={styles.modalSubtitle}>
                  {selectedUser.userType === 'customer' 
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : selectedUser.username
                  }
                </Text>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>

                <Text style={styles.label}>Select New Role</Text>
                <TouchableOpacity 
                  style={styles.roleSelectorButton}
                  onPress={() => openRolePicker('edit')}
                >
                  <View style={styles.roleSelectorButtonContent}>
                    <View style={styles.roleSelectorLeft}>
                      <View style={[styles.roleIconSmall, { backgroundColor: getRoleInfo(formData.role).color + '20' }]}>
                        <Ionicons name={getRoleInfo(formData.role).icon} size={16} color={getRoleInfo(formData.role).color} />
                      </View>
                      <Text style={styles.roleSelectorText}>{getRoleInfo(formData.role).label}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setEditUserModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleUpdateUserRole}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Update Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        visible={deleteUserModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={48} color="#FF4444" />
            </View>
            <Text style={styles.modalTitle}>Delete User</Text>
            {selectedUser && (
              <>
                <Text style={styles.modalMessage}>
                  Are you sure you want to delete this user?
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedUser.userType === 'customer' 
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : selectedUser.username
                  }
                </Text>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setDeleteUserModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonConfirm, styles.deleteConfirmButton]}
                onPress={handleDeleteUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern Role Picker Modal */}
      <RolePicker />
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 5,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  userActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    textAlign: 'center',
  },
  modalEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  activeTypeButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  formContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  roleSelectorButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  roleSelectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelectorText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  deleteConfirmButton: {
    backgroundColor: '#FF4444',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modern Role Picker Styles
  rolePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  rolePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  rolePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rolePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  rolePickerCloseButton: {
    padding: 4,
  },
  roleListContent: {
    padding: 20,
  },
  roleOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleOptionCardSelected: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
  },
  roleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  roleOptionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  roleSelectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default UserManagementScreen;